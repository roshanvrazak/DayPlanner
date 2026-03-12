"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: {
    title: string;
    duration: number;
    priority: number;
    deadline: string;
  }) => void;
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [priority, setPriority] = useState("2");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      duration: parseInt(duration),
      priority: parseInt(priority),
      deadline,
    });

    // Reset
    setTitle("");
    setDuration("30");
    setPriority("2");
    setDeadline("");
    onClose();
  };

  const priorityOptions = [
    { value: "1", label: "High", color: "bg-red-100 text-red-600 border-red-200" },
    { value: "2", label: "Medium", color: "bg-amber-100 text-amber-600 border-amber-200" },
    { value: "3", label: "Low", color: "bg-stone-100 text-stone-600 border-stone-200" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center 
                     focus-backdrop bg-stone-900/20"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 
                       shadow-2xl shadow-stone-900/10"
          >
            <h3 className="text-base font-semibold text-stone-800 mb-4">
              New Task
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Task name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 
                             bg-stone-50/50 text-sm text-stone-800 
                             placeholder:text-stone-300 
                             focus:outline-none focus:ring-2 focus:ring-violet-200 
                             focus:border-violet-300 transition-all duration-200"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="5"
                  max="480"
                  step="5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 
                             bg-stone-50/50 text-sm text-stone-800
                             focus:outline-none focus:ring-2 focus:ring-violet-200 
                             focus:border-violet-300 transition-all duration-200"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Priority
                </label>
                <div className="flex gap-2">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`
                        flex-1 py-2 rounded-xl text-xs font-semibold border
                        transition-all duration-200
                        ${
                          priority === opt.value
                            ? `${opt.color} ring-2 ring-offset-1 ring-stone-200`
                            : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 
                             bg-stone-50/50 text-sm text-stone-800
                             focus:outline-none focus:ring-2 focus:ring-violet-200 
                             focus:border-violet-300 transition-all duration-200"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-stone-100 text-stone-500 hover:bg-stone-200 
                             transition-colors duration-200"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-gradient-to-r from-violet-500 to-purple-500 
                             text-white shadow-lg shadow-violet-200/40
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  Add Task
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
