import type { Env } from "./config";
import type { AnyToken } from "./schema";

export type ErrorType = "error" | "warning" | "other";
export type ErrorKind = "server_stopped_responding" | "other";

export interface Client {
  getEnv?(): Env | undefined;
  getServerApiUrl?(): string | undefined;
  onError?(type: ErrorType, kind: ErrorKind, ...errors: (Error | string)[]): void;
  setSession?(
    sessionId: string,
    userId?: string,
    helpdeskId?: string,
    userAvatarUrl?: string
  ): void;
  onWrongToken?(token: AnyToken): void;
}
