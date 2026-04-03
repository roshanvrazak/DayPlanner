import { z } from "zod";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const HHmm = z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format (e.g. 09:00)");

// Strip HTML tags from user-supplied free-text to prevent stored XSS
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();
const sanitizedString = (schema: z.ZodString) => schema.transform(stripHtml);

// ─── Task schemas ──────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  title: sanitizedString(z.string().min(1, "Title is required").max(200, "Title too long")),
  duration: z.coerce.number().int().positive("Duration must be positive").max(480, "Duration cannot exceed 8 hours (480 min)"),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  deadline: z.string().nullable().optional(),
  notes: sanitizedString(z.string().max(2000, "Notes too long")).nullable().optional(),
  subtasks: z.array(z.object({
    title: sanitizedString(z.string().min(1, "Subtask title required").max(200)),
  })).optional().default([]),
});

export const UpdateTaskSchema = z.object({
  title: sanitizedString(z.string().min(1).max(200)).optional(),
  duration: z.coerce.number().int().positive().max(480).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  deadline: z.string().nullable().optional(),
  notes: sanitizedString(z.string().max(2000)).nullable().optional(),
  status: z.enum(["BACKLOG", "SCHEDULED", "COMPLETED"]).optional(),
});

// ─── Settings schemas ──────────────────────────────────────────────────────────

export const UpdateSettingsSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)).optional(),
  dayStartTime: HHmm.optional(),
  dayEndTime: HHmm.optional(),
  strictMode: z.boolean().optional(),
}).refine((data) => {
  if (data.dayStartTime && data.dayEndTime) {
    return data.dayStartTime < data.dayEndTime;
  }
  return true;
}, { message: "Day start time must be before end time", path: ["dayEndTime"] });

// ─── RecurringTask schemas ─────────────────────────────────────────────────────

export const CreateRecurringTaskSchema = z.object({
  title: sanitizedString(z.string().min(1, "Title is required").max(200)),
  duration: z.coerce.number().int().positive().max(480),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  notes: sanitizedString(z.string().max(2000)).nullable().optional(),
  recurrenceType: z.enum(["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"]),
  recurrenceDays: z.string().nullable().optional(),
});

export const UpdateRecurringTaskSchema = z.object({
  isActive: z.boolean(),
});

// ─── RecurringBlock schemas ────────────────────────────────────────────────────

export const CreateRecurringBlockSchema = z.object({
  title: sanitizedString(z.string().min(1, "Title is required").max(200)),
  startTime: HHmm,
  endTime: HHmm,
  daysOfWeek: z.string().regex(/^[0-6](,[0-6])*$/, "Invalid days of week format"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: "Start time must be before end time",
  path: ["endTime"],
});

// ─── TimeBlock schemas ─────────────────────────────────────────────────────────

export const AssignTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  date: z.string().min(1, "Date is required"),
});

// ─── Subtask schemas ───────────────────────────────────────────────────────────

export const UpdateSubtaskSchema = z.object({
  completed: z.boolean().optional(),
  title: sanitizedString(z.string().min(1).max(200)).optional(),
}).refine((data) => data.completed !== undefined || data.title !== undefined, {
  message: "At least one field (completed or title) must be provided",
});

// ─── Override schemas ──────────────────────────────────────────────────────────

export const OverrideSchema = z.object({
  confirmationPhrase: z.string().min(1, "Confirmation phrase is required"),
});

// ─── Review schemas ────────────────────────────────────────────────────────────

export const ReviewUpdateSchema = z.object({
  updates: z.array(z.object({
    blockId: z.string().min(1),
    completed: z.boolean(),
  })).min(1, "At least one update is required"),
});

// ─── Helper: format Zod error for API response ────────────────────────────────

export function formatValidationError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
