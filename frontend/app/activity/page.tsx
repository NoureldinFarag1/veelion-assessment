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

      <section className="card">
        <h1 className="page-title">Activity Feed</h1>

        <label htmlFor="activity-search" className="field-label">
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
        <section className="card">
          <p style={{ margin: 0 }}>Loading activity...</p>
        </section>
      ) : null}

      {error ? (
        <section className="card card-error">
          <p>{error}</p>
          <button type="button" className="button" onClick={fetchActivity}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="card">
            <small className="muted">
              Total: {entries.length} | Visible: {visibleEntries.length}
            </small>
          </section>

          <section className="card" aria-label="Activity list">
            {visibleEntries.length === 0 ? (
              <p className="muted">
                {entries.length === 0 ? "No activity yet." : "No activity matches this search."}
              </p>
            ) : (
              <ul className="list">
                {visibleEntries.map((entry) => (
                  <li key={entry.id} className="feed-item">
                    <div className="feed-action">{entry.action || "(no action)"}</div>
                    <div>{entry.info || "(no details)"}</div>
                    <small className="muted">
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