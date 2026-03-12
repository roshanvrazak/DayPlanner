import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH mark a timeblock as completed
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
