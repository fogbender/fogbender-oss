import type { Env } from "./config";
import type { AnyToken } from "./schema";

export type ErrorType = "error" | "warning" | "other";
export type ErrorKind = "server_stopped_responding" | "other";

export type ClientSession = {
  sessionId: string;
  userId?: string;
  helpdeskId?: string;
  userAvatarUrl?: string;
  userName?: string;
  userEmail?: string;
  customerName?: string;
};

export type UnauthenticatedSession = {
  sessionId?: string;
  widgetId: string;
  userId: string;
  userAvatarUrl?: string;
};

export interface Client {
  getEnv?(): Env | undefined;
  getServerApiUrl?(): string | undefined;
  onError?(type: ErrorType, kind: ErrorKind, ...errors: (Error | string)[]): void;
  setSession?(x: ClientSession): void;

  getUnauthenticatedSession?(
    widgetId: string
  ): { userId: string; userAvatarUrl?: string } | undefined;

  setUnauthenticatedSession?(x: UnauthenticatedSession): void;

  onWrongToken?(token: AnyToken): void;
}
