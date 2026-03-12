import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/recurring-tasks/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.recurringTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RecurringTask DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// PATCH /api/recurring-tasks/[id] — toggle active
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const task = await prisma.recurringTask.update({
      where: { id },
      data: { isActive: body.isActive },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error("RecurringTask PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
