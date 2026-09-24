"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ErrorResponse, Task, TaskFilter, TaskResponse, TasksResponse } from "@/types/api";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

// Reading the error body is its own try, so a non-JSON body falls back to the status
// instead of surfacing a parser message to the user.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error?.message || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [updateError, setUpdateError] = useState<string>("");
  const [updatingTaskId, setUpdatingTaskId] = useState<string>("");

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      setUpdateError("");

      const body = await requestJson<TasksResponse>("/api/tasks", {
        method: "GET",
      });

      setTasks(body.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load tasks right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, completed: boolean) => {
    try {
      setUpdatingTaskId(taskId);
      setUpdateError("");

      const body = await requestJson<TaskResponse>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });

      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? body.data : task))
      );
    } catch (error) {
      setUpdateError(getErrorMessage(error, "Could not update task status."));
    } finally {
      setUpdatingTaskId("");
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    if (filter === "pending") {
      return tasks.filter((task) => !task.completed);
    }

    return tasks;
  }, [tasks, filter]);

  return {
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
  };
}