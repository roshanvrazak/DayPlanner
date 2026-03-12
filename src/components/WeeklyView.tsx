"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, isToday } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";

function DroppableDay({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className || ""} transition-all duration-200 ${
        isOver ? "ring-2 ring-violet-300 bg-violet-50/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

interface TimeBlockWithTask {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isLocked: boolean;
  completed: boolean;
  task: {
    id: string;
    title: string;
    duration: number;
    priority: number;
    deadline: string | null;
    status: string;
  };
}

interface RecurringBlockDisplay {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string | null;
  daysOfWeek: string;
}

interface WeeklyViewProps {
  days: Date[];
  timeBlocks: TimeBlockWithTask[];
  recurringBlocks: RecurringBlockDisplay[];
  todayLocked: boolean;
  onFocusClick: (blockId: string, title: string, duration: number) => void;
  onComplete: (blockId: string) => void;
}

export default function WeeklyView({
  days,
  timeBlocks,
  recurringBlocks,
  todayLocked,
  onFocusClick,
  onComplete,
}: WeeklyViewProps) {
  const getBlocksForDay = (day: Date) => {
    return timeBlocks.filter((block) =>
      isSameDay(new Date(block.startTime), day)
    );
  };

  const getRecurringBlocksForDay = (day: Date) => {
    const dayOfWeek = (day.getDay() + 6) % 7; // 0=Monday
    return recurringBlocks.filter((rb) =>
      rb.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 flex-1 min-h-0">
      {days.map((day, index) => {
        const dayBlocks = getBlocksForDay(day);
        const dayRecurring = getRecurringBlocksForDay(day);
        const isCurrentDay = isToday(day);
        const isLockedDay = isCurrentDay && todayLocked;

        return (
          <DroppableDay key={day.toISOString()} id={day.toISOString().split("T")[0]}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className={`
              flex flex-col rounded-2xl p-3 min-h-0 h-full
              ${isCurrentDay
                ? "bg-white ring-2 ring-violet-200/60 card-shadow-hover"
                : "bg-white/60 card-shadow"
              }
            `}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  {format(day, "EEE")}
                </p>
                <p
                  className={`text-lg font-semibold leading-tight ${
                    isCurrentDay ? "text-violet-600" : "text-stone-700"
                  }`}
                >
                  {format(day, "d")}
                </p>
              </div>
              {isCurrentDay && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-violet-500 uppercase">
                    Today
                  </span>
                </div>
              )}
              {isLockedDay && (
                <div className="text-[10px] font-medium text-stone-400 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Locked
                </div>
              )}
            </div>

            {/* Time blocks */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {/* Recurring blocks */}
              {dayRecurring.map((rb) => (
                <div
                  key={rb.id}
                  className="rounded-xl px-3 py-2 border border-dashed"
                  style={{
                    backgroundColor: rb.color ? `${rb.color}30` : "#F5F5F430",
                    borderColor: rb.color ? `${rb.color}80` : "#D6D3D180",
                  }}
                >
                  <p className="text-[11px] font-semibold text-stone-500">{rb.title}</p>
                  <p className="text-[10px] text-stone-400">
                    {rb.startTime} - {rb.endTime}
                  </p>
                </div>
              ))}

              <AnimatePresence mode="popLayout">
                {dayBlocks.length > 0 ? (
                  dayBlocks.map((block) => (
                    <TaskCard
                      key={block.id}
                      id={block.task.id}
                      title={block.task.title}
                      duration={block.task.duration}
                      priority={block.task.priority}
                      deadline={block.task.deadline}
                      status={block.task.status}
                      isLocked={isLockedDay || block.isLocked}
                      completed={block.completed}
                      blockStartTime={block.startTime}
                      blockEndTime={block.endTime}
                      blockId={block.id}
                      onFocusClick={onFocusClick}
                      onComplete={onComplete}
                    />
                  ))
                ) : dayRecurring.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-20 rounded-xl
                               border border-dashed border-stone-200 text-stone-300"
                  >
                    <p className="text-xs">No blocks</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Day summary */}
            {dayBlocks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-stone-100 px-1">
                <p className="text-[10px] text-stone-400">
                  {dayBlocks.filter((b) => b.completed).length}/{dayBlocks.length} done
                  {" · "}
                  {dayBlocks.reduce((acc, b) => {
                    const mins =
                      (new Date(b.endTime).getTime() -
                        new Date(b.startTime).getTime()) /
                      60000;
                    return acc + mins;
                  }, 0)}m total
                </p>
              </div>
            )}
          </motion.div>
          </DroppableDay>
        );
      })}
    </div>
  );
}
