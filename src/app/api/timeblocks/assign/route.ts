import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
} from "date-fns";
import { AssignTaskSchema, formatValidationError } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = AssignTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatValidationError(parsed.error), { status: 422 });
    }

    const { taskId, date, userId } = parsed.data;

    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const targetDate = new Date(date);
    const [startH, startM] = user.dayStartTime.split(":").map(Number);
    const [endH, endM] = user.dayEndTime.split(":").map(Number);

    const dayStart = setMinutes(setHours(startOfDay(targetDate), startH), startM);
    const dayEnd = setMinutes(setHours(startOfDay(targetDate), endH), endM);

    // Get existing blocks for that day
    const existingBlocks = await prisma.timeBlock.findMany({
      where: {
        task: { userId },
        startTime: { gte: startOfDay(targetDate) },
        endTime: { lte: endOfDay(targetDate) },
      },
      orderBy: { startTime: "asc" },
    });

    // Find first available slot
    let cursor = dayStart;
    let blockStart: Date | null = null;

    for (const block of existingBlocks) {
      const gap = differenceInMinutes(block.startTime, cursor);
      if (gap >= task.duration) {
        blockStart = cursor;
        break;
      }
      if (isAfter(block.endTime, cursor)) {
        cursor = block.endTime;
      }
    }

    if (!blockStart && isBefore(cursor, dayEnd)) {
      const remaining = differenceInMinutes(dayEnd, cursor);
      if (remaining >= task.duration) {
        blockStart = cursor;
      }
    }

    if (!blockStart) {
      return NextResponse.json(
        { error: "No available slot on this day" },
        { status: 400 }
      );
    }

    const timeBlock = await prisma.timeBlock.create({
      data: {
        taskId,
        startTime: blockStart,
        endTime: addMinutes(blockStart, task.duration),
        isLocked: false,
        completed: false,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "SCHEDULED" },
    });

    return NextResponse.json(timeBlock, { status: 201 });
  } catch (error) {
    console.error("Assign POST error:", error);
    return NextResponse.json({ error: "Failed to assign task" }, { status: 500 });
  }
}
