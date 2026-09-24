"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActivityLog, ErrorResponse } from "@/types/api";

function matches(entry: ActivityLog, term: string): boolean {
  return (
    (entry.action || "").toLowerCase().includes(term) ||
    (entry.info || "").toLowerCase().includes(term)
  );
}

export function useActivity() {
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/activity", { method: "GET" });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error?.message || `Request failed with ${response.status}`);
      }

      const body = (await response.json()) as { data?: unknown };

      // The proxy always wraps the list, but a response we can't use is an error, not an empty feed.
      if (!Array.isArray(body.data)) {
        throw new Error("The activity feed returned an unexpected response.");
      }

      setEntries(body.data as ActivityLog[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load activity right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Derived, so it isn't stored in state.
  const visibleEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? entries.filter((entry) => matches(entry, term)) : entries;
  }, [entries, query]);

  return {
    entries,
    visibleEntries,
    query,
    loading,
    error,
    setQuery,
    fetchActivity,
  };
}