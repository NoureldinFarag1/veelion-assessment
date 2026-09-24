# VeeLion Full Stack Assessment

A task management system in two parts: an Express API and a Next.js app that reads it. Both were given as partially implemented modules. What I did was review them, fix what was broken, and add the Reports module on each side.

The reviews are the main deliverable and they're worth reading first:

* [`backend/REVIEW.md`](backend/REVIEW.md)
* [`frontend/REVIEW.md`](frontend/REVIEW.md)

Every commit message carries the finding IDs it addresses, so `git log` maps onto those two files.

## Running it

You need Node 20.11 or newer. Start the backend first, because the frontend proxies to it.

**Backend** (port 4000):

```bash
cd backend
npm install
npm run dev
```

**Frontend** (port 3000), in a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The three pages are the task dashboard, the activity feed, and reports.

Data lives in `backend/data` as JSON files. They're committed with seed data, so any request that writes something will show up in `git status`. Run `git checkout backend/data` to reset.

## Endpoints

Documented in [`frontend/docs/backend-endpoints.md`](frontend/docs/backend-endpoints.md), kept in step with the code.

The new one is `GET /reports/tasks-summary`, which returns totals, a breakdown by status, and how many activity entries were logged recently. It takes an optional `?days=` parameter, defaulting to 7.

## Checking the concurrency fix

The worst bug in the backend was that overlapping writes lost data and could corrupt the data file. There's a script that reproduces it:

```bash
node backend/scripts/concurrency-check.mjs
node backend/scripts/concurrency-check.mjs activity
```

It fires 20 simultaneous requests and then reads the file to see what actually landed. Before the fix it reported as few as 3 of 20 stored, and one run left the file as invalid JSON. It now reports 20 of 20 every time.

## Known limits

* Writes are serialized within one process. Running more than one instance would need file locking or a real database, which the JSON files constraint rules out.
* `in-progress` in the reports response is always 0, because tasks only store a boolean `completed`. The endpoint docs describe it the same way.
* The list endpoints return everything, with no pagination.
* Next.js is on the latest 14.2 patch. The advisories still open need Next 16, which is a breaking upgrade and out of scope here. `frontend/REVIEW.md` says which ones actually apply to this app.
* There's no authentication anywhere. Nothing in the brief asked for it.