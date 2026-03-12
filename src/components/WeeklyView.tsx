"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, isToday } from "date-fns";
import TaskCard from "./TaskCard";

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

interface WeeklyViewProps {
  days: Date[];
  timeBlocks: TimeBlockWithTask[];
  todayLocked: boolean;
  onFocusClick: (blockId: string, title: string, duration: number) => void;
  onComplete: (blockId: string) => void;
}

export default function WeeklyView({
  days,
  timeBlocks,
  todayLocked,
  onFocusClick,
  onComplete,
}: WeeklyViewProps) {
  const getBlocksForDay = (day: Date) => {
    return timeBlocks.filter((block) =>
      isSameDay(new Date(block.startTime), day)
    );
  };

  return (
    <div className="grid grid-cols-7 gap-3 flex-1 min-h-0">
      {days.map((day, index) => {
        const dayBlocks = getBlocksForDay(day);
        const isCurrentDay = isToday(day);
        const isLockedDay = isCurrentDay && todayLocked;

        return (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className={`
              flex flex-col rounded-2xl p-3 min-h-0
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
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-20 rounded-xl
                               border border-dashed border-stone-200 text-stone-300"
                  >
                    <p className="text-xs">No blocks</p>
                  </motion.div>
                )}
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
        );
      })}
    </div>
  );
}
