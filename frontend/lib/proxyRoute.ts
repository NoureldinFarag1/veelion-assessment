import { NextResponse } from "next/server";

import { BackendError } from "@/lib/backendError";

export async function proxyResponse<T>(
  load: () => Promise<T>,
  shape: (value: T) => unknown = (value) => value
): Promise<NextResponse> {
  try{
    const value = await load();
    return NextResponse.json(shape(value), { status: 200 });
  } catch (error) {
    if(error instanceof BackendError) {
      console.error(error.message);
      return NextResponse.json(
        { error: { message: error.publicMessage } },
        { status: error.statusCode }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: { message: "Something went wrong. Try again."} },
      { status: 500 }
    );
  }
}