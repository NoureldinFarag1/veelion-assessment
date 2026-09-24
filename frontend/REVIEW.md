# Frontend Code Review

## How I reviewed this

I ran the app before I read it. Backend on port 4000, frontend on 3000, then I clicked through both modules, filtered, toggled, searched, killed the backend mid session, and sent requests straight at the proxy routes with `curl`. I wrote down what actually happened, and only then read every file and tied each symptom back to the line that causes it. Where a finding is backed by a real request or a real crash, I've included the evidence.

I read `backend/REVIEW.md` first, because the two sides share a contract and some problems are cheaper to fix on one side than the other. Where a fix belongs in the frontend because the backend has deliberately decided not to change, I've said so and pointed at the backend decision.

Severity scale:

| Severity | Meaning |
|---|---|
| High | The page breaks, or it tells the user something that isn't true |
| Medium | Wrong behavior or a real maintenance risk, but the page still works |
| Low | Worth fixing, low impact today |

Finding IDs (FB1, FS1, ...) are referenced in commit messages so every change can be traced back to a finding.

Nothing here has been refactored yet, with one exception: the Next.js upgrade in FS2 is already committed, because it patched a critical advisory and waiting for a refactor to start wasn't sensible.

## Strengths

The Tasks module is good code. I'd have written most of it the same way, and I want that on the record before the list of problems, because nearly every finding below is about the Activity module or the shared API layer.

* `app/tasks/page.tsx` stays a server component and only `TaskDashboard` is marked `"use client"`. That's the correct App Router split, and it keeps the client bundle to what actually needs interactivity.
* The Tasks side has a real component breakdown. `TaskDashboard` owns the states, `StatusFilter` and `TaskList` are presentational, `TaskItem` is one row. Loading, error, empty, and per item saving states all exist and are all handled.
* Accessibility on the Tasks side is deliberate: `aria-pressed` on the filter buttons, a descriptive `aria-label` on every toggle, real `<button>` elements, and `aria-label` on the filter and list sections.
* `useTasks` uses `useCallback` and `useMemo` where they matter, and it updates a task from the server's response instead of guessing what the server did with it.
* `globals.css` defines design tokens as CSS variables, so a restyle has somewhere to start from.
* The PATCH proxy checks that `completed` is a boolean and forwards only that field. That's real defense in depth, and it's why backend S1 was never reachable from this UI even while it was open.
* TypeScript `strict` is on, `.env.example` documents the one variable the app needs, and the `@/*` path alias is configured, so imports stay readable.

The Activity module is the opposite of all of that. It's a single 133 line client component holding the same list in three pieces of state, with two copies of every helper and a timer driving the whole thing.

## Bugs

### FB1. The activity page stores an error response as the list, then crashes (High)

**Where:** `app/activity/page.tsx`, lines 48 to 61, rendered at line 120

**What's wrong:** The fetch chain calls `.json()` without ever checking `response.ok`, and never checks that what came back is an array. `setForcedList(data || [])` takes whatever it's given. When `/api/activity` returns its error shape, that object is truthy, so it gets stored as the list. The next render calls `.map` on an object.

**Evidence:** With the backend stopped, `/activity` throws `TypeError: forcedList.map is not a function` at `app/activity/page.tsx:120`. The page goes blank.

**Why it matters:** It's the difference between a page that degrades and a page that dies. Any backend problem, any proxy problem, and any response that isn't the expected array takes the whole route down with a render error instead of showing a message.

**Fix:** Check `response.ok`, read the error shape and throw a real `Error`, and guard with `Array.isArray` before storing anything. Normalizing the proxy response to `{ data }` (D1) is what makes that guard meaningful rather than defensive guessing.

### FB2. A failed request looks like an empty feed (High)

**Where:** `app/activity/page.tsx`, lines 56 to 60

**What's wrong:** The `.catch` sets all three lists to `[]` and does nothing else. There's no error state and no loading state anywhere on this page, so a network failure, a backend 500, and a genuinely empty log all render identically: an empty list under "Total: 0".

