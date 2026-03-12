"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfWeek,
  format,
} from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import WeeklyView from "@/components/WeeklyView";
import DailyView from "@/components/DailyView";
import MonthlyView from "@/components/MonthlyView";
import BacklogSidebar from "@/components/BacklogSidebar";
import FocusMode from "@/components/FocusMode";
import AddTaskModal from "@/components/AddTaskModal";
import SettingsModal from "@/components/SettingsModal";
import RecurringBlocksModal from "@/components/RecurringBlocksModal";
import OverrideModal from "@/components/OverrideModal";
import ReviewModal from "@/components/ReviewModal";
import DraggableTaskOverlay from "@/components/DragOverlay";

type ViewMode = "daily" | "weekly" | "monthly";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  duration: number;
  priority: number;
  deadline: string | null;
  notes: string | null;
  status: string;
  subtasks: Subtask[];
}

interface TimeBlockWithTask {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isLocked: boolean;
  completed: boolean;
  task: Task;
}

interface RecurringBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  color: string | null;
}

export default function Home() {
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockWithTask[]>([]);
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [todayLocked, setTodayLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecurringBlocks, setShowRecurringBlocks] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [focusMode, setFocusMode] = useState<{
    isOpen: boolean;
    blockId: string;
    taskTitle: string;
    duration: number;
    notes: string | null;
    subtasks: Subtask[];
  }>({ isOpen: false, blockId: "", taskTitle: "", duration: 0, notes: null, subtasks: [] });

  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Derived date values
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navigation
  const navigatePrev = () => {
    if (viewMode === "daily") setSelectedDate((d) => subDays(d, 1));
    else if (viewMode === "weekly") setSelectedDate((d) => subDays(d, 7));
    else setSelectedDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === "daily") setSelectedDate((d) => addDays(d, 1));
    else if (viewMode === "weekly") setSelectedDate((d) => addDays(d, 7));
    else setSelectedDate((d) => addMonths(d, 1));
  };

  const getPeriodLabel = () => {
    if (viewMode === "daily") return format(selectedDate, "EEEE, MMM d");
    if (viewMode === "weekly") {
      const we = addDays(weekStart, 6);
      return `${format(weekStart, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(selectedDate, "MMMM yyyy");
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, blocksRes, lockRes, streakRes, recurringRes] = await Promise.all([
        fetch("/api/tasks?status=BACKLOG"),
        fetch("/api/timeblocks"),
        fetch("/api/lock"),
        fetch("/api/streak"),
        fetch("/api/recurring-blocks"),
      ]);

      const tasks = await tasksRes.json();
      const blocks = await blocksRes.json();
      const lockData = await lockRes.json();
      const streakData = await streakRes.json();
      const recurring = await recurringRes.json();

      setBacklogTasks(Array.isArray(tasks) ? tasks : []);
      setTimeBlocks(Array.isArray(blocks) ? blocks : []);
      setTodayLocked(lockData.locked || false);
      setStreak(streakData.streak || 0);
      setRecurringBlocks(Array.isArray(recurring) ? recurring : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Schedule tasks
  const handlePlanWeek = async () => {
    setIsScheduling(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "default-user" }),
      });
      const data = await res.json();
      if (data.success) await fetchData();
    } catch (error) {
      console.error("Failed to schedule:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  // Add task
  const handleAddTask = async (task: {
    title: string;
    duration: number;
    priority: number;
    deadline: string;
    notes: string;
    subtasks: { title: string }[];
  }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          userId: "default-user",
          deadline: task.deadline || null,
          notes: task.notes || null,
        }),
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) setBacklogTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Complete a time block
  const handleComplete = async (blockId: string) => {
    try {
      const res = await fetch(`/api/timeblocks/${blockId}/complete`, { method: "PATCH" });
      if (res.ok) {
        setTimeBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, completed: true } : b))
        );
      }
    } catch (error) {
      console.error("Failed to complete block:", error);
    }
  };

  // Focus mode
  const handleFocusClick = (blockId: string, title: string, duration: number) => {
    const block = timeBlocks.find((b) => b.id === blockId);
    setFocusMode({
      isOpen: true,
      blockId,
      taskTitle: title,
      duration,
      notes: block?.task?.notes || null,
      subtasks: block?.task?.subtasks || [],
    });
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = backlogTasks.find((t) => t.id === event.active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    try {
      const res = await fetch("/api/timeblocks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: active.id, date: over.id }),
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Failed to assign task:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-8 h-8 border-2 border-stone-200 border-t-violet-500 rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-stone-400">Loading your planner...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 flex flex-col gradient-subtle">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-3 flex-wrap gap-3"
      >
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">DayPlanner</h1>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100"
            >
              <span className="text-sm">🔥</span>
              <span className="text-xs font-semibold text-amber-700">{streak}</span>
            </motion.div>
          )}

          <div className="text-xs text-stone-400">
            <span className="font-semibold text-stone-600">
              {timeBlocks.filter((b) => b.completed).length}
            </span>
            /{timeBlocks.length} done
          </div>

          {todayLocked && (
            <button
              onClick={() => setShowOverride(true)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500
                         hover:bg-red-100 border border-red-100 transition-colors duration-200"
            >
              Override
            </button>
          )}

          <button
            onClick={() => setShowReview(true)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-500
                       hover:bg-stone-200 transition-colors duration-200"
          >
            Review
          </button>

          <button
            onClick={() => setShowRecurringBlocks(true)}
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-400
                       hover:text-stone-600 flex items-center justify-center transition-colors duration-200"
            title="Fixed blocks"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-400
                       hover:text-stone-600 flex items-center justify-center transition-colors duration-200"
            title="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </motion.header>

      {/* View navigation bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex items-center justify-between mb-4 gap-3 flex-wrap"
      >
        {/* Period navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={navigatePrev}
            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500
                       flex items-center justify-center transition-colors duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <span className="text-sm font-semibold text-stone-700 min-w-[190px] text-center select-none">
            {getPeriodLabel()}
          </span>

          <button
            onClick={navigateNext}
            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500
                       flex items-center justify-center transition-colors duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100
                       hover:bg-stone-200 text-stone-500 transition-colors duration-200"
          >
            Today
          </button>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-0.5 bg-stone-100 rounded-xl p-1">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 capitalize
                ${
                  viewMode === mode
                    ? "bg-white text-stone-700 shadow-sm"
                    : "text-stone-400 hover:text-stone-600"
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* View area */}
          {viewMode === "weekly" && (
            <WeeklyView
              days={days}
              timeBlocks={timeBlocks}
              recurringBlocks={recurringBlocks}
              todayLocked={todayLocked}
              onFocusClick={handleFocusClick}
              onComplete={handleComplete}
            />
          )}

          {viewMode === "daily" && (
            <DailyView
              day={selectedDate}
              timeBlocks={timeBlocks}
              recurringBlocks={recurringBlocks}
              todayLocked={todayLocked}
              onFocusClick={handleFocusClick}
              onComplete={handleComplete}
            />
          )}

          {viewMode === "monthly" && (
            <MonthlyView
              selectedDate={selectedDate}
              timeBlocks={timeBlocks}
              onDayClick={(day) => {
                setSelectedDate(day);
                setViewMode("daily");
              }}
            />
          )}

          {/* Backlog sidebar */}
          <BacklogSidebar
            tasks={backlogTasks}
            isScheduling={isScheduling}
            streak={streak}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onPlanWeek={handlePlanWeek}
            onAddTask={() => setShowAddModal(true)}
            onDeleteTask={handleDeleteTask}
            draggable
          />

          {/* Mobile: Plan + Add buttons */}
          <div className="flex gap-2 lg:hidden">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePlanWeek}
              disabled={isScheduling || backlogTasks.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold
                         bg-gradient-to-r from-violet-500 to-purple-500 text-white
                         shadow-lg shadow-violet-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScheduling ? "Planning..." : "Plan My Week"}
            </motion.button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500
                         flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeDragTask && <DraggableTaskOverlay task={activeDragTask} />}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <AddTaskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddTask} />

      <FocusMode
        isOpen={focusMode.isOpen}
        blockId={focusMode.blockId}
        taskTitle={focusMode.taskTitle}
        durationMinutes={focusMode.duration}
        notes={focusMode.notes}
        subtasks={focusMode.subtasks}
        onClose={() =>
          setFocusMode({ isOpen: false, blockId: "", taskTitle: "", duration: 0, notes: null, subtasks: [] })
        }
        onComplete={handleComplete}
      />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={fetchData} />
      <RecurringBlocksModal
        isOpen={showRecurringBlocks}
        onClose={() => setShowRecurringBlocks(false)}
        onSave={fetchData}
      />
      <OverrideModal isOpen={showOverride} onClose={() => setShowOverride(false)} onOverride={fetchData} />
      <ReviewModal isOpen={showReview} onClose={() => setShowReview(false)} onSave={fetchData} />
    </div>
  );
}
