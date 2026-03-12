"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface FocusModeProps {
  isOpen: boolean;
  blockId: string | null;
  taskTitle: string;
  durationMinutes: number;
  notes?: string | null;
  subtasks?: Subtask[];
  onClose: () => void;
  onComplete: (blockId: string) => void;
}

export default function FocusMode({
  isOpen,
  blockId,
  taskTitle,
  durationMinutes,
  notes,
  subtasks = [],
  onClose,
  onComplete,
}: FocusModeProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);

  // Reset timer only when switching to a different task (blockId changes).
  // Re-opening the same task preserves the timer state.
  useEffect(() => {
    setSecondsLeft(durationMinutes * 60);
    setIsRunning(false);
    setIsCompleted(false);
    setLocalSubtasks(subtasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  // Countdown logic
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // SVG circle
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const handleComplete = useCallback(() => {
    if (blockId) onComplete(blockId);
    onClose();
  }, [blockId, onComplete, onClose]);

  const toggleSubtask = async (subtaskId: string) => {
    const subtask = localSubtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const newCompleted = !subtask.completed;
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, completed: newCompleted } : s))
    );

    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
      setLocalSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, completed: !newCompleted } : s))
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center focus-backdrop bg-stone-900/20"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 rounded-3xl p-10 max-w-md w-full mx-4
                     shadow-2xl shadow-stone-900/10 text-center
                     max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full
                       bg-stone-100 hover:bg-stone-200 text-stone-400
                       hover:text-stone-600 flex items-center justify-center
                       transition-colors duration-200 text-sm"
          >
            ✕
          </button>

          {/* Focus label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-2"
          >
            <span className="text-[11px] font-semibold text-violet-500 uppercase tracking-widest">
              Focus Mode
            </span>
          </motion.div>

          {/* Task title */}
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-semibold text-stone-800 mb-4"
          >
            {taskTitle}
          </motion.h2>

          {/* Notes */}
          {notes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 text-left"
            >
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">{notes}</p>
            </motion.div>
          )}

          {/* Timer ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative w-56 h-56 mx-auto mb-6"
          >
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 280 280"
            >
              <circle cx="140" cy="140" r={radius} fill="none" stroke="#F5F5F4" strokeWidth="6" />
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-5xl font-light tabular-nums tracking-tight ${
                  isCompleted ? "text-emerald-500" : "text-stone-800"
                }`}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="text-xs text-stone-400 mt-2">
                {isCompleted
                  ? "Time's up!"
                  : isRunning
                  ? "Stay focused..."
                  : "Ready to focus?"}
              </span>
            </div>
          </motion.div>

          {/* Subtasks checklist */}
          {localSubtasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6 text-left"
            >
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 text-center">
                Subtasks ({localSubtasks.filter((s) => s.completed).length}/{localSubtasks.length})
              </p>
              <div className="space-y-1.5">
                {localSubtasks.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => toggleSubtask(st.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl
                               hover:bg-stone-50 transition-colors duration-200 text-left"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border-2 flex items-center justify-center
                                  transition-all duration-200 shrink-0
                                  ${st.completed
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-stone-300"
                                  }`}
                    >
                      {st.completed && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm transition-all duration-200 ${
                        st.completed ? "text-stone-400 line-through" : "text-stone-700"
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 justify-center"
          >
            {!isCompleted ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsRunning(!isRunning)}
                className={`
                  px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  ${
                    isRunning
                      ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      : "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-200/50"
                  }
                `}
              >
                {isRunning ? "Pause" : "Start"}
              </motion.button>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleComplete}
              className={`
                px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                ${
                  isCompleted
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-200/50"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }
              `}
            >
              {isCompleted ? (blockId ? "Complete!" : "Done!") : blockId ? "Complete" : "Done"}
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