**Why it matters:** The user gets told there's no activity when the truth is we don't know. That's worse than an error, because there's nothing to retry and no reason to think anything went wrong. The Tasks side gets this right, which makes the gap easy to see side by side.

**Fix:** Give the page the three states the Tasks side already has: loading, error with a Retry button, and empty. Reuse the pattern in `TaskDashboard` instead of inventing a second one.

### FB3. Every proxy failure is reported as a 500 (Medium)

**Where:** `app/api/tasks/route.ts`, `app/api/activity/route.ts`, `app/api/tasks/[id]/route.ts`

**What's wrong:** All three handlers wrap everything in one `try/catch` and answer `{ status: 500 }` for anything that goes wrong. `lib/backendApi.ts` does check `response.ok` and does read the backend's error message, but it throws a plain `Error`, so only the message survives. The status is read and then dropped.

**Evidence:**

```
curl -i -X PATCH "localhost:3000/api/tasks/..%2Factivity" \
  -H "Content-Type: application/json" -d '{"completed":true}'
```

returns `500` with `{"error":{"message":"Route not found: PATCH /activity"}}`. The backend answered 404. The caller was told 500.

**Why it matters:** A 404 for a task someone deleted in another tab, a 400 for a bad body, and a backend that's genuinely down are all indistinguishable to the caller. Anything that retries on 5xx will retry requests that can never succeed, and the UI can't tell the user which of those happened.

**Fix:** Carry the upstream status through. Throw a small typed error from `lib/backendApi.ts` that holds `status` and `message`, and let one shared handler in the proxy (FM1) map it back onto the response.

### FB4. Every timestamp is rendered twice (Medium)

**Where:** `app/activity/page.tsx`, lines 14 to 20, rendered at lines 124 and 126

**What's wrong:** `formatTimeA` and `formatTimeB` have identical bodies, both `new Date(value).toLocaleString()`, and both are rendered for every entry with a `<br />` between them. Every row in the feed shows the same date twice.

**Why it matters:** It's a visible defect on the page, not just dead code. Anyone who opens the feed sees it in the first second.

**Fix:** One formatter, called once, moved out of the component (FR2). A `<time dateTime={item.when}>` element would also make the value machine readable for free.

### FB5. `updatingTaskId` can only track one task (Low)

**Where:** `hooks/useTasks.ts`, lines 40, 61, and 75

**What's wrong:** A single string holds the id being saved, so toggling a second task overwrites it. Task A's button stops looking busy the moment task B starts, and when A's request finishes, the `finally` block clears the id entirely and re-enables B's button too, while B is still in flight.

**Why it matters:** Buttons stop saying "Saving..." while the request is still running, and a user can fire a second PATCH at a row that's already updating. It's small today because there's no way to toggle fast enough to matter often, but it's wrong in both directions at once.

**Fix:** Hold a `Set<string>` of ids in flight. Add on start, remove in `finally`, and check membership per row.

### FB6. A non-JSON error body shows the user a parser message (Low)

**Where:** `hooks/useTasks.ts`, lines 23 to 30

**What's wrong:** The `throw` on line 26 sits inside the same `try` as the `response.json()` that feeds it, so its own catch handles it. In the normal case that's harmless, because `getErrorMessage` returns `error.message` for anything that's an `Error`, so the backend's message survives the round trip unchanged. The case it gets wrong is the one the fallback was written for. If the error body isn't JSON, `response.json()` throws a `SyntaxError`, which is also an `Error`, so `getErrorMessage` returns the parser's message rather than `Request failed with 502`.

**Why it matters:** The user sees something like `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` whenever a proxy or a load balancer returns an HTML error page. It's the same class of leak as backend S2, arriving by a different route.

**Fix:** Parse the body in its own `try` that returns a string, and throw once outside it. Then the fallback runs when parsing fails, which is what it's there for.

### FB7. A malformed PATCH body returns 500 instead of 400 (Low)

**Where:** `app/api/tasks/[id]/route.ts`, line 12

