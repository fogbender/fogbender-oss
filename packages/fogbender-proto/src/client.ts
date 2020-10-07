export interface Client {
  setSession(sessionId: string, userId?: string, helpdeskId?: string): void;
}
