"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, isSameDay, isToday } from "date-fns";
import { useDroppable } from "@dnd-kit/core";

const START_HOUR = 7;
const END_HOUR = 21;
const PX_PER_HOUR = 64;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;

function timeStrToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getTopPx(date: Date) {
  const mins = date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
  return (mins / 60) * PX_PER_HOUR;
}

function getHeightPx(start: Date, end: Date) {
  return ((end.getTime() - start.getTime()) / 3600000) * PX_PER_HOUR;
}

function getRecurringTopPx(timeStr: string) {
  return ((timeStrToMinutes(timeStr) - START_HOUR * 60) / 60) * PX_PER_HOUR;
}

function getRecurringHeightPx(startStr: string, endStr: string) {
  return ((timeStrToMinutes(endStr) - timeStrToMinutes(startStr)) / 60) * PX_PER_HOUR;
}

const PRIORITY_CLASSES: Record<number, string> = {
  1: "bg-red-50 border-red-200 text-red-700",
  2: "bg-amber-50 border-amber-200 text-amber-700",
  3: "bg-stone-50 border-stone-200 text-stone-600",
};

interface TimeBlockWithTask {
  id: string;
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

interface RecurringBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string | null;
  daysOfWeek: string;
}

interface DailyViewProps {
  day: Date;
  timeBlocks: TimeBlockWithTask[];
  recurringBlocks: RecurringBlock[];
  todayLocked: boolean;
  onFocusClick: (blockId: string | null, title: string, duration: number) => void;
  onComplete: (blockId: string) => void;
}