**What's wrong:** `await request.json()` is inside the same `try` as the backend call, so a body that isn't valid JSON lands in the catch and gets the same 500 as an unreachable backend. The handler already returns a correct 400 when `completed` isn't a boolean, so the shape is right and only the parse is in the wrong place.

**Fix:** Parse first and return 400 on a parse failure, keeping the catch for the backend call. Fixing FB3 covers this too, if the parse error is thrown carrying a status.

## Security

### FS1. The task ID goes into the backend URL without encoding (Medium)

**Where:** `lib/backendApi.ts`, line 38

**What's wrong:** `buildBackendUrl(\`/tasks/${taskId}\`)` interpolates the route parameter straight into the URL. Next.js has already decoded `params.id` by then, so `..%2F` arrives as `../`, and `fetch` normalizes the path before it goes out. The request leaves the proxy pointed at a different backend route than the one the caller asked for.

**Evidence:**

```
curl -i -X PATCH "localhost:3000/api/tasks/..%2Factivity" \
  -H "Content-Type: application/json" -d '{"completed":true}'
```

returns `500` with `{"error":{"message":"Route not found: PATCH /activity"}}`. That message is proof the request reached `PATCH /activity` rather than any `/tasks/` route. The wrong status is FB3.

**Why it matters:** The blast radius today is small. The method is fixed to PATCH, the body is forced to `{ completed }`, and the backend has no PATCH route this can reach. That's luck, not design. What's actually here is a server side HTTP client with a user controlled path segment in it, and the day the backend grows a PATCH route with a compatible body, this becomes a way to call it from the browser while bypassing whatever the proxy thought it was protecting. It also breaks any legitimate ID containing `/`, `?`, or `#`.

**Fix:** `encodeURIComponent(taskId)`, plus a shape check before the request is built. Backend IDs are UUIDs, so a UUID check is cheap and exact.

### FS2. Next.js ships with open advisories (Medium)

**Where:** `package.json`

**What's wrong:** The project was imported on `next@14.2.5`, which had a critical advisory against it.

**Evidence:** `npm audit` before the upgrade reported 1 critical and 2 high. The dependency is now `^14.2.35`, upgraded in commit `fc0dee7`, which is the one change in this review that's already applied. After that upgrade and `npm audit fix`, the remaining Next advisories all require Next 16. `npm audit` today reports 2 vulnerabilities, 1 high and 1 critical, and every fix npm offers routes through `next@16.3.6`, which npm itself flags as a breaking change.

**Why it matters, and what's actually left:** Most of the remaining advisories don't describe this app. There's no `next/image` anywhere, no `middleware.ts`, no Server Actions, no rewrites and no i18n, and it isn't hosted on Windows, which rules out the critical Image Optimizer and remote code execution entries. What does apply is the React Server Components set, the denial of service and cache poisoning entries, because this is an App Router app. That's the residual risk, and I'd rather name it than let a clean `npm audit` stand in for a judgment nobody made. See D2.

**Fix:** Stay on the 14.2.x line through this refactor and schedule the Next 16 upgrade as its own piece of work with its own testing.

### FS3. Upstream error text is shown to the user (Low)

**Where:** `lib/backendApi.ts`, lines 32, 54, and 70, then the three route handlers

**What's wrong:** Each catch rethrows `error.message`, the proxy puts that message straight in the response body, and `useTasks` renders it in the error card.

**Evidence:** Stop the backend and open `/tasks`. The error card appears with a Retry button, which is the right shape, and the text inside it is `fetch failed`. That's Node's message for a refused connection.

**Why it matters:** It's meaningless to a user, and it's internal detail from a network client leaking through two layers that both had a chance to stop it. The same path would happily show a stack message or a database error string if one ever reached it.

**Fix:** Log the real error on the server, return one message the UI can show, and keep upstream detail out of the response body. The status carried through by FB3 is what the UI should be branching on anyway.

### FS4. The backend URL is marked public when it doesn't need to be (Low)

**Where:** `lib/constants.ts`, `.env.example`

