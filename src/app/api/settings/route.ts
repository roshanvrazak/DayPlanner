import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateSettingsSchema, formatValidationError } from "@/lib/validations";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return NextResponse.json({
      name: user.name,
      dayStartTime: user.dayStartTime,
      dayEndTime: user.dayEndTime,
      strictMode: user.strictMode,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { name, dayStartTime, dayEndTime, strictMode } = parsed.data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(dayStartTime !== undefined && { dayStartTime }),
        ...(dayEndTime !== undefined && { dayEndTime }),
        ...(strictMode !== undefined && { strictMode }),
      },
    });

    return NextResponse.json({
      name: user.name,
      dayStartTime: user.dayStartTime,
      dayEndTime: user.dayEndTime,
      strictMode: user.strictMode,
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
