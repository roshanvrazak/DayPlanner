import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { ReviewUpdateSchema, formatValidationError } from "@/lib/validations";

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
    return NextResponse.json({ error: "Failed to fetch review data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = ReviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    await prisma.$transaction(
      parsed.data.updates.map((u) =>
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
