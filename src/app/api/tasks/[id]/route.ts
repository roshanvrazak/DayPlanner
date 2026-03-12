import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.duration !== undefined && { duration: parseInt(body.duration) }),
        ...(body.priority !== undefined && { priority: parseInt(body.priority) }),
        ...(body.deadline !== undefined && {
          deadline: body.deadline ? new Date(body.deadline) : null,
        }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
