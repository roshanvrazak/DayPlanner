import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH mark a timeblock as completed
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // Check if block exists and user owns the task
    const timeBlockExists = await prisma.timeBlock.findFirst({
      where: {
        id,
        task: { userId },
      },
      select: { id: true, taskId: true },
    });

    if (!timeBlockExists) {
      return NextResponse.json({ error: "TimeBlock not found or unauthorized" }, { status: 404 });
    }

    const timeBlock = await prisma.timeBlock.update({
      where: { id },
      data: { completed: true },
    });

    // Check if all blocks for this task are completed
    const remainingBlocks = await prisma.timeBlock.count({
      where: {
        taskId: timeBlock.taskId,
        completed: false,
      },
    });

    // If all blocks for this task are done, mark task as completed
    if (remainingBlocks === 0) {
      await prisma.task.update({
        where: { id: timeBlock.taskId },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({ success: true, timeBlock });
  } catch (error) {
    console.error("Complete block error:", error);
    return NextResponse.json(
      { error: "Failed to complete block" },
      { status: 500 }
    );
  }
}
