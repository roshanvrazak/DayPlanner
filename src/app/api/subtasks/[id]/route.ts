import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateSubtaskSchema, formatValidationError } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = UpdateSubtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const subtask = await prisma.subtask.update({
      where: { id },
      data: {
        ...(parsed.data.completed !== undefined && { completed: parsed.data.completed }),
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error("Subtask PATCH error:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.subtask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subtask DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
