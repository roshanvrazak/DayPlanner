import { useQuery } from "@tanstack/react-query";

// ─── Shared fetch helper ───────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  duration: number;
  priority: number;
  deadline: string | null;
  notes: string | null;
  status: string;
  subtasks: Subtask[];
}

export interface TimeBlockWithTask {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isLocked: boolean;
  completed: boolean;
  task: Task;
}

export interface RecurringBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  color: string | null;
}

export interface Settings {
  name: string | null;
  dayStartTime: string;
  dayEndTime: string;
  strictMode: boolean;
  overridePhrase: string;
}

// ─── Query keys (centralised to avoid typos) ──────────────────────────────

export const queryKeys = {
  tasks: (status?: string) => (status ? ["tasks", status] : ["tasks"]),
  timeblocks: () => ["timeblocks"],
  recurringBlocks: () => ["recurringBlocks"],
  settings: () => ["settings"],
  streak: () => ["streak"],
  lock: () => ["lock"],
};

// ─── Query hooks ──────────────────────────────────────────────────────────

export function useTasks(status = "BACKLOG") {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(status),
    queryFn: () => fetchJson<Task[]>(`/api/tasks?status=${status}`),
    staleTime: 30_000,
  });
}

export function useTimeBlocks() {
  return useQuery<TimeBlockWithTask[]>({
    queryKey: queryKeys.timeblocks(),
    queryFn: () => fetchJson<TimeBlockWithTask[]>("/api/timeblocks"),
    staleTime: 30_000,
  });
}

export function useRecurringBlocks() {
  return useQuery<RecurringBlock[]>({
    queryKey: queryKeys.recurringBlocks(),
    queryFn: () => fetchJson<RecurringBlock[]>("/api/recurring-blocks"),
    staleTime: 5 * 60_000,
  });
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: queryKeys.settings(),
    queryFn: () => fetchJson<Settings>("/api/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useStreak() {
  return useQuery<{ streak: number }>({
    queryKey: queryKeys.streak(),
    queryFn: () => fetchJson<{ streak: number }>("/api/streak"),
    staleTime: 60_000,
  });
}

export function useLockStatus() {
  return useQuery<{ locked: boolean }>({
    queryKey: queryKeys.lock(),
    queryFn: () => fetchJson<{ locked: boolean }>("/api/lock"),
    staleTime: 60_000,
  });
}
