# Backend Code Review

## How I reviewed this

I didn't start by reading the code. I ran every endpoint first (Postman for the normal and edge cases, `curl` for concurrent requests) and wrote down what actually happened. Then I read every file and tied each symptom back to the line that causes it. Where a finding is backed by a real request, I've included the evidence.

I also checked how the frontend uses this API before deciding what to change, because this code is treated as already in production. Anything that would break an existing client is called out explicitly.

Severity scale:

| Severity | Meaning |
|---|---|
| High | Data loss, data corruption, or a client can change data it shouldn't |
| Medium | Wrong behavior or a real maintenance risk, but no data loss |
| Low | Worth fixing, low impact today |

Finding IDs (B1, S1, ...) are referenced in commit messages so every change can be traced back to a finding.

## Strengths

It's not all bad, and I didn't want to change things just for the sake of it.

* `server.js` and `app.js` are separated, so the app can be tested without starting a server.
* There's a catch all 404 handler and a single central error handler with one consistent error shape.
* The error handler hides internal messages for 500 errors and checks `headersSent`.
* Routers are split by module, and the Tasks module has a clear routes, controller, service layering.
* `jsonStore` is async, shared, and handles an empty file.
* ID generation is centralized in `utils/id.js` and uses UUIDs.
* `buildTaskRecord` whitelists fields on create, which is why POST can't be used to inject an `id`.
* `taskValidator.js` is well designed: field whitelist, normalization, and error details. It just isn't used (see M1).

The Activity module is the exception. Honestly, its only strength is that it doesn't lose data under concurrent writes, and that's by accident (see B1 and P1).

## Bugs

### B1. Concurrent writes lose data or corrupt the file (High)

**Where:** `src/utils/jsonStore.js`, used by `tasks.service.js`

**What's wrong:** There are two problems here.

1. Every write reads the whole file, waits, changes the array in memory, then writes the whole file back. When requests overlap, they all read the same old version and the last write wins, so the others disappear.
2. Overlapping `fs.writeFile` calls on the same file aren't safe. Each one truncates the file and writes, and when they run at the same time their output can interleave. The result is a file that isn't valid JSON anymore. Because `readJsonArray` rethrows parse errors (see B2), every endpoint that touches that file then returns 500 until someone repairs it by hand.

**Evidence:** I sent 6 `POST /tasks` requests at the same time. All 6 got `201 Created`, but only 3 were stored. The exact number changes from run to run, which is typical for a race.

**Why it matters:** At best it's silent data loss (the client is told the task was created and it's gone). At worst the whole data file is corrupted and the API stops working.

**Fix:** Serialize writes inside `jsonStore` with a simple in process write queue, so every module gets the protection automatically. Combined with atomic writes (B3), a write either fully happens or doesn't happen at all. This only protects a single process. Running more than one instance would need file locking or a real database, which is outside the "JSON files only" constraint, so I'm documenting that limit rather than pretending it's solved.

### B2. A file with the wrong shape gets silently wiped (High)

**Where:** `src/utils/jsonStore.js`, `readJsonArray`

**What's wrong:** If the file contains valid JSON that isn't an array, `readJsonArray` returns `[]`. The next write then saves `[newItem]` over whatever was in the file. Invalid JSON, on the other hand, throws and returns a 500. Two failures, two different rules.

**Why it matters:** It looks like defensive coding, but it turns a recoverable problem into permanent data loss.

**Fix:** Fail loudly in both cases (throw, return 500, log it) and never overwrite a file that couldn't be read correctly.

### B3. Writes aren't atomic (Medium)

**Where:** `src/utils/jsonStore.js`, `writeJsonArray`, and `activity.service.js`

**What's wrong:** `writeFile` empties the file first and then writes the new content. If the process is killed or crashes in between, the file is left truncated. There's also no graceful shutdown handling in `server.js`, so a normal restart can interrupt a write.

**Why it matters:** One badly timed restart corrupts the whole data file. It's the same weakness that makes the corruption in B1 possible.

**Fix:** Write to a temporary file in the same folder, then `rename` it over the original. A rename on the same disk is atomic.

### B4. The default port doesn't match anything else (Medium)

**Where:** `src/server.js`

**What's wrong:** The code defaults to port 3000. The frontend expects 4000 everywhere: `.env.example`, the fallback in `lib/constants.ts`, and `docs/backend-endpoints.md`. Next.js also uses 3000 by default, so running both locally makes them collide.

