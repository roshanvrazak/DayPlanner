"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RecurringBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  color: string | null;
}

interface RecurringBlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COLORS = ["#FCA5A5", "#FDE68A", "#A7F3D0", "#BAE6FD", "#C4B5FD", "#FBCFE8"];

export default function RecurringBlocksModal({
  isOpen,
  onClose,
  onSave,
}: RecurringBlocksModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedColor, setSelectedColor] = useState(COLORS[1]);

  useEffect(() => {
    if (isOpen && userId) {
      fetch(`/api/recurring-blocks?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => setBlocks(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [isOpen, userId]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAdd = async () => {
    if (!title.trim() || selectedDays.length === 0 || !userId) return;

    try {
      const res = await fetch("/api/recurring-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startTime,
          endTime,
          daysOfWeek: selectedDays.sort().join(","),
          color: selectedColor,
          userId,
        }),
      });

      if (res.ok) {
        const block = await res.json();
        setBlocks((prev) => [...prev, block]);
        setTitle("");
        setStartTime("12:00");
        setEndTime("13:00");
        setSelectedDays([0, 1, 2, 3, 4]);
        onSave();
      }
    } catch (error) {
      console.error("Failed to create recurring block:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring-blocks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        onSave();
      }
    } catch (error) {
      console.error("Failed to delete recurring block:", error);
    }
  };

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
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4
                       shadow-2xl shadow-stone-900/10 max-h-[85vh] overflow-y-auto"
          >
            <h3 className="text-base font-semibold text-stone-800 mb-4">
              Fixed Blocks
            </h3>

            {/* Existing blocks */}
            {blocks.length > 0 && (
              <div className="space-y-2 mb-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-100"
                    style={{ backgroundColor: block.color ? `${block.color}20` : undefined }}
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-700">{block.title}</p>
                      <p className="text-[11px] text-stone-400">
                        {block.startTime} - {block.endTime}
                        {" · "}
                        {block.daysOfWeek
                          .split(",")
                          .map((d) => DAY_LABELS[parseInt(d)])
                          .join(", ")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(block.id)}
                      className="text-stone-300 hover:text-red-400 transition-colors p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new block form */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Add new block
              </p>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Block name (e.g., Lunch)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200
                           bg-stone-50/50 text-sm text-stone-800
                           placeholder:text-stone-300
                           focus:outline-none focus:ring-2 focus:ring-violet-200
                           focus:border-violet-300 transition-all duration-200"
              />

              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200
                             bg-stone-50/50 text-sm text-stone-800
                             focus:outline-none focus:ring-2 focus:ring-violet-200
                             focus:border-violet-300 transition-all duration-200"
                />
                <span className="text-stone-400 text-sm">to</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200
                             bg-stone-50/50 text-sm text-stone-800
                             focus:outline-none focus:ring-2 focus:ring-violet-200
                             focus:border-violet-300 transition-all duration-200"
                />
              </div>

              {/* Days of week */}
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`
                      flex-1 py-1.5 rounded-lg text-[11px] font-semibold
                      transition-all duration-200
                      ${
                        selectedDays.includes(i)
                          ? "bg-violet-100 text-violet-600 ring-1 ring-violet-200"
                          : "bg-stone-50 text-stone-400 hover:bg-stone-100"
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full transition-all duration-200 ${
                      selectedColor === color ? "ring-2 ring-offset-2 ring-stone-300" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAdd}
                disabled={!title.trim() || selectedDays.length === 0}
                className="w-full py-2.5 rounded-xl text-xs font-semibold
                           bg-gradient-to-r from-violet-500 to-purple-500
                           text-white shadow-lg shadow-violet-200/40
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                Add Block
              </motion.button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold
                         bg-stone-100 text-stone-500 hover:bg-stone-200
                         transition-colors duration-200"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
