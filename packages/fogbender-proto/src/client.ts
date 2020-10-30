import { Env } from "./config";

export type ErrorType = "error" | "warning" | "other";
export type ErrorKind = "server_stopped_responding" | "other";

export interface Client {
  getEnv?(): Env | undefined;
  onError?(type: ErrorType, kind: ErrorKind, ...errors: (Error | string)[]): void;
  setSession?(sessionId: string, userId?: string, helpdeskId?: string): void;
}