**Fix:** Default to 4000 and keep `PORT` as the override.

### B5. The title rules differ between create and update (Medium)

**Where:** `tasks.controller.js`, `tasks.service.js`

**What's wrong:** `PATCH` rejects titles shorter than 2 characters, but `POST` accepts `"a"`. Also, a `PATCH` with `"title": " "` is trimmed to `""`, passes the "nothing to update" check because `""` isn't `undefined`, and is only stopped by the length rule by coincidence. Remove that rule and empty titles get saved.

**Fix:** One rule, in one place (see M1 and D2).

### B6. The data path depends on where the server was started (Medium)

**Where:** `tasks.service.js`, `activity.service.js`

**What's wrong:** Both build the data path from `process.cwd()`. Starting the server from the repo root instead of `backend/` points at a folder that doesn't exist. Reads and writes both fail with a 500, because even a read tries to create the missing file.

**Fix:** Resolve the path relative to the source file (`__dirname`) or read it from config.

### B7. Activity accepts anything (Medium)

**Where:** `activity.controller.js`, `activity.service.js`

**What's wrong:** There's no validation at all.

**Evidence:** `POST /activity` with `{}`, with no body, and with `{"action": 123, "info": {"nested": true}}` all returned `201`. The first two stored records with no `action` or `info` keys at all. The third stored a number and an object.

**Why it matters:** Anything reading the log has to defend against junk, and the Reports API would count empty entries as real activity.

**Fix:** Add an `activityValidator` that follows the same pattern as `taskValidator` (see D3 for the rules).

### B8. Activity IDs can collide (Medium)

**Where:** `activity.service.js`

**What's wrong:** IDs are `String(Date.now())`. Two entries created in the same millisecond get the same ID, which is easy to hit with concurrent requests. Once duplicate IDs are in a log there's no clean way to fix them afterwards. The project already has `createId()`, which uses UUIDs, and Activity ignores it.

**Fix:** Use `createId()`. Existing IDs stay as they are, since they're only strings.

### B9. PATCH validates before checking the task exists (Low)

**Where:** `tasks.service.js`, `updateTask`

**What's wrong:** The length check runs before the lookup, so `PATCH /tasks/does-not-exist` with `{"title": "a"}` returns `400 Title is too short.` instead of `404`.

**Fix:** Moving validation into the controller (M1) fixes this as a side effect. Invalid input is still a 400, and a missing task with valid input is a 404.

## Security

### S1. PATCH lets a client overwrite protected fields (High)

**Where:** `tasks.service.js`, `updateTask`: `{ ...existingTask, ...updates }`

**What's wrong:** The controller only checks that `title` or `completed` is present. It never rejects other fields. The service then spreads the whole request body into the stored record.

**Evidence:** `PATCH /tasks/:id` with `{"title": "Renamed", "id": "hacked"}` returned `200` and the task's `id` became `"hacked"`. Every later request using the original ID returned `404`. `createdAt` can be rewritten the same way. `updatedAt` is safe, because it's assigned after the spread.

**Why it matters:** References to the task break, and setting `id` to another task's ID creates duplicates where one of them becomes unreachable. The creation date can be falsified.

**Fix:** Only apply whitelisted fields. The unused `taskValidator` already does exactly this (see M1).

### S2. The error handler exposes messages it shouldn't (Low)

**Where:** `src/middleware/errorHandler.js`

**What's wrong:** Any error carrying a numeric `statusCode` has its message sent to the client. Malformed JSON is the clearest case.

**Evidence:** `POST /tasks` with `{"title": "Oops"` (missing brace) returned `400` with `"Expected ',' or '}' after property value in JSON at position 16 (line 1 column 17)"`.

The status is right. The message exposes parser internals in a different style from every other error. It also only hides messages when the status is exactly `500`, so a `502` or `503` would leak.

**Fix:** Map body parser errors to a clean `"Invalid JSON body."`, only expose messages from `HttpError`, and treat everything `>= 500` as internal.

### S3. The framework is advertised (Low)

**Where:** `src/app.js`

**What's wrong:** Every response includes `X-Powered-By: Express`, and there are no basic security headers.

**Fix:** `app.disable('x-powered-by')`. Adding `helmet` would cover the rest, but I've kept that out to avoid a new dependency for a small gain.

## Performance

### P1. Activity blocks the whole server on every request (Medium)

**Where:** `activity.service.js`

