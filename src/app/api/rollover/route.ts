import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";

// POST /api/rollover
// Finds incomplete time blocks from yesterday, resets those tasks to BACKLOG,
// and deletes the stale blocks so they get rescheduled on next "Plan My Week".
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    // Find incomplete, non-locked blocks from yesterday
    const staleBlocks = await prisma.timeBlock.findMany({
      where: {
        task: { userId },
        completed: false,
        isLocked: false,
        startTime: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { id: true, taskId: true },
    });

    if (staleBlocks.length === 0) {
      return NextResponse.json({ rolledOver: 0 });
    }

    const taskIds = [...new Set(staleBlocks.map((b) => b.taskId))];
    const blockIds = staleBlocks.map((b) => b.id);

    // Reset tasks to BACKLOG (ensure they belong to user)
    await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      data: { status: "BACKLOG" },
    });

    // Delete the stale blocks (ensure they belong to user)
    await prisma.timeBlock.deleteMany({
      where: {
        id: { in: blockIds },
        task: { userId },
      },
    });

    return NextResponse.json({ rolledOver: taskIds.length });
  } catch (error) {
    console.error("Rollover error:", error);
    return NextResponse.json({ error: "Rollover failed" }, { status: 500 });
  }
}
