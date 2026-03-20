import { describe, it, expect } from "vitest";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateSettingsSchema,
  CreateRecurringTaskSchema,
  CreateRecurringBlockSchema,
  AssignTaskSchema,
  UpdateSubtaskSchema,
  OverrideSchema,
  ReviewUpdateSchema,
} from "@/lib/validations";

// ─── CreateTaskSchema ──────────────────────────────────────────────────────────

describe("CreateTaskSchema", () => {
  it("accepts valid task", () => {
    const result = CreateTaskSchema.safeParse({
      title: "Write report",
      duration: 60,
      priority: 1,
      deadline: "2024-12-31",
      notes: "Important",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateTaskSchema.safeParse({ title: "", duration: 60 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/required/i);
  });

  it("rejects negative duration", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects duration over 480 minutes", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects priority out of range", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: 30, priority: 5 });
    expect(result.success).toBe(false);
  });

  it("defaults priority to 2 when not provided", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: 30 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe(2);
  });

  it("defaults subtasks to empty array", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: 30 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.subtasks).toEqual([]);
  });

  it("rejects subtask with empty title", () => {
    const result = CreateTaskSchema.safeParse({
      title: "Task",
      duration: 30,
      subtasks: [{ title: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("coerces string duration to number", () => {
    const result = CreateTaskSchema.safeParse({ title: "Task", duration: "60" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.duration).toBe(60);
  });
});

// ─── UpdateTaskSchema ──────────────────────────────────────────────────────────

describe("UpdateTaskSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateTaskSchema.safeParse({ title: "Updated title" });
    expect(result.success).toBe(true);
  });

  it("accepts status change to COMPLETED", () => {
    const result = UpdateTaskSchema.safeParse({ status: "COMPLETED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = UpdateTaskSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("accepts nullable deadline", () => {
    const result = UpdateTaskSchema.safeParse({ deadline: null });
    expect(result.success).toBe(true);
  });
});

// ─── UpdateSettingsSchema ──────────────────────────────────────────────────────

describe("UpdateSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = UpdateSettingsSchema.safeParse({
      dayStartTime: "09:00",
      dayEndTime: "17:00",
      strictMode: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid HH:mm format", () => {
    const result = UpdateSettingsSchema.safeParse({ dayStartTime: "9:00" });
    expect(result.success).toBe(false);
  });

  it("rejects start time after end time", () => {
    const result = UpdateSettingsSchema.safeParse({
      dayStartTime: "17:00",
      dayEndTime: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("allows partial update (only one time)", () => {
    const result = UpdateSettingsSchema.safeParse({ dayStartTime: "08:00" });
    expect(result.success).toBe(true);
  });
});

// ─── CreateRecurringTaskSchema ─────────────────────────────────────────────────

describe("CreateRecurringTaskSchema", () => {
  it("accepts valid recurring task", () => {
    const result = CreateRecurringTaskSchema.safeParse({
      title: "Daily standup",
      duration: 30,
      recurrenceType: "DAILY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid recurrenceType", () => {
    const result = CreateRecurringTaskSchema.safeParse({
      title: "Task",
      duration: 30,
      recurrenceType: "HOURLY",
    });
    expect(result.success).toBe(false);
  });

  it("accepts WEEKLY type with recurrenceDays", () => {
    const result = CreateRecurringTaskSchema.safeParse({
      title: "Weekly review",
      duration: 60,
      recurrenceType: "WEEKLY",
      recurrenceDays: "0,4", // Mon, Fri
    });
    expect(result.success).toBe(true);
  });
});

// ─── CreateRecurringBlockSchema ────────────────────────────────────────────────

describe("CreateRecurringBlockSchema", () => {
  it("accepts valid recurring block", () => {
    const result = CreateRecurringBlockSchema.safeParse({
      title: "Lunch",
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: "0,1,2,3,4",
    });
    expect(result.success).toBe(true);
  });

  it("rejects start time after end time", () => {
    const result = CreateRecurringBlockSchema.safeParse({
      title: "Lunch",
      startTime: "13:00",
      endTime: "12:00",
      daysOfWeek: "0,1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid daysOfWeek format", () => {
    const result = CreateRecurringBlockSchema.safeParse({
      title: "Lunch",
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: "1,2,7", // 7 is invalid (0-6 only)
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color", () => {
    const result = CreateRecurringBlockSchema.safeParse({
      title: "Lunch",
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: "0,1",
      color: "red", // not a hex
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid hex color", () => {
    const result = CreateRecurringBlockSchema.safeParse({
      title: "Lunch",
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: "0,1",
      color: "#FF5733",
    });
    expect(result.success).toBe(true);
  });
});

// ─── AssignTaskSchema ──────────────────────────────────────────────────────────

describe("AssignTaskSchema", () => {
  it("accepts valid assignment", () => {
    const result = AssignTaskSchema.safeParse({
      taskId: "clxyz123",
      date: "2024-01-15T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing taskId", () => {
    const result = AssignTaskSchema.safeParse({ date: "2024-01-15T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateSubtaskSchema ───────────────────────────────────────────────────────

describe("UpdateSubtaskSchema", () => {
  it("accepts completed update", () => {
    const result = UpdateSubtaskSchema.safeParse({ completed: true });
    expect(result.success).toBe(true);
  });

  it("accepts title update", () => {
    const result = UpdateSubtaskSchema.safeParse({ title: "Updated subtask" });
    expect(result.success).toBe(true);
  });

  it("rejects empty object (no fields provided)", () => {
    const result = UpdateSubtaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = UpdateSubtaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});

// ─── OverrideSchema ────────────────────────────────────────────────────────────

describe("OverrideSchema", () => {
  it("accepts valid override request", () => {
    const result = OverrideSchema.safeParse({ confirmationPhrase: "BREAK MY STREAK" });
    expect(result.success).toBe(true);
  });

  it("rejects missing phrase", () => {
    const result = OverrideSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── ReviewUpdateSchema ────────────────────────────────────────────────────────

describe("ReviewUpdateSchema", () => {
  it("accepts valid review updates", () => {
    const result = ReviewUpdateSchema.safeParse({
      updates: [{ blockId: "block-1", completed: true }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty updates array", () => {
    const result = ReviewUpdateSchema.safeParse({ updates: [] });
    expect(result.success).toBe(false);
  });

  it("rejects update missing completed field", () => {
    const result = ReviewUpdateSchema.safeParse({
      updates: [{ blockId: "block-1" }],
    });
    expect(result.success).toBe(false);
  });
});