**What's wrong:** It uses `readFileSync`, `writeFileSync`, and `existsSync`. While those run, Node can't handle any other request, including Tasks requests. The log only ever grows, so this gets slower over time.

**The catch:** This is also exactly why Activity didn't lose data in the concurrency test. I sent 5 concurrent `POST /activity` requests and all 5 were stored, while Tasks lost half. A sync read, change, write runs without any gap for another request to slip into. Switching Activity to async the obvious way would introduce B1 into it.

**Fix:** Build the write queue first (B1), then move Activity onto `jsonStore`. The order matters (see D4).

### P2. Every request reads and parses the whole file (Low)

**What's wrong:** Every read parses the full file and every write rewrites it. `GET /tasks` and `GET /activity` always return everything, with no pagination.

**Why I'm not fixing it:** It's acceptable with the "JSON files only" constraint and today's data size. A cache would be overengineering here. Pagination could be added later through optional query parameters without breaking existing clients.

## Maintainability

### M1. The best validation code in the project is never used (High)

**Where:** `src/modules/tasks/utils/taskValidator.js`

**What's wrong:** Nothing imports it. It has a field whitelist, normalization, and structured error details, and it would have prevented S1.

**Fix:** Use it in the controller as the single validation layer, and remove the duplicated checks from the controller and service.

### M2. The same rules live in three places and disagree (Medium)

**Where:** controller, service, validator

**What's wrong:** "Title is required" has three different messages: `"title is required and must be string"`, `"Invalid title."`, and `"\"title\" is required."`. The length rule exists only in the service. The service's checks in `createTask` can never run because the controller already rejects the same input.

**Fix:** One source of truth (the validator). The service can keep real invariants, but not request validation.

### M3. The controller bypasses the error handler (Medium)

**Where:** `tasks.controller.js`

**What's wrong:** It returns `res.status(400).json(...)` directly instead of throwing `HttpError`. That's why its messages come in their own inconsistent styles (`"bad body type"`, `"completed should be bool"`, `"title cannot be empty"`) next to the service's properly thrown `"Task not found."`, and why the error `details` field is never used.

**Fix:** Throw `HttpError` everywhere and let the central handler format every error.

### M4. Activity rebuilds what already exists, less safely (Medium)

**Where:** `activity.service.js`

**What's wrong:**

* `loadDataA` and `loadDataB` are identical.
* Together they reimplement `jsonStore` with fewer checks. They test `!raw` instead of `!raw.trim()`, so a file with only whitespace makes `GET /activity` return 500.
* They never check that the parsed data is an array. If the file holds a valid non array value, `GET /activity` returns it as is to a frontend that expects a list, and `POST /activity` fails with a 500 on `.push`.
* The module also ignores `createId` and `HttpError`.

**Fix:** Delete both loaders and use the shared utilities.

### M5. Activity and Tasks return different response shapes (Medium)

**What's wrong:** Tasks returns `{ "data": ... }`. Activity returns a bare array or object.

**Why I'm not changing it:** The frontend reads `/activity` as a bare array, and there may be other clients I can't see. See D3.

### M6. Activity routes aren't wrapped in `asyncHandler` (Low today)

**What's wrong:** Harmless while Activity is synchronous, because Express 4 catches sync errors itself. Once Activity uses async `jsonStore`, any rejected promise would go unhandled, and on Node 15 or later an unhandled rejection crashes the whole process by default.

**Fix:** Wrap the routes before making the service async.

### M7. Operational gaps (Low)

* No request logging, and errors are only logged with `console.error` for 5xx. When something goes wrong in production there's no trace of what came in.
* No health check route.
* If the port is already in use, the server crashes with a raw stack trace.

### M8. The endpoint docs don't match the real behavior (Low)

**Where:** `frontend/docs/backend-endpoints.md`

**What's wrong:** It says the PATCH title must be "long enough" without a number, doesn't mention that create has no such rule, doesn't mention the overwrite behavior in S1, and doesn't document the 404 for unknown routes or the 400 for malformed JSON.

**Fix:** Every behavior change in the refactor updates this file in the same commit.

### M9. The data files are tracked in git (Low)

**Where:** `backend/.gitignore`, `backend/data/`

**What's wrong:** `.gitignore` only excludes `node_modules/` and logs, so `tasks.json` and `activity.json` are committed. The seed data and the live data are the same files, and every request that writes something leaves the working tree dirty.

