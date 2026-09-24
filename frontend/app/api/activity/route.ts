import {getActivityFromBackend, getTasksFromBackend} from "@/lib/backendApi";
import { proxyResponse } from "@/lib/proxyRoute";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyResponse(getActivityFromBackend, (logs) => ({data: logs}));
}
