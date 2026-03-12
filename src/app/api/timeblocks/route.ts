import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, startOfWeek } from "date-fns";

// GET time blocks for a date range (defaults to current week)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

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
        task: true,
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error("TimeBlocks GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