**What's wrong:** `NEXT_PUBLIC_BACKEND_API_URL` is read only by `lib/backendApi.ts`, which is imported only by the three route handlers. That's server only code. The `NEXT_PUBLIC_` prefix tells Next to treat the value as public and inline it wherever it's referenced.

To be fair to the code as it stands: I built the app and grepped `.next/static`, and the value isn't in the client bundle today, because nothing client side imports it. The prefix is what makes that one import away, and nothing in the codebase says so. It also means the value is fixed at build time, so one build can't be pointed at a different backend per environment.

**Fix:** Drop the prefix and rename it to `BACKEND_API_URL`. Server only variables are read at runtime, which is what you want for deploys anyway.

### FS5. Next.js advertises itself (Low)

**Where:** `next.config.mjs`

**What's wrong:** The config object is empty, so `X-Powered-By: Next.js` goes out on every response.

**Fix:** `poweredByHeader: false`. Same finding as backend S3, and I'm leaving broader security headers out for the same reason it did: worth doing, not worth smuggling into a refactor.

## Performance

### FP1. A timer re-filters and rebuilds the list every 1.4 seconds, forever (High)

**Where:** `app/activity/page.tsx`, lines 63 to 83

**What's wrong:** An interval increments `tick` every 1400ms. `tick` is in the dependency array of the filter effect on line 75 and the effect on line 83, so both re-run on every tick. The second one is the expensive half:

```js
if (tick % 2 === 0) {
  setForcedList([...shownActivity]);
} else {
  setForcedList(shownActivity.map((item) => ({ ...item })));
}
```

On even ticks it builds a new array. On odd ticks it builds a new array and a new object for every entry in it. Either way `setForcedList` receives something that's never reference equal to what's already there, so React re-renders the entire list. Nothing on the page depends on `tick`: `stats.everySecondTick` is computed and never rendered (FQ2).

**Why it matters:** The page runs a full filter pass, a full array rebuild, and a full list re-render roughly 43 times a minute, forever, with no visible change. On odd ticks the allocation scales with the number of entries, and the activity log only ever grows. It also keeps the tab busy and drains battery on a page that's showing a static list.

**Fix:** Delete the interval and both effects. The list is derived from `allActivity` and `query`, so it's one `useMemo` (FR1). If live updates are genuinely wanted, that means polling the API on a sensible interval, not re-filtering data that hasn't changed.

### FP2. Server side fetches have no timeout (Medium)

**Where:** `lib/backendApi.ts`

**What's wrong:** All three calls use bare `fetch` with no `signal`. A backend that accepts the connection and then never answers holds the route handler open until Node or the host platform eventually gives up.

**Why it matters:** A refused connection fails fast, which is the case I tested and the one everyone tests. A hung backend is the worse one: the browser request hangs, the user watches a loading state with nothing to retry, and every hung request holds a connection open on the server. It's the failure mode that takes a frontend down with a backend that's technically still running.

**Fix:** `AbortSignal.timeout(...)` on every request, with the value defined in one place, and map an abort onto a 504 once FB3 is in.

## Maintainability

### FM1. The same try/catch is written three times (Low)

**Where:** `app/api/tasks/route.ts`, `app/api/activity/route.ts`, `app/api/tasks/[id]/route.ts`

**What's wrong:** All three handlers are the same shape: call the backend, return `NextResponse.json(...)`, catch anything at all, return 500 with a per route fallback message. The only real differences are which function gets called and the wording of a message the user should never see anyway (FS3).

**Why it matters:** That's three places to change for FB3, three for FS3, and three for FP2, and three places for them to drift apart. They already have drifted: two wrap the payload in `{ data }` and one returns a bare array (D1).

**Fix:** One `handleProxyRoute` helper that takes the call and owns the status mapping and error shaping. Each handler becomes a line.

### FM2. A missing environment variable is hidden by a fallback (Low)

**Where:** `lib/constants.ts`

**What's wrong:** `|| "http://localhost:4000"` means a deployment with no backend URL set builds and starts without a word, then fails at request time trying to reach localhost. The fallback value itself is right, since the backend defaults to port 4000 (backend B4), so local development works with no `.env` file at all.

