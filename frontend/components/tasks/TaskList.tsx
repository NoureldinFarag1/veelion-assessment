import type { Task } from "@/types/api";
import { TaskItem } from "@/components/tasks/TaskItem";

type TaskListProps = {
  tasks: Task[];
  hasAnyTasks: boolean;
  updatingTaskId: string;
  onToggle: (task: Task) => void;
};

export function TaskList({ tasks, hasAnyTasks,updatingTaskId, onToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <section className="card" style={{ padding: "1rem" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {hasAnyTasks ? "No tasks match this filter." : "No tasks yet."}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Task list">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.7rem" }}>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} busy={updatingTaskId === task.id} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}
