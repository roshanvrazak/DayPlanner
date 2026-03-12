"use client";

import { motion } from "framer-motion";
import {
  format,
  isSameDay,
  isToday,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { useDroppable } from "@dnd-kit/core";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRIORITY_PILL: Record<number, string> = {
  1: "bg-red-50 text-red-500",
  2: "bg-amber-50 text-amber-600",
  3: "bg-stone-100 text-stone-500",
};

interface TimeBlockWithTask {
  id: string;
  startTime: string;
  completed: boolean;
  task: { title: string; priority: number };
}

interface MonthlyViewProps {
  selectedDate: Date;
  timeBlocks: TimeBlockWithTask[];
  onDayClick: (day: Date) => void;
}

function DroppableCell({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-violet-300" : ""} transition-all duration-150`}
    >
      {children}
    </div>
  );
}

export default function MonthlyView({
  selectedDate,
  timeBlocks,
  onDayClick,
}: MonthlyViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getBlocksForDay = (day: Date) =>
    timeBlocks.filter((b) => isSameDay(new Date(b.startTime), day));

  return (
    <div className="flex-1 flex flex-col bg-white/60 rounded-2xl card-shadow p-4 min-h-0 overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-stone-400 uppercase tracking-wider py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1 overflow-hidden" style={{ gridAutoRows: "1fr" }}>
        {days.map((day, i) => {
          const blocks = getBlocksForDay(day);
          const inMonth = isSameMonth(day, selectedDate);
          const isCurrentDay = isToday(day);
          const allDone = blocks.length > 0 && blocks.every((b) => b.completed);
          const dateId = day.toISOString().split("T")[0];

          return (
            <DroppableCell key={day.toISOString()} id={dateId} className="rounded-xl">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.004 }}
                onClick={() => onDayClick(day)}
                className={`
                  relative w-full h-full rounded-xl p-2 text-left transition-all duration-150
                  hover:ring-2 hover:ring-violet-200 hover:shadow-sm
                  ${
                    isCurrentDay
                      ? "bg-violet-50 ring-2 ring-violet-200"
                      : inMonth
                      ? "bg-white hover:bg-stone-50/80"
                      : "bg-transparent"
                  }
                `}
              >
                {/* Day number */}
                <div className="mb-1.5">
                  {isCurrentDay ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold">
                      {format(day, "d")}
                    </span>
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        inMonth ? "text-stone-700" : "text-stone-300"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  )}
                </div>

                {/* Task pills */}
                {inMonth && blocks.length > 0 && (
                  <div className="space-y-0.5">
                    {blocks.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${
                          b.completed
                            ? "bg-stone-100 text-stone-400 line-through"
                            : (PRIORITY_PILL[b.task.priority] ?? PRIORITY_PILL[3])
                        }`}
                      >
                        {b.task.title}
                      </div>
                    ))}
                    {blocks.length > 2 && (
                      <p className="text-[10px] text-stone-400 px-0.5">
                        +{blocks.length - 2} more
                      </p>
                    )}
                  </div>
                )}

                {/* All-done checkmark badge */}
                {inMonth && allDone && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 flex items-center justify-center">
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.button>
            </DroppableCell>
          );
        })}
      </div>
    </div>
  );
}