**Why it matters:** The fallback is good in development and bad in production. A build that's missing its backend URL should say so, not quietly point at a machine that isn't there and then report `fetch failed` to users.

**Fix:** Keep the default for development, and throw at startup when `NODE_ENV === "production"` and the variable is missing.

### FM3. The route handlers are dynamic by accident (Low)

**Where:** `app/api/tasks/route.ts`, `app/api/activity/route.ts`

**What's wrong:** Neither handler declares `export const dynamic = "force-dynamic"`. They're dynamic today only because `lib/backendApi.ts` passes `cache: "no-store"` to `fetch`, two files away.

**Evidence:** `next build` lists all three `/api` routes as `ƒ (Dynamic)`, so the behavior right now is correct.

**Why it matters:** The only thing keeping these routes from being prerendered at build time is a `fetch` option in a different module. Someone removing `cache: "no-store"` while tidying up would turn `GET /api/tasks` into a snapshot of the task list taken at build time and served forever. That's a silent bug, and it wouldn't be visible in a diff of the route file.

**Fix:** Declare the intent in the route file. Keep `no-store` as well. They're saying two different things and both of them are true.

### FM4. The status label mapping lives inside components (Low)

**Where:** `components/tasks/TaskItem.tsx` lines 21, 34, and 36, and `components/tasks/StatusFilter.tsx` lines 3 to 7

**What's wrong:** `task.completed ? "Completed" : "Pending"` appears three times in `TaskItem`, and the same two words are hardcoded again as filter labels. Nothing in the codebase says, in one place, what a boolean means in the UI.

**Why it matters:** The Reports page has to show tasks grouped by status, so it needs the same mapping a fourth time, and the backend reports endpoint speaks a third vocabulary of `todo`, `in-progress`, and `done`. Three vocabularies with no translation layer is how labels end up disagreeing between pages.

**Fix:** One small module that maps a task's state to a label, used by `TaskItem`, `StatusFilter`, and the Reports page.

## Code quality

### FQ1. The activity page has two of everything (Low)

`applyFilterA` and `applyFilterB` are the same filter written twice, one with `includes` and one with `indexOf(...) !== -1`. Lines 72 to 74 run both, feeding B the output of A, so the second pass can't possibly remove anything the first pass kept. `formatTimeA` and `formatTimeB` are identical too, and unlike the filters, both get rendered (FB4). The `A`/`B` suffix naming is the same pattern as `loadDataA` and `loadDataB` in the backend's Activity module (backend M4), so both halves of the Activity feature seem to have been written the same way.

**Fix:** One filter, one formatter, both named for what they do.

### FQ2. Dead state (Low)

`stats.everySecondTick` is computed in a `useMemo` and never rendered. It's the only thing that makes `tick` look like it belongs in `stats`, and removing the timer (FP1) removes both. The `stats` memo doesn't earn its keep either: two `.length` reads don't need memoizing, and its dependencies change on every tick, so it recomputes anyway.

### FQ3. Inline styles instead of the CSS that's already there (Low)

Every component sets its layout through `style={{ ... }}`, including things `globals.css` already defines. `TaskDashboard.tsx` line 39 hardcodes `borderColor: "#e3b4c0"` and `background: "#fff8fa"` for the error card, two colors that exist nowhere in the token block, while `--danger` is used on the line right below it. `.stack` exists as a class and then `app/page.tsx` line 13 overrides its `gridTemplateColumns` inline.

**Why it matters:** The tokens in `globals.css` are the best part of the styling and almost nothing uses them. Any restyle has to touch every component instead of one stylesheet. This one counts for more than a normal nitpick, because restyling the app is an explicit goal and inline styles are exactly what makes that expensive.

**Fix:** Move the repeated patterns into classes alongside the ones already defined, and keep inline styles for values that really are one offs.

## React best practices

### FR1. Derived data is stored in three states and wired together with effects (High)

**Where:** `app/activity/page.tsx`, lines 8 to 12 and 48 to 83

