import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateRecurringTaskSchema, formatValidationError } from "@/lib/validations";

// DELETE /api/recurring-tasks/[id]
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

    const existing = await prisma.recurringTask.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recurring task not found" }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.recurringTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RecurringTask DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete recurring task" }, { status: 500 });
  }
}

// PATCH /api/recurring-tasks/[id] — toggle active
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

    const existing = await prisma.recurringTask.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recurring task not found" }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateRecurringTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const task = await prisma.recurringTask.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("RecurringTask PATCH error:", error);
    return NextResponse.json({ error: "Failed to update recurring task" }, { status: 500 });
  }
}
