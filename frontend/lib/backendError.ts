export class BackendError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(statusCode: number,message: string, publicMessage: string) {
    super(message);
    this.name = "BackendError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

export const UNREACHABLE = "The task service is unavailable. Try again in a moment."
export const TIMED_OUT = "The task service took too long to respond. Try again."