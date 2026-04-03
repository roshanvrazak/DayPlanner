"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface TaskCardProps {
  id: string;
  title: string;
  duration: number;
  priority: number;
  deadline?: string | null;
  status: string;
  isLocked?: boolean;
  completed?: boolean;
  blockStartTime?: string;
  blockEndTime?: string;
  blockId?: string;
  onFocusClick?: (blockId: string, title: string, duration: number) => void;
  onComplete?: (blockId: string) => void;
}

const priorityColors: Record<number, { bg: string; border: string; dot: string }> = {
  1: { bg: "bg-red-100/70", border: "border-red-200/50", dot: "bg-red-400" },
  2: { bg: "bg-amber-100/70", border: "border-amber-200/50", dot: "bg-amber-400" },
  3: { bg: "bg-stone-100/70", border: "border-stone-200/50", dot: "bg-stone-400" },
};

const TaskCard = memo(function TaskCard({
  id,
  title,
  duration,
  priority,
  deadline,
  status,
  isLocked,
  completed,
  blockStartTime,
  blockEndTime,
  blockId,
  onFocusClick,
  onComplete,
}: TaskCardProps) {
  const colors = priorityColors[priority] || priorityColors[3];

  const formatTimeRange = () => {
    if (!blockStartTime || !blockEndTime) return null;
    const start = format(new Date(blockStartTime), "h:mm a");
    const end = format(new Date(blockEndTime), "h:mm a");
    return `${start} — ${end}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{
        opacity: completed ? 0.5 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={!isLocked && !completed ? { y: -2, scale: 1.01 } : {}}
      className={`
        group relative rounded-xl p-3.5 cursor-pointer
        transition-shadow duration-300
        ${colors.bg} ${colors.border} border
        ${completed ? "line-through opacity-50" : ""}
        ${isLocked ? "cursor-not-allowed" : ""}
        card-shadow hover:card-shadow-hover
      `}
      onClick={() => {
        if (blockId && onFocusClick && !completed) {
          onFocusClick(blockId, title, duration);
        }
      }}
    >
      {/* Priority dot */}
      <div className="flex items-start gap-2.5">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium text-stone-800 leading-snug ${
              completed ? "line-through text-stone-400" : ""
            }`}
          >
            {title}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-stone-400 font-medium">
              {duration}m
            </span>
            {formatTimeRange() && (
              <span className="text-[11px] text-stone-400">
                {formatTimeRange()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lock indicator */}
      {isLocked && !completed && (
        <div className="absolute top-2 right-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-stone-300"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}

      {/* Complete button for scheduled blocks */}
      {blockId && !completed && onComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(blockId);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                     transition-opacity duration-200 p-1 rounded-lg 
                     hover:bg-white/60 text-stone-400 hover:text-emerald-500"
          title="Mark completed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      )}

      {/* Completed checkmark */}
      {completed && (
        <div className="absolute top-2 right-2 text-emerald-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </motion.div>
  );
});

export default TaskCard;
