import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys, Task, TimeBlockWithTask } from "./queries";

// ─── useCreateTask ─────────────────────────────────────────────────────────

interface CreateTaskInput {
  title: string;
  duration: number;
  priority: number;
  deadline: string | null;
  notes: string | null;
  subtasks: { title: string }[];
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create task");
        }
        return res.json();
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
      toast.success(`"${variables.title}" added to backlog`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── useDeleteTask ─────────────────────────────────────────────────────────

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tasks/${id}`, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) throw new Error("Failed to delete task");
      }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.tasks() });
      const snapshot = qc.getQueryData<Task[]>(queryKeys.tasks("BACKLOG"));
      qc.setQueryData<Task[]>(queryKeys.tasks("BACKLOG"), (prev) =>
        prev ? prev.filter((t) => t.id !== id) : []
      );
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot) {
        qc.setQueryData(queryKeys.tasks("BACKLOG"), context.snapshot);
      }
      toast.error("Failed to delete task");
    },
    onSuccess: (_data, _id, context) => {
      const deleted = context?.snapshot?.find((t) => t.id === _id);
      if (deleted) toast.success(`"${deleted.title}" deleted`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
}

// ─── useSchedule ──────────────────────────────────────────────────────────

export function useSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error || "Failed to schedule tasks");
        return data as { success: boolean; blocksCreated: number };
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
      qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
      toast.success(`Scheduled ${data.blocksCreated} time blocks`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── useCompleteBlock ──────────────────────────────────────────────────────

export function useCompleteBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      fetch(`/api/timeblocks/${blockId}/complete`, { method: "PATCH" }).then(
        async (res) => {
          if (!res.ok) throw new Error("Failed to complete block");
          return res.json();
        }
      ),
    onMutate: async (blockId: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.timeblocks() });
      const snapshot = qc.getQueryData<TimeBlockWithTask[]>(
        queryKeys.timeblocks()
      );
      qc.setQueryData<TimeBlockWithTask[]>(queryKeys.timeblocks(), (prev) =>
        prev
          ? prev.map((b) => (b.id === blockId ? { ...b, completed: true } : b))
          : []
      );
      return { snapshot };
    },
    onError: (_err, _blockId, context) => {
      if (context?.snapshot) {
        qc.setQueryData(queryKeys.timeblocks(), context.snapshot);
      }
      toast.error("Failed to mark block as complete");
    },
    onSuccess: () => {
      toast.success("Block marked complete");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
      qc.invalidateQueries({ queryKey: queryKeys.streak() });
    },
  });
}

// ─── useRollover ──────────────────────────────────────────────────────────

export function useRollover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetch("/api/rollover", { method: "POST" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
      qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
    },
  });
}

// ─── useGenerateRecurring ──────────────────────────────────────────────────

export function useGenerateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/recurring-tasks/generate", { method: "POST" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
}

// ─── useAssignTask ─────────────────────────────────────────────────────────

interface AssignTaskInput {
  taskId: string;
  date: string;
  taskTitle?: string;
}

export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, date }: AssignTaskInput) =>
      fetch("/api/timeblocks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No available slot on this day");
        return data;
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks() });
      qc.invalidateQueries({ queryKey: queryKeys.timeblocks() });
      if (variables.taskTitle) {
        toast.success(`"${variables.taskTitle}" scheduled`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
