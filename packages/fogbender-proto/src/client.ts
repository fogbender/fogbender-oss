import { Env } from "./config";

export interface Client {
  getEnv?(): Env | undefined;
  setSession?(sessionId: string, userId?: string, helpdeskId?: string): void;
}
