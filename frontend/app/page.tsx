import Link from "next/link";

export default function HomePage() {
  return (
    <main className="stack">
      <header className="stack">
        <h1 className="page-title">VeeLion Frontend Assessment</h1>
        <p className="muted">Task dashboard, activity feed and reports.</p>
      </header>

      <section className="cards">
        <Link href="/tasks" className="card card-link">
          <h2 style={{ margin: 0 }}>Task Dashboard</h2>
        </Link>
        <Link href="/activity" className="card card-link">
          <h2 style={{ margin: 0 }}>Activity Feed</h2>
        </Link>
        <Link href="/reports" className="card card-link">
          <h2 style={{ margin: 0 }}>Reports</h2>
        </Link>
      </section>
    </main>
  );
}
