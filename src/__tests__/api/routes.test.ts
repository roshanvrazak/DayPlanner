import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    timeBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    subtask: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    recurringTask: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recurringBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as getTasks, POST as createTask } from "@/app/api/tasks/route";
import { PATCH as updateTask, DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { POST as overrideRoute } from "@/app/api/override/route";
import { POST as reviewUpdate, GET as reviewGet } from "@/app/api/review/route";
import { POST as rollover } from "@/app/api/rollover/route";
import { GET as getSettings, PATCH as updateSettings } from "@/app/api/settings/route";
import { PATCH as updateSubtask, DELETE as deleteSubtask } from "@/app/api/subtasks/[id]/route";
import { GET as getRecurring, POST as createRecurring } from "@/app/api/recurring-tasks/route";
import { DELETE as deleteRecurring } from "@/app/api/recurring-tasks/[id]/route";
import { GET as getRecurringBlocks, POST as createRecurringBlock } from "@/app/api/recurring-blocks/route";
import { DELETE as deleteRecurringBlock } from "@/app/api/recurring-blocks/[id]/route";

// ─── Request helper ────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>): Request {
  const base = "http://localhost/api/test";
  const url = searchParams
    ? `${base}?${new URLSearchParams(searchParams)}`
    : base;
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(() => vi.clearAllMocks());

// ─── Tasks ─────────────────────────────────────────────────────────────────────

describe("GET /api/tasks", () => {
  it("returns tasks array", async () => {
    db.task.findMany.mockResolvedValue([{ id: "t1", title: "Task 1" }]);
    const res = await getTasks(makeRequest("GET", undefined, { userId: "default-user" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("t1");
  });
});

describe("POST /api/tasks", () => {
  it("returns 422 when title is empty", async () => {
    const res = await createTask(makeRequest("POST", { title: "", duration: 60 }));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 422 when duration is negative", async () => {
    const res = await createTask(makeRequest("POST", { title: "Task", duration: -5 }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when duration exceeds 480", async () => {
    const res = await createTask(makeRequest("POST", { title: "Task", duration: 600 }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when priority is out of range", async () => {
    const res = await createTask(makeRequest("POST", { title: "Task", duration: 60, priority: 5 }));
    expect(res.status).toBe(422);
  });

  it("creates task with valid data", async () => {
    const mockTask = { id: "t1", title: "Test Task", duration: 60, priority: 2, status: "BACKLOG", subtasks: [] };
    db.task.create.mockResolvedValue(mockTask);
    const res = await createTask(makeRequest("POST", { title: "Test Task", duration: 60 }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("t1");
    expect(data.title).toBe("Test Task");
  });

  it("defaults priority to 2 when not provided", async () => {
    const mockTask = { id: "t1", title: "Task", duration: 30, priority: 2, status: "BACKLOG", subtasks: [] };
    db.task.create.mockResolvedValue(mockTask);
    await createTask(makeRequest("POST", { title: "Task", duration: 30 }));
    expect(db.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 2 }) })
    );
  });
});

describe("PATCH /api/tasks/[id]", () => {
  it("returns 422 for invalid status value", async () => {
    const res = await updateTask(makeRequest("PATCH", { status: "INVALID" }), makeParams("t1"));
    expect(res.status).toBe(422);
  });

  it("returns 422 for empty title", async () => {
    const res = await updateTask(makeRequest("PATCH", { title: "" }), makeParams("t1"));
    expect(res.status).toBe(422);
  });

  it("updates task successfully", async () => {
    const mockTask = { id: "t1", title: "Updated", status: "COMPLETED", subtasks: [] };
    db.task.update.mockResolvedValue(mockTask);
    const res = await updateTask(makeRequest("PATCH", { title: "Updated" }), makeParams("t1"));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("deletes task and returns success", async () => {
    db.task.delete.mockResolvedValue({ id: "t1" });
    const res = await deleteTask(makeRequest("DELETE"), makeParams("t1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─── Subtasks ──────────────────────────────────────────────────────────────────

describe("PATCH /api/subtasks/[id]", () => {
  it("returns 422 when no fields provided", async () => {
    const res = await updateSubtask(makeRequest("PATCH", {}), makeParams("s1"));
    expect(res.status).toBe(422);
  });

  it("updates completed status", async () => {
    db.subtask.update.mockResolvedValue({ id: "s1", completed: true });
    const res = await updateSubtask(makeRequest("PATCH", { completed: true }), makeParams("s1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.completed).toBe(true);
  });

  it("returns 422 for empty title", async () => {
    const res = await updateSubtask(makeRequest("PATCH", { title: "" }), makeParams("s1"));
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/subtasks/[id]", () => {
  it("deletes subtask and returns success", async () => {
    db.subtask.delete.mockResolvedValue({ id: "s1" });
    const res = await deleteSubtask(makeRequest("DELETE"), makeParams("s1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─── Override ──────────────────────────────────────────────────────────────────

describe("POST /api/override", () => {
  it("returns 400 for incorrect phrase", async () => {
    const res = await overrideRoute(makeRequest("POST", { confirmationPhrase: "WRONG PHRASE" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/incorrect/i);
  });

  it("returns 422 when phrase is missing", async () => {
    const res = await overrideRoute(makeRequest("POST", {}));
    expect(res.status).toBe(422);
  });

  it("unlocks blocks with correct phrase", async () => {
    db.timeBlock.updateMany.mockResolvedValue({ count: 3 });
    const res = await overrideRoute(makeRequest("POST", { confirmationPhrase: "BREAK MY STREAK" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.unlockedCount).toBe(3);
  });
});

// ─── Review ────────────────────────────────────────────────────────────────────

describe("GET /api/review", () => {
  it("returns today's blocks", async () => {
    const mockBlocks = [
      { id: "b1", startTime: new Date(), endTime: new Date(), completed: false, task: { title: "Task A", priority: 1 } },
    ];
    db.timeBlock.findMany.mockResolvedValue(mockBlocks);
    const res = await reviewGet(makeRequest("GET", undefined, { userId: "default-user" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/review", () => {
  it("returns 422 for empty updates array", async () => {
    const res = await reviewUpdate(makeRequest("POST", { updates: [] }));
    expect(res.status).toBe(422);
  });

  it("saves review updates", async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await reviewUpdate(makeRequest("POST", {
      updates: [{ blockId: "b1", completed: true }],
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─── Rollover ──────────────────────────────────────────────────────────────────

describe("POST /api/rollover", () => {
  it("returns rolledOver: 0 when no stale blocks", async () => {
    db.timeBlock.findMany.mockResolvedValue([]);
    const res = await rollover(makeRequest("POST", {}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rolledOver).toBe(0);
  });

  it("resets stale tasks and deletes their blocks", async () => {
    db.timeBlock.findMany.mockResolvedValue([
      { id: "b1", taskId: "t1" },
      { id: "b2", taskId: "t1" },
    ]);
    db.task.updateMany.mockResolvedValue({ count: 1 });
    db.timeBlock.deleteMany.mockResolvedValue({ count: 2 });
    const res = await rollover(makeRequest("POST", {}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rolledOver).toBe(1);
    expect(db.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "BACKLOG" } })
    );
  });
});

// ─── Settings ──────────────────────────────────────────────────────────────────

describe("GET /api/settings", () => {
  it("returns user settings", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({
      name: "Test User", dayStartTime: "09:00", dayEndTime: "17:00", strictMode: true,
    });
    const res = await getSettings(makeRequest("GET", undefined, { userId: "default-user" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dayStartTime).toBe("09:00");
    expect(data.strictMode).toBe(true);
  });
});

describe("PATCH /api/settings", () => {
  it("returns 422 for invalid HH:mm format", async () => {
    const res = await updateSettings(makeRequest("PATCH", { dayStartTime: "9:00" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when start time after end time", async () => {
    const res = await updateSettings(makeRequest("PATCH", {
      dayStartTime: "17:00",
      dayEndTime: "09:00",
    }));
    expect(res.status).toBe(422);
  });

  it("updates settings successfully", async () => {
    db.user.update.mockResolvedValue({
      name: "User", dayStartTime: "08:00", dayEndTime: "18:00", strictMode: false,
    });
    const res = await updateSettings(makeRequest("PATCH", {
      dayStartTime: "08:00", dayEndTime: "18:00",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dayStartTime).toBe("08:00");
  });
});

// ─── Recurring Tasks ───────────────────────────────────────────────────────────

describe("GET /api/recurring-tasks", () => {
  it("returns active recurring tasks", async () => {
    db.recurringTask.findMany.mockResolvedValue([{ id: "rt1", title: "Daily standup", isActive: true }]);
    const res = await getRecurring(makeRequest("GET", undefined, { userId: "default-user" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/recurring-tasks", () => {
  it("returns 422 for missing title", async () => {
    const res = await createRecurring(makeRequest("POST", { duration: 30, recurrenceType: "DAILY" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid recurrenceType", async () => {
    const res = await createRecurring(makeRequest("POST", {
      title: "Task", duration: 30, recurrenceType: "HOURLY",
    }));
    expect(res.status).toBe(422);
  });

  it("creates recurring task with valid data", async () => {
    const mockTask = { id: "rt1", title: "Standup", duration: 30, recurrenceType: "DAILY" };
    db.recurringTask.create.mockResolvedValue(mockTask);
    const res = await createRecurring(makeRequest("POST", {
      title: "Standup", duration: 30, recurrenceType: "DAILY",
    }));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/recurring-tasks/[id]", () => {
  it("deletes recurring task", async () => {
    db.recurringTask.delete.mockResolvedValue({ id: "rt1" });
    const res = await deleteRecurring(makeRequest("DELETE"), makeParams("rt1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ─── Recurring Blocks ──────────────────────────────────────────────────────────

describe("GET /api/recurring-blocks", () => {
  it("returns recurring blocks", async () => {
    db.recurringBlock.findMany.mockResolvedValue([]);
    const res = await getRecurringBlocks(makeRequest("GET", undefined, { userId: "default-user" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("POST /api/recurring-blocks", () => {
  it("returns 422 for invalid time format", async () => {
    const res = await createRecurringBlock(makeRequest("POST", {
      title: "Lunch", startTime: "12:00", endTime: "bad", daysOfWeek: "0,1,2",
    }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when start after end", async () => {
    const res = await createRecurringBlock(makeRequest("POST", {
      title: "Lunch", startTime: "14:00", endTime: "12:00", daysOfWeek: "0,1",
    }));
    expect(res.status).toBe(422);
  });

  it("creates recurring block with valid data", async () => {
    const mockBlock = { id: "rb1", title: "Lunch", startTime: "12:00", endTime: "13:00" };
    db.recurringBlock.create.mockResolvedValue(mockBlock);
    const res = await createRecurringBlock(makeRequest("POST", {
      title: "Lunch", startTime: "12:00", endTime: "13:00", daysOfWeek: "0,1,2,3,4",
    }));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/recurring-blocks/[id]", () => {
  it("deletes recurring block", async () => {
    db.recurringBlock.delete.mockResolvedValue({ id: "rb1" });
    const res = await deleteRecurringBlock(makeRequest("DELETE"), makeParams("rb1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
