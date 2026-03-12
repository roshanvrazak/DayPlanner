import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  subDays,
  setHours,
  setMinutes,
  isAfter,
  format,
} from "date-fns";

/**
 * Lock today's time blocks if current time is past user's day start time.
 * Returns the number of blocks locked.
 */
export async function lockTodayBlocks(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.strictMode) return 0;

  const now = new Date();
  const [startH, startM] = user.dayStartTime.split(":").map(Number);
  const dayStart = setMinutes(setHours(startOfDay(now), startH), startM);

  if (!isAfter(now, dayStart)) return 0;

  const result = await prisma.timeBlock.updateMany({
    where: {
      task: { userId },
      startTime: { gte: startOfDay(now) },
      endTime: { lte: endOfDay(now) },
      isLocked: false,
    },
    data: { isLocked: true },
  });

  return result.count;
}

/**
 * Calculate the user's streak: how many consecutive days
 * they completed ALL scheduled blocks (going backward from yesterday).
 */
export async function calculateStreak(userId: string): Promise<number> {
  let streak = 0;
  let checkDate = subDays(new Date(), 1); // Start from yesterday

  for (let i = 0; i < 365; i++) {
    const dayStart = startOfDay(checkDate);
    const dayEnd = endOfDay(checkDate);

    // Get all blocks scheduled for this day
    const totalBlocks = await prisma.timeBlock.count({
      where: {
        task: { userId },
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
      },
    });

    // No blocks scheduled = skip (not a break)
    if (totalBlocks === 0) {
      checkDate = subDays(checkDate, 1);
      continue;
    }

    // Count completed blocks
    const completedBlocks = await prisma.timeBlock.count({
      where: {
        task: { userId },
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
        completed: true,
      },
    });

    if (completedBlocks === totalBlocks) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break; // Streak is broken
    }
  }

  return streak;
}

/**
 * Check if today's blocks are locked for a user.
 */
export async function isTodayLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.strictMode) return false;

  const now = new Date();
  const [startH, startM] = user.dayStartTime.split(":").map(Number);
  const dayStart = setMinutes(setHours(startOfDay(now), startH), startM);

  return isAfter(now, dayStart);
}
