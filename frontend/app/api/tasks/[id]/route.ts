import { NextResponse } from "next/server";
import { updateTaskInBackend } from "@/lib/backendApi";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const payload = (await request.json()) as { completed?: boolean };

    if (typeof payload.completed !== "boolean") {
      return NextResponse.json(
        { error: { message: "completed must be boolean" } },
        { status: 400 }
      );
    }

    const task = await updateTaskInBackend(params.id, payload.completed);
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Unable to update task." } },
      { status: 500 }
    );
  }
}
