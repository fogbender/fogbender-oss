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

export type VisitorInfo = {
  widgetId: string;
  token: string;
  userId: string;
};

export interface Client {
  getEnv?(): Env | undefined;
  getServerApiUrl?(): string | undefined;
  onError?(type: ErrorType, kind: ErrorKind, ...errors: (Error | string)[]): void;
  setSession?(x: ClientSession): void;

  getVisitorInfo?(widgetId: string): VisitorInfo | undefined;

  setVisitorInfo?(x: VisitorInfo, reload?: boolean): void;

  onWrongToken?(token: AnyToken): void;
}
