"use client";

import { useCallback, useEffect, useState } from "react";

import type { ErrorResponse, ReportsSummary } from "@/types/api";

export function useReports() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/reports", { method: "GET" });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error?.message || `Request failed with ${response.status}`);
      }

      const body = (await response.json()) as { data?: ReportsSummary };

      if (!body.data || typeof body.data.total !== "number") {
        throw new Error("The reports service returned an unexpected response.");
      }

      setSummary(body.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load the report right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, fetchSummary };
}