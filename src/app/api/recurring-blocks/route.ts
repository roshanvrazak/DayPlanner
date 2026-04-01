import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateRecurringBlockSchema, formatValidationError } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json();

    const parsed = CreateRecurringBlockSchema.safeParse({ ...body, userId });
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { title, startTime, endTime, daysOfWeek, color } = parsed.data;

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
