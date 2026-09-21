# Backend API Endpoints

Base URL: `http://localhost:4000`

## Shared Error Shape

```ts
type ErrorResponse = {
  error: {
    message: string;
  };
};
```

## Task Endpoints

### GET /tasks

Fetch all tasks.

```ts
type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

type GetTasksResponse = {
  data: Task[];
};
```

### GET /tasks/:id

Fetch one task by ID.

```ts
type GetTaskResponse = {
  data: Task;
};
```

Possible errors:
- `404` when task does not exist.

### POST /tasks

Create a task.

```ts
type CreateTaskRequest = {
  title: string; // required, trimmed, non-empty
  completed?: boolean; // default false
};

type CreateTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is not an object.
- `400` when title is missing/invalid/empty.
- `400` when completed is not a boolean.

### PATCH /tasks/:id

Update task title or status.

```ts
type PatchTaskRequest = {
  title?: string; // if provided, must be string and long enough after trim
  completed?: boolean;
};

type PatchTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is invalid.
- `400` when no supported fields are provided.
- `404` when task does not exist.

### DELETE /tasks/:id

Delete task by ID.

```ts
type DeleteTaskResponse = void; // status 204
```

Possible errors:
- `404` when task does not exist.

## Activity Endpoints

### GET /activity

Fetch activity logs.

```ts
type ActivityLog = {
  id: string;
  action?: string;
  info?: string;
  when: string; // ISO datetime
};

type GetActivityResponse = ActivityLog[];
```

### POST /activity

Create activity log entry.

```ts
type CreateActivityRequest = {
  action?: string;
  info?: string;
};

type CreateActivityResponse = ActivityLog;
```

Notes:
- `action` and `info` are currently not validated by backend.
- Response shape for activity endpoints is raw objects/arrays (not wrapped in `data`).

## Reports Endpoints

### GET /reports/tasks-summary

Fetch summary statistics for tasks and activity.

```ts
type TasksSummary = {
  total: number;
  byStatus: {
    todo: number;
    "in-progress": number;
    done: number;
  };
  recentActivityCount: number;
};

type GetTasksSummaryResponse = TasksSummary;
```

Notes:
- `in-progress` is currently returned as `0` because task data only includes boolean `completed`.
- Response shape is raw object.
