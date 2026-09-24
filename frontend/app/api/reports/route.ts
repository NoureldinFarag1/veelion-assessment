import { getReportsSummaryFromBackend } from "@/lib/backendApi";
import { proxyResponse } from "@/lib/proxyRoute";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyResponse(getReportsSummaryFromBackend, (summary) => ({ data: summary }));
}