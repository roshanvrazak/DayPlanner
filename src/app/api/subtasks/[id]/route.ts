import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateSubtaskSchema, formatValidationError } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = UpdateSubtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    // Ensure subtask belongs to user via task
    const result = await prisma.subtask.updateMany({
      where: {
        id,
        task: { userId },
      },
      data: {
        ...(parsed.data.completed !== undefined && { completed: parsed.data.completed }),
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Subtask not found or unauthorized" }, { status: 404 });
    }

    const subtask = await prisma.subtask.findUnique({ where: { id } });
    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Subtask PATCH error:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { id } = await params;
    // Ensure subtask belongs to user via task
    const result = await prisma.subtask.deleteMany({
      where: {
        id,
        task: { userId },
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Subtask not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subtask DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
