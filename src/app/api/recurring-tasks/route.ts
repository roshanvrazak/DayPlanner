import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/recurring-tasks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

    const tasks = await prisma.recurringTask.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("RecurringTasks GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/recurring-tasks
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, duration, priority, notes, recurrenceType, recurrenceDays, userId } = body;

    const task = await prisma.recurringTask.create({
      data: {
        title,
        duration: parseInt(duration),
        priority: parseInt(priority) || 2,
        notes: notes || null,
        recurrenceType,
        recurrenceDays: recurrenceDays || null,
        userId: userId || "default-user",
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("RecurringTasks POST error:", error);
    return NextResponse.json({ error: "Failed to create recurring task" }, { status: 500 });
  }
}
