import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { OverrideSchema, formatValidationError } from "@/lib/validations";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    const parsed = OverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { confirmationPhrase } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { overridePhrase: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (confirmationPhrase !== user.overridePhrase) {
      return NextResponse.json(
        { error: "Incorrect confirmation phrase" },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await prisma.timeBlock.updateMany({
      where: {
        task: { userId },
        startTime: { gte: startOfDay(now) },
        endTime: { lte: endOfDay(now) },
        isLocked: true,
      },
      data: { isLocked: false },
    });

    return NextResponse.json({
      success: true,
      unlockedCount: result.count,
    });
  } catch (error) {
    console.error("Override POST error:", error);
    return NextResponse.json({ error: "Failed to override lock" }, { status: 500 });
  }
}
