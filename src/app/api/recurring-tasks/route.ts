import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateRecurringTaskSchema, formatValidationError } from "@/lib/validations";

// GET /api/recurring-tasks
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const tasks = await prisma.recurringTask.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("RecurringTasks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring tasks" }, { status: 500 });
  }
}

// POST /api/recurring-tasks
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json();

    const parsed = CreateRecurringTaskSchema.safeParse({ ...body, userId });
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { title, duration, priority, notes, recurrenceType, recurrenceDays } = parsed.data;

    const task = await prisma.recurringTask.create({
      data: {
        title,
        duration,
        priority,
        notes: notes ?? null,
        recurrenceType,
        recurrenceDays: recurrenceDays ?? null,
        userId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("RecurringTasks POST error:", error);
    return NextResponse.json({ error: "Failed to create recurring task" }, { status: 500 });
  }
}