**What's wrong:** There's one list of activity entries. The page keeps it three times:

* `allActivity`, what the API returned.
* `shownActivity`, `allActivity` with the search applied, written by an effect.
* `forcedList`, a copy of `shownActivity`, written by another effect, and the only one that's actually rendered.

Two of the three are derived, and both are kept in step by effects that run after render. Typing one character into the search box therefore costs three renders: the `query` update, then `shownActivity` from one effect, then `forcedList` from the other.

**Why it matters:** This is the root cause, not a style preference. FB1 is possible because the fetch has to write three setters and validates in none of them. FP1 is possible because there's a `forcedList` sitting there to be rebuilt. FB4, FQ1, and FQ2 all live in this file for the same reason: the state design invited more machinery, and the machinery grew. Fix the state and most of the file's other findings stop having anywhere to live.

**Fix:** One state, `activity`. One `useMemo` for the filtered list. Render that. Two of the three states, both effects, and the interval all go.

### FR2. Helpers are rebuilt every render and left out of the dependency arrays (Low)

**Where:** `app/activity/page.tsx`, lines 14 to 46, used at lines 71 to 75

**What's wrong:** `formatTimeA`, `formatTimeB`, `applyFilterA`, and `applyFilterB` are declared in the component body, so they're new function objects on every render. The effect on line 71 calls `applyFilterA` and `applyFilterB` while declaring `[query, allActivity, tick]` as its dependencies, so neither helper is listed.

It's safe here by accident, because the helpers are pure and close over nothing that changes. It's still the exact pattern that produces stale closure bugs the moment one of them starts reading state.

**Fix:** Move pure helpers to module scope, outside the component. They stop being recreated on every render and the dependency question disappears with them.

## UX

### FU1. One error state covers the list and the toggle, and Retry retries the wrong thing (Medium)

**Where:** `hooks/useTasks.ts` line 39, `components/tasks/TaskDashboard.tsx` lines 38 to 49

**What's wrong:** `useTasks` keeps a single `error` string, written by both `fetchTasks` and `updateTaskStatus`. `TaskDashboard` renders `TaskList` only when `!loading && !error`, so one failed toggle replaces the entire task list with an error card. That card's Retry button calls `fetchTasks`, which reloads the list rather than retrying the toggle that actually failed.

**Why it matters:** One row failing to save hides every row, including the nine that are fine, and the recovery on offer isn't the one the user needs. The list is also still correct in memory at that moment, so good data is thrown off the screen to report a small failure.

**Fix:** Two errors. A load error keeps the card and Retry it has now. A save error belongs on the row that failed, with the list still visible, and Retry there should re-send that toggle.

### FU2. The empty message assumes a filter is to blame (Low)

**Where:** `components/tasks/TaskList.tsx`, lines 11 to 17

**What's wrong:** `tasks.length === 0` renders "No tasks match this filter." A fresh install with no tasks at all shows that same sentence with the filter sitting on "All".

**Fix:** Pass down whether the unfiltered list is empty and say "No tasks yet." in that case. `useTasks` already returns both `tasks` and `filteredTasks`, and `TaskDashboard` currently uses only the filtered one.

### FU3. The filter isn't in the URL (Low)

**Where:** `hooks/useTasks.ts`, line 37

**What's wrong:** `filter` is plain `useState`, so a refresh resets it to "All", the back button doesn't undo it, and the view can't be linked to or shared.

**Fix:** Keep it in a search parameter with `useSearchParams` and `router.replace`. It's the kind of state the URL exists for and it costs a few lines.

### FU4. A disabled button still looks clickable (Low)

**Where:** `app/globals.css` lines 45 to 57, `components/tasks/TaskItem.tsx` line 33

**What's wrong:** `TaskItem` does set `disabled={busy}` and the label does change to "Saving...", which is the right instinct. But `.button` has no `:disabled` rule and sets `cursor: pointer` unconditionally, and because the class supplies its own background and text color, the browser's default disabled treatment barely shows through.

