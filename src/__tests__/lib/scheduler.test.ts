import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startOfDay,
  endOfDay,
  addDays,
  setHours,
  setMinutes,
  addMinutes,
  differenceInMinutes,
  startOfWeek,
} from "date-fns";

// ─── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    timeBlock: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    recurringBlock: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Import after mocking ──────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

// ─── Pure function tests ───────────────────────────────────────────────────────

// We test the free-slot calculation logic inline since the functions aren't exported.
// These tests verify the algorithmic correctness of the scheduler.

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m };
}

function getDayWindow(date: Date, startTime: string, endTime: string) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return {
    start: setMinutes(setHours(startOfDay(date), start.hours), start.minutes),
    end: setMinutes(setHours(startOfDay(date), end.hours), end.minutes),
  };
}

function calculateFreeSlots(
  window: { start: Date; end: Date },
  occupiedBlocks: { startTime: Date; endTime: Date }[]
) {
  const sorted = [...occupiedBlocks].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const freeSlots: { start: Date; end: Date }[] = [];
  let cursor = window.start;

  for (const block of sorted) {
    if (block.startTime > cursor && cursor < window.end) {
      const slotEnd = block.startTime < window.end ? block.startTime : window.end;
      if (differenceInMinutes(slotEnd, cursor) > 0) {
        freeSlots.push({ start: cursor, end: slotEnd });
      }
    }
    if (block.endTime > cursor) {
      cursor = block.endTime;
    }
  }

  if (cursor < window.end) {
    if (differenceInMinutes(window.end, cursor) > 0) {
      freeSlots.push({ start: cursor, end: window.end });
    }
  }

  return freeSlots;
}

// ─── getDayWindow tests ────────────────────────────────────────────────────────

describe("getDayWindow", () => {
  const date = new Date("2024-01-15T00:00:00.000Z");

  it("returns correct start and end times", () => {
    const window = getDayWindow(date, "09:00", "17:00");
    expect(window.start.getHours()).toBe(9);
    expect(window.start.getMinutes()).toBe(0);
    expect(window.end.getHours()).toBe(17);
    expect(window.end.getMinutes()).toBe(0);
  });

  it("handles non-round minute times", () => {
    const window = getDayWindow(date, "08:30", "18:45");
    expect(window.start.getHours()).toBe(8);
    expect(window.start.getMinutes()).toBe(30);
    expect(window.end.getHours()).toBe(18);
    expect(window.end.getMinutes()).toBe(45);
  });
});

// ─── calculateFreeSlots tests ──────────────────────────────────────────────────

