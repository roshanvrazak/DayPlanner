import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

    const now = new Date();
    const blocks = await prisma.timeBlock.findMany({
      where: {
        task: { userId },
        startTime: { gte: startOfDay(now) },
        endTime: { lte: endOfDay(now) },
      },
      include: { task: { select: { title: true, priority: true } } },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error("Review GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { blockId, completed }

    await prisma.$transaction(
      updates.map((u: { blockId: string; completed: boolean }) =>
        prisma.timeBlock.update({
          where: { id: u.blockId },
          data: { completed: u.completed },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review POST error:", error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
