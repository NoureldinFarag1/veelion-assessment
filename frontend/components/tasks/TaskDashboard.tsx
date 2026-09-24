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
      <header className="card">
        <h1 className="page-title">Task Dashboard</h1>
      </header>

      <StatusFilter value={filter} onChange={setFilter} />

      {loading ? (
        <section className="card">
          <p style={{ margin: 0 }}>Loading tasks...</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="card card-error">
          <p>{loadError}</p>
          <button type="button" className="button" onClick={fetchTasks}>
            Retry
          </button>
        </section>
      ) : null}

      {updateError ? (
        <section className="card card-error">
          <p>{updateError}</p>
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