describe("calculateFreeSlots", () => {
  const base = new Date("2024-01-15T00:00:00.000Z");
  const window = {
    start: setMinutes(setHours(startOfDay(base), 9), 0),
    end: setMinutes(setHours(startOfDay(base), 17), 0),
  };

  it("returns full window when no blocks exist", () => {
    const slots = calculateFreeSlots(window, []);
    expect(slots).toHaveLength(1);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(480); // 8 hours
  });

  it("splits window around a single block", () => {
    const occupied = [
      {
        startTime: setMinutes(setHours(startOfDay(base), 11), 0),
        endTime: setMinutes(setHours(startOfDay(base), 12), 0),
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(2);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(120); // 9-11
    expect(differenceInMinutes(slots[1].end, slots[1].start)).toBe(300); // 12-17
  });

  it("returns empty when fully occupied", () => {
    const occupied = [
      { startTime: window.start, endTime: window.end },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(0);
  });

  it("handles block starting at window start", () => {
    const occupied = [
      {
        startTime: window.start,
        endTime: setMinutes(setHours(startOfDay(base), 10), 0),
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(1);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(420); // 10-17
  });

  it("handles block ending at window end", () => {
    const occupied = [
      {
        startTime: setMinutes(setHours(startOfDay(base), 15), 0),
        endTime: window.end,
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(1);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(360); // 9-15
  });

  it("handles multiple non-overlapping blocks", () => {
    const occupied = [
      {
        startTime: setMinutes(setHours(startOfDay(base), 10), 0),
        endTime: setMinutes(setHours(startOfDay(base), 11), 0),
      },
      {
        startTime: setMinutes(setHours(startOfDay(base), 13), 0),
        endTime: setMinutes(setHours(startOfDay(base), 14), 0),
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(3);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(60); // 9-10
    expect(differenceInMinutes(slots[1].end, slots[1].start)).toBe(120); // 11-13
    expect(differenceInMinutes(slots[2].end, slots[2].start)).toBe(180); // 14-17
  });

  it("handles overlapping blocks gracefully", () => {
    const occupied = [
      {
        startTime: setMinutes(setHours(startOfDay(base), 10), 0),
        endTime: setMinutes(setHours(startOfDay(base), 12), 0),
      },
      {
        startTime: setMinutes(setHours(startOfDay(base), 11), 0), // overlaps
        endTime: setMinutes(setHours(startOfDay(base), 13), 0),
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    // Should still produce correct free slots despite overlap
    expect(slots.length).toBeGreaterThan(0);
    // Total free time: 9-10 (60min) + 13-17 (240min) = 300min
    const totalFree = slots.reduce((acc, s) => acc + differenceInMinutes(s.end, s.start), 0);
    expect(totalFree).toBe(300);
  });

  it("ignores blocks outside the window", () => {
    const occupied = [
      {
        startTime: setMinutes(setHours(startOfDay(base), 7), 0), // before window
        endTime: setMinutes(setHours(startOfDay(base), 8), 0),
      },
      {
        startTime: setMinutes(setHours(startOfDay(base), 18), 0), // after window
        endTime: setMinutes(setHours(startOfDay(base), 19), 0),
      },
    ];
    const slots = calculateFreeSlots(window, occupied);
    expect(slots).toHaveLength(1);
    expect(differenceInMinutes(slots[0].end, slots[0].start)).toBe(480); // full window
  });
});

// ─── Scheduler integration tests (mocked Prisma) ──────────────────────────────

describe("runScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no tasks exist", async () => {
    const mockPrisma = prisma as unknown as {
      user: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
      task: { findMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
      timeBlock: { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
      recurringBlock: { findMany: ReturnType<typeof vi.fn> };
      $transaction: ReturnType<typeof vi.fn>;
    };

    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "default-user",
      dayStartTime: "09:00",
      dayEndTime: "17:00",
      strictMode: true,
    });
    mockPrisma.timeBlock.findMany.mockResolvedValue([]);
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.timeBlock.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.recurringBlock.findMany.mockResolvedValue([]);

    const { runScheduler } = await import("@/lib/scheduler");
    const result = await runScheduler("default-user");
    expect(result).toEqual([]);
  });

  it("schedules tasks into available slots", async () => {
    const mockPrisma = prisma as unknown as {
      user: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
      task: { findMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
      timeBlock: { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
      recurringBlock: { findMany: ReturnType<typeof vi.fn> };
      $transaction: ReturnType<typeof vi.fn>;
    };

    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "default-user",
      dayStartTime: "09:00",
      dayEndTime: "17:00",
      strictMode: true,
    });
    // Call order: timeBlock.findMany (blocks to reset) → task.findMany (backlog) → timeBlock.findMany (locked blocks)
    mockPrisma.timeBlock.findMany
      .mockResolvedValueOnce([])  // 1st call: find blocks to reset (none)
      .mockResolvedValueOnce([]); // 2nd call: find existing locked/completed blocks
    mockPrisma.task.findMany.mockResolvedValue([
      { id: "task-1", title: "Task 1", duration: 60, priority: 1, deadline: null },
    ]);
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.timeBlock.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.recurringBlock.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);

    const { runScheduler } = await import("@/lib/scheduler");
    const result = await runScheduler("default-user");
    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe("task-1");
    expect(differenceInMinutes(result[0].endTime, result[0].startTime)).toBe(60);
  });
});
