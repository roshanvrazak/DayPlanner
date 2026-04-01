import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTaskSchema, formatValidationError } from "@/lib/validations";
import { auth } from "@/auth";

// GET all tasks for a user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status ? { status: status as "BACKLOG" | "SCHEDULED" | "COMPLETED" } : {}),
      },
      include: {
        timeBlocks: true,
        subtasks: { orderBy: { order: "asc" } },
      },
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { priority: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST create a new task
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { title, duration, priority, deadline, notes, subtasks } = parsed.data;

    const task = await prisma.task.create({
      data: {
        title,
        duration,
        priority,
        deadline: deadline ? new Date(deadline) : null,
        notes: notes ?? null,
        userId,
        status: "BACKLOG",
        ...(subtasks.length > 0 && {
          subtasks: {
            create: subtasks.map((s, i) => ({
              title: s.title,
              order: i,
            })),
          },
        }),
      },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
