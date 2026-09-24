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

      <header className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Reports</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          A summary of every task, plus how much activity was logged in the last 7 days.
        </p>
      </header>

      {loading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p style={{ margin: 0 }}>Loading report...</p>
        </section>
      ) : null}

      {error ? (
        <section className="card" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{error}</p>
          <button type="button" className="button" onClick={fetchSummary}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error && summary ? (
        <>
          <section className="card" style={{ padding: "1rem" }} aria-label="Task totals">
            <p style={{ margin: 0, color: "var(--muted)" }}>Total tasks</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>{summary.total}</p>
          </section>

          <section className="card" style={{ padding: "1rem" }} aria-label="Tasks by status">
            <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1.1rem" }}>By status</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.5rem" }}>
              {STATUS_ROWS.map((row) => (
                <li
                  key={row.key}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}
                >
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{summary.byStatus[row.key]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" style={{ padding: "1rem" }} aria-label="Recent activity">
            <p style={{ margin: 0, color: "var(--muted)" }}>Activity in the last 7 days</p>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {summary.recentActivityCount}
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}