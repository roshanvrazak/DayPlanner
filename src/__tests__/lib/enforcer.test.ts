import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startOfDay,
  endOfDay,
  subDays,
  setHours,
  setMinutes,
} from "date-fns";

// ─── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    timeBlock: {
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

// Helper to get typed mock
function getMockPrisma() {
  return prisma as unknown as {
    user: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    timeBlock: {
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };
}

// ─── lockTodayBlocks tests ─────────────────────────────────────────────────────

describe("lockTodayBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when strictMode is disabled", async () => {
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: false,
      dayStartTime: "09:00",
    });

    const { lockTodayBlocks } = await import("@/lib/enforcer");
    const count = await lockTodayBlocks("user-1");
    expect(count).toBe(0);
    expect(getMockPrisma().timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("returns 0 when current time is before dayStartTime", async () => {
    // Set time to 8:00 AM
    vi.setSystemTime(new Date("2024-01-15T08:00:00.000"));
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: true,
      dayStartTime: "09:00",
    });

    const { lockTodayBlocks } = await import("@/lib/enforcer");
    const count = await lockTodayBlocks("user-1");
    expect(count).toBe(0);
    expect(getMockPrisma().timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("locks blocks when current time is after dayStartTime and strictMode is on", async () => {
    // Set time to 10:00 AM
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000"));
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: true,
      dayStartTime: "09:00",
    });
    getMockPrisma().timeBlock.updateMany.mockResolvedValue({ count: 3 });

    const { lockTodayBlocks } = await import("@/lib/enforcer");
    const count = await lockTodayBlocks("user-1");
    expect(count).toBe(3);
    expect(getMockPrisma().timeBlock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isLocked: true },
      })
    );
  });
});

// ─── isTodayLocked tests ───────────────────────────────────────────────────────

describe("isTodayLocked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when strictMode is disabled", async () => {
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: false,
      dayStartTime: "09:00",
    });

    const { isTodayLocked } = await import("@/lib/enforcer");
    expect(await isTodayLocked("user-1")).toBe(false);
  });

  it("returns false before dayStartTime", async () => {
    vi.setSystemTime(new Date("2024-01-15T08:30:00.000"));
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: true,
      dayStartTime: "09:00",
    });

    const { isTodayLocked } = await import("@/lib/enforcer");
    expect(await isTodayLocked("user-1")).toBe(false);
  });

  it("returns true after dayStartTime with strictMode on", async () => {
    vi.setSystemTime(new Date("2024-01-15T09:30:00.000"));
    getMockPrisma().user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      strictMode: true,
      dayStartTime: "09:00",
    });

    const { isTodayLocked } = await import("@/lib/enforcer");
    expect(await isTodayLocked("user-1")).toBe(true);
  });
});

// ─── calculateStreak tests ─────────────────────────────────────────────────────

describe("calculateStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when no blocks exist", async () => {
    getMockPrisma().timeBlock.count.mockResolvedValue(0);

    const { calculateStreak } = await import("@/lib/enforcer");
    const streak = await calculateStreak("user-1");
    // When all days have 0 blocks, the loop skips them but hits the 365 cap,
    // returning the accumulated streak (0 in this case)
    expect(streak).toBe(0);
  });

  it("returns 1 for a single completed day", async () => {
    getMockPrisma().timeBlock.count
      .mockResolvedValueOnce(3)  // yesterday: total blocks
      .mockResolvedValueOnce(3); // yesterday: completed blocks

    const { calculateStreak } = await import("@/lib/enforcer");
    const streak = await calculateStreak("user-1");
    expect(streak).toBe(1);
  });

  it("breaks streak on a day with incomplete blocks", async () => {
    getMockPrisma().timeBlock.count
      .mockResolvedValueOnce(3)  // yesterday: total = 3
      .mockResolvedValueOnce(2); // yesterday: completed = 2 (not all done)

    const { calculateStreak } = await import("@/lib/enforcer");
    const streak = await calculateStreak("user-1");
    expect(streak).toBe(0);
  });

  it("skips days with no blocks (rest days) and continues counting", async () => {
    getMockPrisma().timeBlock.count
      .mockResolvedValueOnce(0)  // yesterday: no blocks (rest day, skipped)
      .mockResolvedValueOnce(2)  // 2 days ago: total = 2
      .mockResolvedValueOnce(2)  // 2 days ago: completed = 2 (full streak day)
      .mockResolvedValueOnce(0); // 3 days ago: no blocks again (break condition by cap)

    const { calculateStreak } = await import("@/lib/enforcer");
    const streak = await calculateStreak("user-1");
    // Yesterday was a rest day (skipped), 2 days ago was complete -> streak = 1
    expect(streak).toBe(1);
  });
});
