// Fires N POST requests at the same time, then checks what actually landed on disk.
// Usage (backend must be running):
//   node backend/scripts/concurrency-check.mjs            -> tests /tasks
//   node backend/scripts/concurrency-check.mjs activity   -> tests /activity
// Optional env vars: BASE_URL (default http://localhost:4000), COUNT (default 20)

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2] === 'activity' ? 'activity' : 'tasks';
const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
const count = Number(process.env.COUNT || 20);

// A unique tag per run, so leftovers from earlier runs are never counted.
const tag = `race-${Date.now()}`;
const field = target === 'tasks' ? 'title' : 'action';
const filePath = path.join(import.meta.dirname, '..', 'data', `${target}.json`);

function buildBody(i) {
    return JSON.stringify({ [field]: `${tag} ${i}` });
}

const requests = Array.from({ length: count }, (_, i) =>
    fetch(`${baseUrl}/${target}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(i + 1),
    })
        .then((response) => response.status)
        .catch(() => 'network error')
);

const statuses = await Promise.all(requests);
const created = statuses.filter((status) => status === 201).length;

console.log(`Target:  /${target}`);
console.log(`Sent:    ${count} requests at the same time`);
console.log(`Created: ${created} responses were 201`);

const raw = await readFile(filePath, 'utf-8');

let items;
try {
    items = JSON.parse(raw);
} catch {
    console.log(`Result:  FILE CORRUPTED, ${target}.json is no longer valid JSON`);
    process.exit(1);
}

const stored = items.filter(
    (item) => typeof item[field] === 'string' && item[field].startsWith(tag)
).length;

console.log(`Stored:  ${stored} of ${count} are actually in ${target}.json`);

if (stored === count && created === count) {
    console.log('Result:  OK, nothing lost');
} else {
    console.log(`Result:  LOST ${count - stored} of ${count}`);
    process.exit(1);
}