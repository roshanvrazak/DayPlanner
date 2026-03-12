"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { addDays, startOfWeek, format } from "date-fns";
import WeeklyView from "@/components/WeeklyView";
import BacklogSidebar from "@/components/BacklogSidebar";
import FocusMode from "@/components/FocusMode";
import AddTaskModal from "@/components/AddTaskModal";

interface Task {
  id: string;
  title: string;
  duration: number;
  priority: number;
  deadline: string | null;
  status: string;
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

export default function Home() {
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockWithTask[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [todayLocked, setTodayLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [focusMode, setFocusMode] = useState<{
    isOpen: boolean;
    blockId: string;
    taskTitle: string;
    duration: number;
  }>({ isOpen: false, blockId: "", taskTitle: "", duration: 0 });
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, blocksRes, lockRes, streakRes] = await Promise.all([
        fetch("/api/tasks?status=BACKLOG"),
        fetch("/api/timeblocks"),
        fetch("/api/lock"),
        fetch("/api/streak"),
      ]);

      const tasks = await tasksRes.json();
      const blocks = await blocksRes.json();
      const lockData = await lockRes.json();
      const streakData = await streakRes.json();

      setBacklogTasks(Array.isArray(tasks) ? tasks : []);
      setTimeBlocks(Array.isArray(blocks) ? blocks : []);
      setTodayLocked(lockData.locked || false);
      setStreak(streakData.streak || 0);
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

      if (data.success) {
        // Re-fetch all data to get updated state
        await fetchData();
      }
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
  }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          userId: "default-user",
          deadline: task.deadline || null,
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBacklogTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Complete a time block
  const handleComplete = async (blockId: string) => {
    try {
      const res = await fetch(`/api/timeblocks/${blockId}/complete`, {
        method: "PATCH",
      });

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
  const handleFocusClick = (
    blockId: string,
    title: string,
    duration: number
  ) => {
    setFocusMode({ isOpen: true, blockId, taskTitle: title, duration });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-8 h-8 border-2 border-stone-200 border-t-violet-500 
                       rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-stone-400">Loading your week...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gradient-subtle">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
            DayPlanner
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Week of {format(weekStart, "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Streak */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                         bg-amber-50 border border-amber-100"
            >
              <span className="text-sm">🔥</span>
              <span className="text-xs font-semibold text-amber-700">
                {streak}
              </span>
            </motion.div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span>
              <span className="font-semibold text-stone-600">
                {timeBlocks.filter((b) => b.completed).length}
              </span>
              /{timeBlocks.length} blocks done
            </span>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Weekly view */}
        <WeeklyView
          days={days}
          timeBlocks={timeBlocks}
          todayLocked={todayLocked}
          onFocusClick={handleFocusClick}
          onComplete={handleComplete}
        />

        {/* Backlog sidebar */}
        <BacklogSidebar
          tasks={backlogTasks}
          isScheduling={isScheduling}
          streak={streak}
          onPlanWeek={handlePlanWeek}
          onAddTask={() => setShowAddModal(true)}
          onDeleteTask={handleDeleteTask}
        />
      </div>

      {/* Add task modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTask}
      />

      {/* Focus mode */}
      <FocusMode
        isOpen={focusMode.isOpen}
        blockId={focusMode.blockId}
        taskTitle={focusMode.taskTitle}
        durationMinutes={focusMode.duration}
        onClose={() =>
          setFocusMode({ isOpen: false, blockId: "", taskTitle: "", duration: 0 })
        }
        onComplete={handleComplete}
      />
    </div>
  );
}