**Fix:** A `.button:disabled` rule with reduced opacity and `cursor: not-allowed`.

### FU5. The search input has no label (Low)

**Where:** `app/activity/page.tsx`, lines 104 to 109

**What's wrong:** The only description is `placeholder="Search activity"`, which vanishes the moment the user types and isn't a dependable accessible name. The Tasks side labels everything it renders, so this is an inconsistency as well as an accessibility gap.

**Fix:** A visible `<label>`, or `aria-label` at minimum, plus `type="search"`.

### FU6. The font stack starts with a font macOS doesn't have (Low)

**Where:** `app/globals.css`, line 25

**What's wrong:** `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`. Segoe UI is a Windows font. macOS falls through to Tahoma, which it does ship, so Mac users silently get a typeface nobody chose, and no platform gets the system font.

**Fix:** Lead with `system-ui` so every platform gets its native UI font, or use `next/font` if a specific typeface is actually wanted.

## Design notes (not bugs)

* Both pages fetch on the client through the proxy routes, even though `/tasks` is already a server component wrapping a client one. Either page could fetch on the server and pass data down, which would remove a round trip and the loading flash. I'm not proposing it as part of this refactor: the toggle and the search both need client state regardless, and the split has to be drawn carefully to be worth anything.
* The proxy layer earns its place. It's the only reason the backend URL stays on the server, and the only place shared handling can live. Worth saying out loud, because from the outside those three files look like pass throughs that could be deleted.
* The backend has `POST /tasks`, `DELETE /tasks/:id`, and `POST /activity`, all documented in `docs/backend-endpoints.md`, and the UI calls none of them. Nothing in this app ever writes an activity entry, so the feed can only ever show seed data.
* `TaskFilter` lives in `types/api.ts` next to the API types, but it's a UI concept the API knows nothing about. Small thing, worth moving whenever that file is next touched.

## Decisions and trade offs

### D1. The Activity response gets normalized in the frontend proxy, not the backend

`GET /activity` returns a bare array while `GET /tasks` returns `{ data: [...] }`. The backend review raises this as M5 and then decides, in D3, to keep the bare array, because the shape is a public contract and clients we can't see may depend on it.

So the fix belongs here. `app/api/activity/route.ts` will return `{ data: logs }` to match the tasks proxy, and the activity page will read `body.data`.

**Why:** This is the one place in the system that can change the shape without breaking anyone. The proxy route is ours, its only caller is our own page, and both change in the same commit.

**Trade off:** The activity proxy stops being a transparent pass through, so anyone reading `app/api/activity/route.ts` has to notice its shape differs from the backend's. That costs a comment, and it buys one response shape everywhere in the frontend, which is what makes the `Array.isArray` guard in FB1 worth writing.

### D2. Next stays on 14.2.x, with the residual risk named

The upgrade from 14.2.5 to 14.2.35 is already done. Everything still outstanding needs Next 16, which npm itself labels a breaking change.

**Why:** A major framework upgrade isn't a refactor. It's separate work with its own testing, and running it inside this one would mix "I improved the Activity module" and "I moved the app to a new major version" into a single diff nobody can review properly.

**Trade off:** `npm audit` stays non empty, and I'd rather it stay non empty honestly than get silenced. FS2 lists which advisories actually apply here and which don't, because a clean audit shouldn't be allowed to stand in for a judgment nobody made.

### D3. `TaskItem` doesn't get `memo` and `handleToggle` doesn't get `useCallback`

I considered both and decided against both.

**Why:** `TaskDashboard` re-renders when a task's state changes, which is precisely when the list should re-render. `handleToggle` is recreated on those renders, and since `TaskItem` isn't memoized the new reference costs nothing. Adding `memo` and `useCallback` here means two more things that have to stay correct, bought with skipping the re-render of a handful of rows that were about to change anyway.

**Trade off:** This flips if the list grows to hundreds of rows, or if a row becomes expensive to render. At that point the right move is `memo` on `TaskItem` and `useCallback` on the handler together, because either one alone does nothing. I'd rather record that I thought about it than add memoization for show.
