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
    // Ensure the block belongs to the user
    await prisma.recurringBlock.delete({
      where: {
        id,
        userId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RecurringBlock DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete recurring block" }, { status: 500 });
  }
}
