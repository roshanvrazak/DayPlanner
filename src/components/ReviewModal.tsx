"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface ReviewBlock {
  id: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  task: { title: string; priority: number };
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ReviewModal({ isOpen, onClose, onSave }: ReviewModalProps) {
  const [blocks, setBlocks] = useState<ReviewBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/review")
        .then((res) => res.json())
        .then((data) => setBlocks(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const toggleBlock = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, completed: !b.completed } : b))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: blocks.map((b) => ({ blockId: b.id, completed: b.completed })),
        }),
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save review:", error);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = blocks.filter((b) => b.completed).length;

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
                       shadow-2xl shadow-stone-900/10 max-h-[85vh] overflow-y-auto"
          >
            <h3 className="text-base font-semibold text-stone-800 mb-1">
              Daily Review
            </h3>
            <p className="text-[11px] text-stone-400 mb-4">
              Mark your blocks as completed or incomplete
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-6 h-6 border-2 border-stone-200 border-t-violet-500 rounded-full"
                />
              </div>
            ) : blocks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400">No blocks scheduled for today</p>
              </div>
            ) : (
              <>
                {/* Progress */}
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Progress
                    </span>
                    <span className="text-xs font-semibold text-stone-600">
                      {completedCount}/{blocks.length}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                    <motion.div
                      animate={{ width: `${blocks.length > 0 ? (completedCount / blocks.length) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        completedCount === blocks.length
                          ? "bg-emerald-500"
                          : "bg-violet-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Block list */}
                <div className="space-y-2 mb-4">
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => toggleBlock(block.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 border border-stone-100 hover:bg-stone-50
                                 transition-colors duration-200 text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center
                                    transition-all duration-200 shrink-0
                                    ${block.completed
                                      ? "bg-emerald-500 border-emerald-500"
                                      : "border-stone-300"
                                    }`}
                      >
                        {block.completed && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          block.completed ? "text-stone-400 line-through" : "text-stone-700"
                        }`}>
                          {block.task.title}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {format(new Date(block.startTime), "h:mm a")} -{" "}
                          {format(new Date(block.endTime), "h:mm a")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
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
                onClick={handleSave}
                disabled={saving || blocks.length === 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                           bg-gradient-to-r from-violet-500 to-purple-500
                           text-white shadow-lg shadow-violet-200/40
                           disabled:opacity-50 transition-all duration-200"
              >
                {saving ? "Saving..." : "Save Review"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
