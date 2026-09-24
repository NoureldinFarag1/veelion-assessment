import { BACKEND_BASE_URL } from "@/lib/constants";
import { UNREACHABLE, TIMED_OUT, BackendError } from "@/lib/backendError";
import type { ActivityLog, ErrorResponse, ReportsSummary,Task, TaskResponse, TasksResponse } from "@/types/api";

const REQUEST_TIMEOUT_MS = 8000;
function buildBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}
async function readErrorMessage(response: Response): Promise<string>{
  try{
      const body = (await response.json()) as ErrorResponse;
      return body.error?.message || `Request failed with status ${response.status}`;
  } catch{
    return `Request failed with status ${response.status}`;
  }
}

async function callBackend<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try{
    response = await fetch(buildBackendUrl(path), {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  } catch(error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      const detail = error instanceof Error ? error.message : "unknown fetch failure";

      throw new BackendError(
        timedOut ? 504: 502,
        `Backend request to ${path} failed: ${detail}`,
        timedOut ? TIMED_OUT : UNREACHABLE,
      );
  }
  if(!response.ok)
  {
    const message = await readErrorMessage(response);
    const isClientError = response.status >= 400 && response.status < 500;

    throw new BackendError(
      isClientError ? response.status : 502,
      `Backend responded ${response.status} for ${path}: ${message}`,
      isClientError ? message : UNREACHABLE
    );
  }
  return (await response.json()) as T;
}

export async function getTasksFromBackend(): Promise<Task[]> {
  const body = await callBackend<TasksResponse>("/tasks");
  return body.data;
}

export async function updateTaskInBackend(taskId: string, completed: boolean): Promise<Task> {
  const body = await callBackend<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({completed}),
  });

  return body.data;
}

export async function getActivityFromBackend(): Promise<ActivityLog[]> {
  return callBackend<ActivityLog[]>("/activity");
}

export async function getReportsSummaryFromBackend(): Promise<ReportsSummary> {
  return callBackend<ReportsSummary>("/reports/tasks-summary");
}
