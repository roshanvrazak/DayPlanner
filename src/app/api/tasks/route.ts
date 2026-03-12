import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all tasks for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";
    const status = searchParams.get("status");

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status ? { status: status as "BACKLOG" | "SCHEDULED" | "COMPLETED" } : {}),
      },
      include: {
        timeBlocks: true,
      },
      orderBy: [
        { deadline: { sort: "asc", nulls: "last" } },
        { priority: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST create a new task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, duration, priority, deadline, userId } = body;

    const task = await prisma.task.create({
      data: {
        title,
        duration: parseInt(duration),
        priority: parseInt(priority) || 2,
        deadline: deadline ? new Date(deadline) : null,
        userId: userId || "default-user",
        status: "BACKLOG",
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
