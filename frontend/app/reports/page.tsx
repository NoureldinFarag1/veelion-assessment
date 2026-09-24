"use client";

import Link from "next/link";

import { useReports } from "@/hooks/useReports";
import { TASK_STATUS_LABELS } from "@/lib/taskStatus";

// The backend speaks todo/in-progress/done. The UI speaks Pending/Completed.
// This is the only place the two vocabularies meet.
const STATUS_ROWS = [
  { key: "todo", label: TASK_STATUS_LABELS.pending },
  { key: "in-progress", label: "In progress" },
  { key: "done", label: TASK_STATUS_LABELS.completed },
] as const;

export default function ReportsPage() {
  const { summary, loading, error, fetchSummary } = useReports();

  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>

      <header className="card">
        <h1 className="page-title">Reports</h1>
        <p className="muted">
          A summary of every task, plus how much activity was logged in the last 7 days.
        </p>
      </header>

      {loading ? (
        <section className="card">
          <p style={{ margin: 0 }}>Loading report...</p>
        </section>
      ) : null}

      {error ? (
        <section className="card card-error">
          <p>{error}</p>
          <button type="button" className="button" onClick={fetchSummary}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error && summary ? (
        <>
          <section className="card" aria-label="Task totals">
            <p className="stat-label">Total tasks</p>
            <p className="stat-value">{summary.total}</p>
          </section>

          <section className="card" aria-label="Tasks by status">
            <h2 className="section-title">By status</h2>
            <ul className="list">
              {STATUS_ROWS.map((row) => (
                <li key={row.key} className="list-row">
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{summary.byStatus[row.key]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-label="Recent activity">
            <p className="stat-label">Activity in the last 7 days</p>
            <p className="stat-value">{summary.recentActivityCount}</p>
          </section>
        </>
      ) : null}
    </main>
  );
}