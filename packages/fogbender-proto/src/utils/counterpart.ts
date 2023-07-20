import type { EventRoom } from "../schema";

export const calculateCounterpart = (e: EventRoom, ourUserId?: string) => {
  if (e.created) {
    const counterpart = e.type === "dialog" && e.members?.find(m => m.id !== ourUserId);
    return counterpart || undefined;
  } else {
    const type: "agent" | "user" = e.agentId ? "agent" : "user";
    const id = e.agentId || e.userId;
    const counterpart = id
      ? {
          id,
          type,
          imageUrl: e.imageUrl,
          name: e.name,
          email: e.email,
        }
      : undefined;

    return counterpart;
  }
};

export const eventRoomToRoom = (e: EventRoom, ourUserId: string) => {
  return { _meta: "roomT" as const, ...e, counterpart: calculateCounterpart(e, ourUserId) };
};
