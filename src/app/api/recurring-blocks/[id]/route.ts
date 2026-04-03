import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const existing = await prisma.recurringBlock.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recurring block not found" }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.recurringBlock.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RecurringBlock DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete recurring block" }, { status: 500 });
  }
}
