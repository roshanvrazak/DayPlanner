import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  addMinutes,
  addDays,
  setHours,
  setMinutes,
  isAfter,
  isBefore,
  differenceInMinutes,
  startOfWeek,
} from "date-fns";

const BUFFER_MINUTES = 10;

interface TimeSlot {
  start: Date;
  end: Date;
}

interface GeneratedBlock {
  taskId: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Parse an "HH:mm" string into hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Get the schedulable window for a given date based on user settings.
 */
function getDayWindow(date: Date, startTime: string, endTime: string): TimeSlot {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return {
    start: setMinutes(setHours(startOfDay(date), start.hours), start.minutes),
    end: setMinutes(setHours(startOfDay(date), end.hours), end.minutes),
  };
}

/**
 * Subtract occupied blocks from a time window to produce free slots.
 */
function calculateFreeSlots(
  window: TimeSlot,
  occupiedBlocks: { startTime: Date; endTime: Date }[]
): TimeSlot[] {
  const sorted = [...occupiedBlocks].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const freeSlots: TimeSlot[] = [];
  let cursor = window.start;

  for (const block of sorted) {
    if (isAfter(block.startTime, cursor) && isBefore(cursor, window.end)) {
      const slotEnd = isBefore(block.startTime, window.end)
        ? block.startTime
        : window.end;
      if (differenceInMinutes(slotEnd, cursor) > 0) {
        freeSlots.push({ start: cursor, end: slotEnd });
      }
    }
    if (isAfter(block.endTime, cursor)) {
      cursor = block.endTime;
    }
  }

  // Remaining time after last block
  if (isBefore(cursor, window.end)) {
    if (differenceInMinutes(window.end, cursor) > 0) {
      freeSlots.push({ start: cursor, end: window.end });
    }
  }

  return freeSlots;
}

/**
 * Main scheduling algorithm.
 * 1. Fetch backlog tasks sorted by deadline (ASC) then priority (DESC).
 * 2. Build free time slots for each day of the week.
 * 3. Fit tasks into slots, splitting if necessary.
 * 4. Add 10-minute buffers between blocks.
 */
export async function runScheduler(userId: string): Promise<GeneratedBlock[]> {
  // Fetch user settings
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Reset SCHEDULED tasks (whose blocks aren't locked/completed) back to BACKLOG
  // so they get re-scheduled on each "Plan My Week" run
  const blocksToDelete = await prisma.timeBlock.findMany({
    where: { task: { userId }, isLocked: false, completed: false },
    select: { taskId: true },
  });
  const taskIdsToReset = [...new Set(blocksToDelete.map((b) => b.taskId))];
  if (taskIdsToReset.length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: taskIdsToReset }, status: "SCHEDULED" },
      data: { status: "BACKLOG" },
    });
  }

  // Delete any existing non-locked, non-completed scheduled blocks for this user
  await prisma.timeBlock.deleteMany({
    where: {
      task: { userId },
      isLocked: false,
      completed: false,
    },
  });

  // Fetch all backlog tasks (including ones just reset above)
  const tasks = await prisma.task.findMany({
    where: { userId, status: "BACKLOG" },
    orderBy: [
      { deadline: { sort: "asc", nulls: "last" } },
      { priority: "asc" }, // 1 = highest priority first
    ],
  });

  if (tasks.length === 0) return [];

  // Build schedulable inventory for the next 7 days
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Get existing locked blocks
  const existingBlocks = await prisma.timeBlock.findMany({
    where: {
      task: { userId },
      OR: [{ isLocked: true }, { completed: true }],
      startTime: { gte: startOfDay(days[0]) },
      endTime: { lte: endOfDay(days[6]) },
    },
    select: { startTime: true, endTime: true },
  });

  // Fetch recurring blocks to treat as occupied time
  const recurringBlocks = await prisma.recurringBlock.findMany({
    where: { userId },
  });

  // Build per-day free slots
  const allFreeSlots: TimeSlot[] = [];
  for (const day of days) {
    const window = getDayWindow(day, user.dayStartTime, user.dayEndTime);
    // dayOfWeek: 0=Monday matching weekStartsOn:1
    const dayOfWeek = (day.getDay() + 6) % 7;

    // Convert recurring blocks for this day into occupied slots
    const recurringOccupied = recurringBlocks
      .filter((rb) => rb.daysOfWeek.split(",").map(Number).includes(dayOfWeek))
      .map((rb) => {
        const rbStart = parseTime(rb.startTime);
        const rbEnd = parseTime(rb.endTime);
        return {
          startTime: setMinutes(setHours(startOfDay(day), rbStart.hours), rbStart.minutes),
          endTime: setMinutes(setHours(startOfDay(day), rbEnd.hours), rbEnd.minutes),
        };
      });

    const dayBlocks = existingBlocks.filter(
      (b) =>
        b.startTime >= startOfDay(day) && b.startTime < endOfDay(day)
    );
    const allOccupied = [...dayBlocks, ...recurringOccupied];
    const freeSlots = calculateFreeSlots(window, allOccupied);
    allFreeSlots.push(...freeSlots);
  }

  // Schedule tasks into free slots
  const generatedBlocks: GeneratedBlock[] = [];
  let slotIndex = 0;
  let slotCursor: Date | null = null;

  for (const task of tasks) {
    let remainingMinutes = task.duration;

    while (remainingMinutes > 0 && slotIndex < allFreeSlots.length) {
      const slot = allFreeSlots[slotIndex];
      const start: Date = slotCursor ?? slot.start;
      const availableMinutes = differenceInMinutes(slot.end, start);

      if (availableMinutes <= 0) {
        slotIndex++;
        slotCursor = null;
        continue;
      }

      const blockMinutes = Math.min(remainingMinutes, availableMinutes);
      const blockEnd = addMinutes(start, blockMinutes);

      generatedBlocks.push({
        taskId: task.id,
        startTime: start,
        endTime: blockEnd,
      });

      remainingMinutes -= blockMinutes;

      // Add buffer after this block
      const afterBuffer = addMinutes(blockEnd, BUFFER_MINUTES);
      if (isBefore(afterBuffer, slot.end)) {
        slotCursor = afterBuffer;
      } else {
        slotIndex++;
        slotCursor = null;
      }
    }
  }

  // Save generated blocks to database
  if (generatedBlocks.length > 0) {
    await prisma.timeBlock.createMany({
      data: generatedBlocks.map((b) => ({
        taskId: b.taskId,
        startTime: b.startTime,
        endTime: b.endTime,
        isLocked: false,
        completed: false,
      })),
    });

    // Update task statuses to SCHEDULED
    const scheduledTaskIds = [...new Set(generatedBlocks.map((b) => b.taskId))];
    await prisma.task.updateMany({
      where: { id: { in: scheduledTaskIds } },
      data: { status: "SCHEDULED" },
    });
  }

  return generatedBlocks;
}
