import { NextResponse } from "next/server";
import { getActivityFromBackend } from "@/lib/backendApi";

export async function GET() {
  try {
    const logs = await getActivityFromBackend();
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Unable to fetch activity logs." } },
      { status: 500 }
    );
  }
}