function DroppableTimeline({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-1 transition-colors duration-200 ${isOver ? "bg-violet-50/30" : ""}`}
    >
      {children}
    </div>
  );
}

export default function DailyView({
  day,
  timeBlocks,
  recurringBlocks,
  todayLocked,
  onFocusClick,
  onComplete,
}: DailyViewProps) {
  const isCurrentDay = isToday(day);
  const isLockedDay = isCurrentDay && todayLocked;
  const dayBlocks = timeBlocks.filter((b) => isSameDay(new Date(b.startTime), day));
  const dayOfWeek = (day.getDay() + 6) % 7;
  const dayRecurring = recurringBlocks.filter((rb) =>
    rb.daysOfWeek.split(",").map(Number).includes(dayOfWeek)
  );
  const dateId = day.toISOString().split("T")[0];

  const [nowMinutes, setNowMinutes] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes()
  );
  useEffect(() => {
    if (!isCurrentDay) return;
    const t = setInterval(
      () => setNowMinutes(new Date().getHours() * 60 + new Date().getMinutes()),
      60000
    );
    return () => clearInterval(t);
  }, [isCurrentDay]);

  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * PX_PER_HOUR;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="flex-1 flex flex-col bg-white/60 rounded-2xl card-shadow overflow-hidden min-h-0">
      {/* Day header */}
      <div
        className={`px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 ${
          isCurrentDay ? "bg-violet-50/40" : "bg-white/60"
        }`}
      >
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            {format(day, "EEEE")}
          </p>
          <p
            className={`text-3xl font-bold leading-none mt-0.5 ${
              isCurrentDay ? "text-violet-600" : "text-stone-800"
            }`}
          >
            {format(day, "d")}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{format(day, "MMMM yyyy")}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isCurrentDay && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-medium text-violet-600">Today</span>
            </div>
          )}
          {isLockedDay && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-xs text-stone-500">Locked</span>
            </div>
          )}
          {dayBlocks.length > 0 && (
            <p className="text-xs text-stone-400">
              {dayBlocks.filter((b) => b.completed).length}/{dayBlocks.length} done ·{" "}
              {dayBlocks.reduce((acc, b) => {
                return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
              }, 0)}
              m total
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <DroppableTimeline id={dateId}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative select-none" style={{ height: TOTAL_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex justify-end pr-2"
                style={{ top: (h - START_HOUR) * PX_PER_HOUR - 8 }}
              >
                <span className="text-[10px] text-stone-400 font-medium pt-1">
                  {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Blocks area */}
          <div
            className="flex-1 relative border-l border-stone-100 mr-3"
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Hour grid lines */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-stone-100"
                style={{ top: (h - START_HOUR) * PX_PER_HOUR }}
              />
            ))}
            {/* Half-hour lines */}
            {hours.map((h) => (
              <div
                key={`${h}h`}
                className="absolute left-0 right-0 border-t border-stone-50"
                style={{ top: (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2 }}
              />
            ))}

            {/* Recurring blocks */}
            {dayRecurring.map((rb) => {
              const top = getRecurringTopPx(rb.startTime);
              const height = getRecurringHeightPx(rb.startTime, rb.endTime);
              const duration = timeStrToMinutes(rb.endTime) - timeStrToMinutes(rb.startTime);
              return (
                <button
                  key={rb.id}
                  onClick={() => onFocusClick(null, rb.title, duration)}
                  className="absolute left-1 right-1 rounded-lg px-2 py-1 border border-dashed
                             text-left hover:brightness-95 transition-all duration-150 cursor-pointer"
                  style={{
                    top: Math.max(0, top),
                    height: Math.max(height, 22),
                    backgroundColor: rb.color ? `${rb.color}25` : "#f5f5f430",
                    borderColor: rb.color ? `${rb.color}60` : "#d6d3d180",
                  }}
                >
                  <p className="text-[10px] font-semibold text-stone-500 truncate">{rb.title}</p>
                  {height >= 32 && (
                    <p className="text-[9px] text-stone-400">
                      {rb.startTime}–{rb.endTime}
                    </p>
                  )}
                </button>
              );
            })}

            {/* Task time blocks */}
            {dayBlocks.map((block) => {
              const start = new Date(block.startTime);
              const end = new Date(block.endTime);
              const top = getTopPx(start);
              const height = Math.max(getHeightPx(start, end), 28);
              const pClass = PRIORITY_CLASSES[block.task.priority] ?? PRIORITY_CLASSES[3];
              const locked = isLockedDay || block.isLocked;

              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute left-1 right-1 rounded-xl border px-3 py-1.5 ${pClass} ${
                    block.completed ? "opacity-50" : "hover:shadow-md"
                  } ${!block.completed && !locked ? "cursor-pointer" : ""} transition-shadow duration-200`}
                  style={{ top, height }}
                  onClick={() =>
                    !block.completed &&
                    !locked &&
                    onFocusClick(block.id, block.task.title, block.task.duration)
                  }
                >
                  <div className="flex items-start justify-between gap-1 h-full">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          block.completed ? "line-through opacity-60" : ""
                        }`}
                      >
                        {block.task.title}
                      </p>
                      {height >= 44 && (
                        <p className="text-[10px] opacity-60 mt-0.5">
                          {format(start, "h:mm")}–{format(end, "h:mm a")} · {block.task.duration}m
                        </p>
                      )}
                    </div>
                    {!block.completed && !locked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onComplete(block.id);
                        }}
                        className="w-4 h-4 rounded-full border border-current opacity-40 hover:opacity-80 shrink-0 mt-0.5 transition-opacity"
                      />
                    )}
                    {block.completed && (
                      <svg
                        className="w-4 h-4 shrink-0 mt-0.5 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Current time indicator */}
            {isCurrentDay && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
              <div
                className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                style={{ top: nowTop }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 -ml-1.5 shrink-0" />
                <div className="flex-1 h-0.5 bg-violet-400" />
              </div>
            )}

            {/* Empty state */}
            {dayBlocks.length === 0 && dayRecurring.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-sm text-stone-300 font-medium">No blocks scheduled</p>
                  <p className="text-xs text-stone-200 mt-1">Drag tasks here or use Plan My Week</p>
                </div>
              </div>
            )}
          </div>
        </DroppableTimeline>
      </div>
    </div>
  );
}
