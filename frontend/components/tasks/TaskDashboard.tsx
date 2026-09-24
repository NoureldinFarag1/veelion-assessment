"use client";

import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/api";
import { StatusFilter } from "@/components/tasks/StatusFilter";
import { TaskList } from "@/components/tasks/TaskList";

export function TaskDashboard() {
  const {
    tasks,
    filteredTasks,
    filter,
    loading,
    loadError,
    updateError,
    updatingTaskId,
    setFilter,
    fetchTasks,
    updateTaskStatus,
  } = useTasks();

  const handleToggle = (task: Task) => {
    updateTaskStatus(task.id, !task.completed);
  };

  return (
    <section className="stack">
      <header className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Task Dashboard</h1>
      </header>

      <StatusFilter value={filter} onChange={setFilter} />

      {loading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p style={{ margin: 0 }}>Loading tasks...</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="card" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{loadError}</p>
          <button type="button" className="button" onClick={fetchTasks}>
            Retry
          </button>
        </section>
      ) : null}

      {/* A failed save keeps the list on screen. Only a failed load replaces it. */}
      {updateError ? (
        <section className="card" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ margin: 0, color: "var(--danger)" }}>{updateError}</p>
        </section>
      ) : null}

      {!loading && !loadError ? (
        <TaskList
          tasks={filteredTasks}
          hasAnyTasks={tasks.length > 0}
          updatingTaskId={updatingTaskId}
          onToggle={handleToggle}
        />
      ) : null}
    </section>
  );
}