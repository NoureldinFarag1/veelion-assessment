import type { Task } from "@/types/api";
import { taskStatusLabel } from "@/lib/taskStatus";

type TaskItemProps = {
  task: Task;
  busy: boolean;
  onToggle: (task: Task) => void;
};

export function TaskItem({ task, busy, onToggle }: TaskItemProps) {
  return (
    <li className="card task-item">
      <div className="row" style={{ alignItems: "start" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{task.title}</p>
        <span className={task.completed ? "badge done" : "badge"}>{taskStatusLabel(task)}</span>
      </div>

      <small className="muted">Updated: {new Date(task.updatedAt).toLocaleString()}</small>

      <div>
        <button
          type="button"
          className="button"
          onClick={() => onToggle(task)}
          disabled={busy}
          aria-label={`Mark ${task.title} as ${task.completed ? "pending" : "completed"}`}
        >
          {busy ? "Saving..." : task.completed ? "Mark as Pending" : "Mark as Completed"}
        </button>
      </div>
    </li>
  );
}
