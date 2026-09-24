import type { Task, TaskFilter} from "@/types/api";

export const TASK_STATUS_LABELS = {
  completed: "Completed",
  pending: "Pending",
} as const;
export function taskStatusLabel(task: Pick<Task, "completed">): string {
  return task.completed ? TASK_STATUS_LABELS.completed : TASK_STATUS_LABELS.pending;
}
export const TASK_FILTERS: Array<{ label: string; value: TaskFilter }> = [
  { label: "All", value: "all" },
  { label: TASK_STATUS_LABELS.completed, value: "completed" },
  { label: TASK_STATUS_LABELS.pending, value: "pending" },
];