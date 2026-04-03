"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { useDebounce } from "@/hooks/useDebounce";

function DraggableWrapper({ id, enabled, children }: { id: string; enabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled: !enabled });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: enabled ? "grab" : "default" }}
    >
      {children}
    </div>
  );
}

interface BacklogTask {
  id: string;
  title: string;
  duration: number;
  priority: number;
  deadline: string | null;
  status: string;
}

interface BacklogSidebarProps {
  tasks: BacklogTask[];
  isScheduling: boolean;
  streak: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onPlanWeek: () => void;
  onAddTask: () => void;
  onDeleteTask: (id: string) => void;
  draggable?: boolean;
}

export default function BacklogSidebar({
  tasks,
  isScheduling,
  streak,
  isCollapsed,
  onToggleCollapse,
  onPlanWeek,
  onAddTask,
  onDeleteTask,
  draggable,
}: BacklogSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredTasks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, debouncedSearch]);

  return (
    <motion.aside
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isCollapsed ? 48 : 288 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="shrink-0 flex flex-col bg-white/60 rounded-2xl card-shadow overflow-hidden
                 hidden lg:flex"
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-center py-3 hover:bg-stone-50
                   transition-colors duration-200 text-stone-400 hover:text-stone-600"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.svg
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </motion.svg>
      </button>

      {isCollapsed ? (
        /* Collapsed state: show task count */
        <div className="flex-1 flex flex-col items-center gap-3 pt-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-stone-500">{tasks.length}</span>
          </div>
          {streak > 0 && (
            <div className="text-sm">🔥</div>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-stone-700">Backlog</h2>
              <span className="text-[11px] text-stone-400 font-medium">
                {tasks.length} tasks
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Unscheduled tasks waiting to be planned
            </p>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-100/60">
              <span className="text-base">🔥</span>
              <div>
                <p className="text-xs font-semibold text-amber-700">
                  {streak} day streak!
                </p>
                <p className="text-[10px] text-amber-500">Keep it going</p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-stone-100
                           bg-stone-50/70 text-xs text-stone-700
                           placeholder:text-stone-300
                           focus:outline-none focus:ring-2 focus:ring-violet-100
                           focus:border-violet-200 transition-all duration-200"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-3 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlanWeek}
              disabled={isScheduling || tasks.length === 0}
              className={`
                flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold
                transition-all duration-300
                ${
                  isScheduling || tasks.length === 0
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-200/50 hover:shadow-violet-300/60"
                }
              `}
            >
              {isScheduling ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Planning...
                </span>
              ) : (
                "Plan My Week"
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddTask}
              className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200/80
                         text-stone-500 flex items-center justify-center
                         transition-colors duration-200"
              title="Add task"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </motion.button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <DraggableWrapper key={task.id} id={task.id} enabled={!!draggable}>
                    <div className="group relative">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        duration={task.duration}
                        priority={task.priority}
                        deadline={task.deadline}
                        status={task.status}
                      />
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100
                                   transition-opacity w-5 h-5 rounded-full bg-red-100
                                   text-red-400 hover:text-red-600 hover:bg-red-200
                                   flex items-center justify-center text-[10px]"
                        title="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  </DraggableWrapper>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                    <span className="text-lg">{searchQuery ? "🔍" : "📋"}</span>
                  </div>
                  <p className="text-xs text-stone-400 font-medium">
                    {searchQuery ? "No tasks match" : "Backlog empty"}
                  </p>
                  <p className="text-[10px] text-stone-300 mt-1">
                    {searchQuery ? `"${searchQuery}"` : "Add tasks to get started"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.aside>
  );
}
