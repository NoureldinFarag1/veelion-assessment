"use client";

import Link from "next/link";

import { useActivity } from "@/hooks/useActivity";

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ActivityPage() {
  const { entries, visibleEntries, query, loading, error, setQuery, fetchActivity } = useActivity();

  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>

      <section className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Activity Feed</h1>

        <label htmlFor="activity-search" style={{ display: "block", marginBottom: "0.35rem" }}>
          Search activity
        </label>
        <input
          id="activity-search"
          type="search"
          className="input"
          placeholder="Search by action or details"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      {loading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p style={{ margin: 0 }}>Loading activity...</p>
        </section>
      ) : null}

      {error ? (
        <section
          className="card"
          style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}
        >
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{error}</p>
          <button type="button" className="button" onClick={fetchActivity}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="card" style={{ padding: "1rem" }}>
            <small style={{ color: "var(--muted)" }}>
              Total: {entries.length} | Visible: {visibleEntries.length}
            </small>
          </section>

          <section className="card" style={{ padding: "1rem" }} aria-label="Activity list">
            {visibleEntries.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                {entries.length === 0 ? "No activity yet." : "No activity matches this search."}
              </p>
            ) : (
              <ul
                style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.7rem" }}
              >
                {visibleEntries.map((entry) => (
                  <li
                    key={entry.id}
                    style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}
                  >
                    <div style={{ fontWeight: 600 }}>{entry.action || "(no action)"}</div>
                    <div>{entry.info || "(no details)"}</div>
                    <small style={{ color: "var(--muted)" }}>
                      <time dateTime={entry.when}>{formatTime(entry.when)}</time>
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}