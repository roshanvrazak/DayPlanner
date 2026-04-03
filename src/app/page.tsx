"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
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

import {
  useTasks,
  useTimeBlocks,
  useRecurringBlocks,
  useStreak,
  useLockStatus,
  queryKeys,
  type Task,
  type Subtask,
} from "@/hooks/queries";
import {
  useCreateTask,
  useDeleteTask,
  useSchedule,
  useCompleteBlock,
  useRollover,
  useGenerateRecurring,
  useAssignTask,
} from "@/hooks/mutations";

import WeeklyView from "@/components/WeeklyView";
import DailyView from "@/components/DailyView";
import MonthlyView from "@/components/MonthlyView";
import BacklogSidebar from "@/components/BacklogSidebar";
import DraggableTaskOverlay from "@/components/DragOverlay";

// Modals are never needed on initial render — lazy-load to keep the initial bundle small
const FocusMode = lazy(() => import("@/components/FocusMode"));
const AddTaskModal = lazy(() => import("@/components/AddTaskModal"));
const SettingsModal = lazy(() => import("@/components/SettingsModal"));
const RecurringBlocksModal = lazy(() => import("@/components/RecurringBlocksModal"));
const RecurringTasksModal = lazy(() => import("@/components/RecurringTasksModal"));
const OverrideModal = lazy(() => import("@/components/OverrideModal"));
const ReviewModal = lazy(() => import("@/components/ReviewModal"));

type ViewMode = "daily" | "weekly" | "monthly";

export default function Home() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  // ── Server state (via React Query) ──────────────────────────────────────
  const { data: backlogTasks = [], isLoading: tasksLoading } = useTasks("BACKLOG");
  const { data: timeBlocks = [], isLoading: blocksLoading } = useTimeBlocks();
  const { data: recurringBlocks = [] } = useRecurringBlocks();
  const { data: streakData } = useStreak();
  const { data: lockData } = useLockStatus();

  const streak = streakData?.streak ?? 0;
  const todayLocked = lockData?.locked ?? false;
  const loading = tasksLoading || blocksLoading;

  // ── Mutations ────────────────────────────────────────────────────────────
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const schedule = useSchedule();
  const completeBlock = useCompleteBlock();
  const rollover = useRollover();
  const generateRecurring = useGenerateRecurring();
  const assignTask = useAssignTask();

  // ── Initial load: rollover + generate recurring (once per mount) ─────────
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    rollover.mutate();
    generateRecurring.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI state ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecurringBlocks, setShowRecurringBlocks] = useState(false);
  const [showRecurringTasks, setShowRecurringTasks] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [focusMode, setFocusMode] = useState<{
    isOpen: boolean;
    blockId: string | null;
    taskTitle: string;
    duration: number;
    notes: string | null;
    subtasks: Subtask[];
  }>({ isOpen: false, blockId: null, taskTitle: "", duration: 0, notes: null, subtasks: [] });

  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Derived date values ───────────────────────────────────────────────────
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Navigation ────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddTask = (task: {
    title: string;
    duration: number;
    priority: number;
    deadline: string;
    notes: string;
    subtasks: { title: string }[];
  }) => {
    createTask.mutate({
      ...task,
      deadline: task.deadline || null,
      notes: task.notes || null,
    });
  };

  const handleFocusClick = (blockId: string | null, title: string, duration: number) => {
    const block = blockId ? timeBlocks.find((b) => b.id === blockId) : null;
    setFocusMode({
      isOpen: true,
      blockId,
      taskTitle: title,
      duration,
      notes: block?.task?.notes || null,
      subtasks: block?.task?.subtasks || [],
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = backlogTasks.find((t) => t.id === event.active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const task = activeDragTask;
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    assignTask.mutate({
      taskId: String(active.id),
      date: String(over.id),
      taskTitle: task?.title,
    });
  };

  // ── Loading screen ────────────────────────────────────────────────────────
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
          {session?.user && (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center
                           text-xs font-bold uppercase select-none"
                title={session.user.name || session.user.email || ""}
              >
                {(session.user.name || session.user.email || "?").slice(0, 2)}
              </div>
              <span className="text-xs font-medium text-stone-600 hidden sm:inline max-w-[100px] truncate">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-stone-400 hover:text-stone-600
                           hover:bg-stone-100 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          )}

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
            onClick={() => setShowRecurringTasks(true)}
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-400
                       hover:text-stone-600 flex items-center justify-center transition-colors duration-200"
            title="Recurring tasks"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
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
          {viewMode === "weekly" && (
            <WeeklyView
              days={days}
              timeBlocks={timeBlocks}
              recurringBlocks={recurringBlocks}
              todayLocked={todayLocked}
              onFocusClick={handleFocusClick}
              onComplete={(id) => completeBlock.mutate(id)}
            />
          )}

          {viewMode === "daily" && (
            <DailyView
              day={selectedDate}
              timeBlocks={timeBlocks}
              recurringBlocks={recurringBlocks}
              todayLocked={todayLocked}
              onFocusClick={handleFocusClick}
              onComplete={(id) => completeBlock.mutate(id)}
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

          <BacklogSidebar
            tasks={backlogTasks}
            isScheduling={schedule.isPending}
            streak={streak}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onPlanWeek={() => schedule.mutate()}
            onAddTask={() => setShowAddModal(true)}
            onDeleteTask={(id) => deleteTask.mutate(id)}
            draggable
          />

          <div className="flex gap-2 lg:hidden">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => schedule.mutate()}
              disabled={schedule.isPending || backlogTasks.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold
                         bg-gradient-to-r from-violet-500 to-purple-500 text-white
                         shadow-lg shadow-violet-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {schedule.isPending ? "Planning..." : "Plan My Week"}
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

      {/* Modals — lazy-loaded, so wrap in a single Suspense boundary */}
      <Suspense fallback={null}>
      <AddTaskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddTask} />

      <FocusMode
        isOpen={focusMode.isOpen}
        blockId={focusMode.blockId}
        taskTitle={focusMode.taskTitle}
        durationMinutes={focusMode.duration}
        notes={focusMode.notes}
        subtasks={focusMode.subtasks}
        onClose={() =>
          setFocusMode({ isOpen: false, blockId: null, taskTitle: "", duration: 0, notes: null, subtasks: [] })
        }
        onComplete={(id) => completeBlock.mutate(id)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => qc.invalidateQueries({ queryKey: queryKeys.settings() })}
      />
      <RecurringBlocksModal
        isOpen={showRecurringBlocks}
        onClose={() => setShowRecurringBlocks(false)}
        onSave={() => qc.invalidateQueries({ queryKey: queryKeys.recurringBlocks() })}
      />
      <RecurringTasksModal
        isOpen={showRecurringTasks}
        onClose={() => setShowRecurringTasks(false)}
        onSave={() => qc.invalidateQueries({ queryKey: queryKeys.tasks() })}
      />
      <OverrideModal
        isOpen={showOverride}
        onClose={() => setShowOverride(false)}
        onOverride={() => {
          qc.invalidateQueries({ queryKey: queryKeys.lock() });
          qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
        }}
      />
      <ReviewModal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        onSave={() => {
          qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
          qc.invalidateQueries({ queryKey: queryKeys.tasks() });
        }}
      />
      </Suspense>
    </div>
  );
}
