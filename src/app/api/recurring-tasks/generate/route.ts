import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// POST /api/recurring-tasks/generate
// For each active recurring task, check if today matches its schedule.
// If no task instance has been generated yet today, create one in BACKLOG.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "default-user";

    const now = new Date();
    // 0=Monday … 6=Sunday (matching our app convention)
    const todayDow = (now.getDay() + 6) % 7;
    const todayNum = now.getDate();

    const recurringTasks = await prisma.recurringTask.findMany({
      where: { userId, isActive: true },
    });

    let generated = 0;

    for (const rt of recurringTasks) {
      // Check if today matches the recurrence
      let matches = false;

      if (rt.recurrenceType === "DAILY") {
        matches = true;
      } else if (rt.recurrenceType === "WEEKDAYS") {
        matches = todayDow >= 0 && todayDow <= 4; // Mon–Fri
      } else if (rt.recurrenceType === "WEEKLY") {
        const days = (rt.recurrenceDays || "").split(",").map(Number);
        matches = days.includes(todayDow);
      } else if (rt.recurrenceType === "MONTHLY") {
        // recurrenceDays stores the day-of-month (1–31)
        const dayOfMonth = parseInt(rt.recurrenceDays || "1", 10);
        matches = todayNum === dayOfMonth;
      }

      if (!matches) continue;

      // Check if we already generated an instance today
      const existing = await prisma.task.findFirst({
        where: {
          userId,
          recurringTaskId: rt.id,
          createdAt: {
            gte: startOfDay(now),
            lte: endOfDay(now),
          },
        },
      });

      if (existing) continue;

      // Create the task instance
      await prisma.task.create({
        data: {
          userId,
          title: rt.title,
          duration: rt.duration,
          priority: rt.priority,
          notes: rt.notes,
          status: "BACKLOG",
          recurringTaskId: rt.id,
        },
      });

      generated++;
    }

    return NextResponse.json({ generated });
  } catch (error) {
    console.error("RecurringTasks generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
