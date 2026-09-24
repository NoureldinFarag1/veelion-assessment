import { NextResponse } from "next/server";

import { updateTaskInBackend } from "@/lib/backendApi";
import { proxyResponse } from "@/lib/proxyRoute";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: { message: "Invalid task id." } }, { status: 400 });
  }

  let payload: { completed?: boolean };

  try {
    payload = (await request.json()) as { completed?: boolean };
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body." } }, { status: 400 });
  }

  const { completed } = payload;

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: { message: "completed must be boolean" } }, { status: 400 });
  }

  return proxyResponse(
    () => updateTaskInBackend(params.id, completed),
    (task) => ({ data: task })
  );
}