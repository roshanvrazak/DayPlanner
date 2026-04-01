"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type RecurrenceType = "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";

interface RecurringTask {
  id: string;
  title: string;
  duration: number;
  priority: number;
  notes: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  isActive: boolean;
}

interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKDAYS", label: "Weekdays (Mon–Fri)" },
  { value: "WEEKLY", label: "Weekly (pick days)" },
  { value: "MONTHLY", label: "Monthly (pick day)" },
];

export default function RecurringTasksModal({ isOpen, onClose, onSave }: RecurringTasksModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [priority, setPriority] = useState("2");
  const [notes, setNotes] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("DAILY");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState("1");

  useEffect(() => {
    if (isOpen && userId) fetchTasks();
  }, [isOpen, userId]);

  const fetchTasks = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/recurring-tasks?userId=${userId}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    let recurrenceDays: string | null = null;
    if (recurrenceType === "WEEKLY") {
      recurrenceDays = weeklyDays.join(",");
    } else if (recurrenceType === "MONTHLY") {
      recurrenceDays = monthlyDay;
    }

    try {
      const res = await fetch("/api/recurring-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          duration: parseInt(duration),
          priority: parseInt(priority),
          notes: notes.trim() || null,
          recurrenceType,
          recurrenceDays,
          userId,
        }),
      });
      if (res.ok) {
        await fetchTasks();
        onSave();
        resetForm();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring-tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        onSave();
      }
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setTitle("");
    setDuration("30");
    setPriority("2");
    setNotes("");
    setRecurrenceType("DAILY");
    setWeeklyDays([]);
    setMonthlyDay("1");
    setShowForm(false);
  };

  const toggleWeeklyDay = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const recurrenceLabel = (task: RecurringTask) => {
    if (task.recurrenceType === "DAILY") return "Every day";
    if (task.recurrenceType === "WEEKDAYS") return "Mon–Fri";
    if (task.recurrenceType === "WEEKLY") {
      const days = (task.recurrenceDays || "").split(",").map(Number);
      return days.map((d) => DOW_LABELS[d]).join(", ");
    }
    if (task.recurrenceType === "MONTHLY") return `Day ${task.recurrenceDays} of month`;
    return "";
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
          className="fixed inset-0 z-50 flex items-center justify-center focus-backdrop bg-stone-900/20"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-stone-800">Recurring Tasks</h3>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-400
                           hover:text-stone-600 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-stone-400 mb-4">
              Tasks that automatically appear in your backlog on a schedule.
            </p>

            {/* Existing tasks */}
            {loading ? (
              <div className="py-6 text-center text-xs text-stone-400">Loading...</div>
            ) : (
              <div className="space-y-2 mb-4">
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start justify-between gap-2 px-3 py-2.5
                                 rounded-xl bg-stone-50 border border-stone-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 truncate">{task.title}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {task.duration}m · {recurrenceLabel(task)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100
                                   hover:text-red-600 flex items-center justify-center text-[10px]
                                   transition-colors shrink-0 mt-0.5"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {tasks.length === 0 && !showForm && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-stone-300 font-medium">No recurring tasks yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Add form */}
            <AnimatePresence>
              {showForm ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAdd}
                  className="space-y-3 border-t border-stone-100 pt-4"
                >
                  <div>
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                      Task name
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Morning journaling"
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50
                                 text-sm text-stone-800 placeholder:text-stone-300
                                 focus:outline-none focus:ring-2 focus:ring-violet-200
                                 focus:border-violet-300 transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="5"
                        max="480"
                        step="5"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50
                                   text-sm text-stone-800 focus:outline-none focus:ring-2
                                   focus:ring-violet-200 focus:border-violet-300 transition-all"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                        Priority
                      </label>
                      <div className="flex gap-1">
                        {priorityOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPriority(opt.value)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all
                              ${priority === opt.value ? `${opt.color} ring-1 ring-offset-1 ring-stone-200` : "bg-stone-50 text-stone-400 border-stone-100"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                      Repeats
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {RECURRENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRecurrenceType(opt.value)}
                          className={`py-2 rounded-xl text-xs font-medium border transition-all
                            ${recurrenceType === opt.value
                              ? "bg-violet-50 text-violet-600 border-violet-200"
                              : "bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {recurrenceType === "WEEKLY" && (
                    <div>
                      <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                        On these days
                      </label>
                      <div className="flex gap-1 flex-wrap">
                        {DOW_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleWeeklyDay(i)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                              ${weeklyDays.includes(i)
                                ? "bg-violet-100 text-violet-600 border-violet-200"
                                : "bg-stone-50 text-stone-400 border-stone-100"
                              }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrenceType === "MONTHLY" && (
                    <div>
                      <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                        Day of month
                      </label>
                      <input
                        type="number"
                        value={monthlyDay}
                        onChange={(e) => setMonthlyDay(e.target.value)}
                        min="1"
                        max="31"
                        className="w-24 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50
                                   text-sm text-stone-800 focus:outline-none focus:ring-2
                                   focus:ring-violet-200 focus:border-violet-300 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50
                                 text-sm text-stone-800 placeholder:text-stone-300
                                 focus:outline-none focus:ring-2 focus:ring-violet-200
                                 focus:border-violet-300 transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-stone-100
                                 text-stone-500 hover:bg-stone-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={!title.trim()}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold
                                 bg-gradient-to-r from-violet-500 to-purple-500 text-white
                                 shadow-lg shadow-violet-200/40 disabled:opacity-50
                                 disabled:cursor-not-allowed transition-all"
                    >
                      Save
                    </motion.button>
                  </div>
                </motion.form>
              ) : (
                <motion.button
                  key="add-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowForm(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border border-dashed
                             border-stone-200 text-stone-400 hover:border-violet-300 hover:text-violet-500
                             hover:bg-violet-50/30 transition-all duration-200"
                >
                  + Add recurring task
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
