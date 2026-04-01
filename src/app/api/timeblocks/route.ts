import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, startOfWeek } from "date-fns";
import { auth } from "@/auth";

// GET time blocks for a date range (defaults to current week)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : startOfDay(weekStart);
    const end = searchParams.get("end")
      ? new Date(searchParams.get("end")!)
      : endOfDay(addDays(weekStart, 6));

    const timeBlocks = await prisma.timeBlock.findMany({
      where: {
        task: { userId },
        startTime: { gte: start },
        endTime: { lte: end },
      },
      include: {
        task: {
          include: { subtasks: { orderBy: { order: "asc" } } },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error("TimeBlocks GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