**Why I'm not fixing it now:** Doing it properly means a separate seed folder that's copied on first run, which changes how anyone reviewing this project runs it. That's a bigger decision than this refactor needs, so I've left it as a recommendation.

## Code quality

### Q1. Activity naming (Low)

`get_activity` in snake case next to camelCase everywhere else, plus names like `c`, `aSvc`, `x`, `made`, `one`, `b`, `fp`, and `arr`.

### Q2. Input objects are mutated (Low)

The controller rewrites `req.body` (`payload.title = payload.title.trim()`, `payload.completed = false`) and the service does it again. The validator returns a new normalized object instead, which is the better pattern.

### Q3. Dead fallback in `id.js` (Low)

The `Date.now()` fallback only runs when `randomUUID` is missing, which means Node older than 14.17. That can't happen here: every file uses `node:` prefixed imports and `taskValidator.js` uses `Object.hasOwn`, which already require Node 16 or later. So the branch is unreachable, and it would produce weak IDs if it ever ran. Adding an `engines` field to `package.json` makes the real requirement explicit, and the fallback can go.

### Q4. Reads have side effects (Low)

A `GET` creates the data file if it's missing. If the `data/` folder itself is missing, that write fails and the `GET` returns a 500.

### Q5. Mixed line endings (Low)

The source files use Windows line endings (CRLF) while the data files use LF. Tools that write LF into a CRLF file produce whole line diffs. A `.gitattributes` file would fix it, but that touches every file, so it belongs in its own commit and I've left it out.

## Design notes (not bugs)

* Activity entries have no `taskId`, so an entry like "added a task" can't be linked to the task it's about.
* Creating, updating, or deleting a task doesn't write an activity entry. The brief doesn't ask for it, so I haven't built it.
* Activity uses `when` where Tasks uses `createdAt`. I'm keeping `when` because the frontend depends on it.

## Decisions and trade offs

### D1. Unknown fields are rejected, not ignored

Using the validator means `POST` and `PATCH` return `400` with the list of unsupported fields, where `POST` used to silently ignore them.

**Why:** A client that sends a field it thinks is being saved deserves to know it isn't. The only known client, the frontend, sends only `{ completed }` on PATCH and never creates tasks, so nothing I can see breaks.

**Trade off:** It's still a breaking change for any client I can't see. In a real rollout I'd log unknown fields for a while before starting to reject them.

### D2. Minimum title length of 2, on create and update

No spec defines a minimum. The update path enforced 2, so I treated that as the intended rule and applied it to create as well, in the validator only. The frontend never sends a title, so this doesn't affect it.

### D3. Activity keeps its response shape and field names

`GET /activity` stays a bare array and the field stays `when`, because the frontend's `getActivityFromBackend` and its `ActivityLog` type depend on both. The inconsistency with Tasks is better fixed in the frontend's own proxy route, which the frontend controls, than by breaking a public contract.

The new Activity validator requires `action` as a non empty string and allows `info` as an optional string. Every existing seed entry already fits that shape. The frontend never writes activity entries, so it isn't affected.

### D4. Write queue first, then async Activity

Activity is race safe today only because it's synchronous, and making it async without `asyncHandler` could crash the server (M6). The refactor order is:

1. Add the write queue and atomic writes to `jsonStore` (B1, B3).
2. Wrap the Activity routes in `asyncHandler` (M6).
3. Move the Activity service onto `jsonStore` and `createId` (P1, M4, B8).
4. Add the Activity validator (B7).
5. Rename (Q1).

Doing step 3 before steps 1 and 2 would have fixed the performance problem by introducing data loss and a possible crash.

## Reports API design

`GET /reports/tasks-summary` follows the contract already written in `frontend/docs/backend-endpoints.md`:

* **Raw object, not wrapped in `data`**, as documented.
* **Status mapping:** tasks only have a boolean `completed`, and the frontend only knows Completed and Pending. So `completed: true` counts as `done`, `completed: false` counts as `todo`, and `in-progress` is always `0`. The docs already describe it this way. Adding a real `status` field would mean a data migration and a value the UI can't set, so I've left it out.
* **Recent activity:** the docs don't define "recent". I'm using the last 7 days by default, with an optional `?days=` query parameter. Adding an optional parameter doesn't break anyone. Filtering uses the `when` field. With the current seed data (all from April 2026) this returns `0`, which is correct, not a bug.
* **Structure:** the Reports module reads through the existing Tasks and Activity services rather than opening the JSON files itself, so storage details stay in one place.
