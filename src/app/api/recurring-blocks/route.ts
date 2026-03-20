import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateRecurringBlockSchema, formatValidationError } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user";

    const blocks = await prisma.recurringBlock.findMany({
      where: { userId },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error("RecurringBlocks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring blocks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = CreateRecurringBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { title, startTime, endTime, daysOfWeek, color, userId } = parsed.data;

    const block = await prisma.recurringBlock.create({
      data: {
        title,
        startTime,
        endTime,
        daysOfWeek,
        color: color ?? null,
        userId,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("RecurringBlocks POST error:", error);
    return NextResponse.json({ error: "Failed to create recurring block" }, { status: 500 });
  }
}
