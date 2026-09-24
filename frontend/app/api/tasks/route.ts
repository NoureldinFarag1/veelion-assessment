import { getTasksFromBackend } from "@/lib/backendApi";
import { proxyResponse } from "@/lib/proxyRoute";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyResponse(getTasksFromBackend, (tasks) => ({data: tasks}));
}
