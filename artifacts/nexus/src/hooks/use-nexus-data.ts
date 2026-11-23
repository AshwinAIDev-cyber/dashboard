import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getListGoalsQueryKey,
  getListTasksQueryKey,
  useCreateGoal,
  useCreateTask,
  useDeleteGoal,
  useDeleteTask,
  useListGoals,
  useListTasks,
  useUpdateGoal,
  useUpdateTask,
  type Goal,
  type Task,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { levelFromXp, totalXp } from "@/lib/game";

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const tasksKey = getListTasksQueryKey();
const goalsKey = getListGoalsQueryKey();

export function useTasks() {
  return useListTasks({ query: { queryKey: tasksKey, staleTime: 15_000 } });
}

export function useGoals() {
  return useListGoals({ query: { queryKey: goalsKey, staleTime: 15_000 } });
}

/** Operator XP + level derived from completed tasks and quest progress. */
export function useOperatorProgress() {
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  return useMemo(() => {
    const xp = totalXp(tasks, goals);
    return { xp, ...levelFromXp(xp) };
  }, [tasks, goals]);
}

type Snapshot<T> = { previous: T[] | undefined };

/* ---------------------------------------------------------------- tasks */

export function useTaskMutations() {
  const qc = useQueryClient();

  const patchCache = (id: number, patch: Partial<Task>) =>
    qc.setQueryData<Task[]>(tasksKey, (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const create = useCreateTask({
    mutation: {
      onSuccess: (task) => {
        qc.setQueryData<Task[]>(tasksKey, (old) => [task, ...(old ?? []).filter((t) => t.id !== task.id)]);
      },
      onError: (error) => toast.error("Mission not logged", { description: errorMessage(error) }),
      onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
    },
  });

  const update = useUpdateTask<ApiError, Snapshot<Task>>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await qc.cancelQueries({ queryKey: tasksKey });
        const previous = qc.getQueryData<Task[]>(tasksKey);
        const patch: Partial<Task> = { ...data };
        if (data.completed !== undefined) {
          patch.completedAt = data.completed ? new Date().toISOString() : null;
        }
        patchCache(id, patch);
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) qc.setQueryData(tasksKey, context.previous);
        toast.error("Update failed", { description: errorMessage(error) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
    },
  });

  const remove = useDeleteTask<ApiError, Snapshot<Task>>({
    mutation: {
      onMutate: async ({ id }) => {
        await qc.cancelQueries({ queryKey: tasksKey });
        const previous = qc.getQueryData<Task[]>(tasksKey);
        qc.setQueryData<Task[]>(tasksKey, (old) => old?.filter((t) => t.id !== id));
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) qc.setQueryData(tasksKey, context.previous);
        toast.error("Could not scrub mission", { description: errorMessage(error) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
    },
  });

  return { create, update, remove };
}

/* ---------------------------------------------------------------- goals */

export function useGoalMutations() {
  const qc = useQueryClient();

  const create = useCreateGoal({
    mutation: {
      onSuccess: (goal) => {
        qc.setQueryData<Goal[]>(goalsKey, (old) => [goal, ...(old ?? []).filter((g) => g.id !== goal.id)]);
      },
      onError: (error) => toast.error("Quest not created", { description: errorMessage(error) }),
      onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
    },
  });

  const update = useUpdateGoal<ApiError, Snapshot<Goal>>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await qc.cancelQueries({ queryKey: goalsKey });
        const previous = qc.getQueryData<Goal[]>(goalsKey);
        qc.setQueryData<Goal[]>(goalsKey, (old) =>
          old?.map((g) => {
            if (g.id !== id) return g;
            const target = data.target ?? g.target;
            const progress = Math.min(Math.max(data.progress ?? g.progress, 0), target);
            return { ...g, ...data, target, progress };
          }),
        );
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) qc.setQueryData(goalsKey, context.previous);
        toast.error("Quest update failed", { description: errorMessage(error) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
    },
  });

  const remove = useDeleteGoal<ApiError, Snapshot<Goal>>({
    mutation: {
      onMutate: async ({ id }) => {
        await qc.cancelQueries({ queryKey: goalsKey });
        const previous = qc.getQueryData<Goal[]>(goalsKey);
        qc.setQueryData<Goal[]>(goalsKey, (old) => old?.filter((g) => g.id !== id));
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) qc.setQueryData(goalsKey, context.previous);
        toast.error("Could not abandon quest", { description: errorMessage(error) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: goalsKey }),
    },
  });

  return { create, update, remove };
}
