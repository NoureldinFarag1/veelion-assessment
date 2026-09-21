import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <header className="stack" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>VeeLion Frontend Assessment</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Two separate modules built against the provided backend.
        </p>
      </header>

      <section className="stack" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Link href="/tasks" className="card" style={{ padding: "1rem", display: "block" }}>
          <h2 style={{ marginTop: 0 }}>Task Dashboard</h2>

        </Link>

        <Link href="/activity" className="card" style={{ padding: "1rem", display: "block" }}>
          <h2 style={{ marginTop: 0 }}>Activity Feed</h2>

        </Link>
      </section>
    </main>
  );
}
