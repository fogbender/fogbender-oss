import React from "react";
import type { EventRoom } from "../schema";
import type { ServerCall } from "../useServerWs";

export function useRoomResolver(
  fogSessionId: string | undefined,
  serverCall: ServerCall,
  workspaceId: string | undefined,
  helpdeskId: string | undefined
) {
  const onRoomRef = React.useRef<(roomsIn: EventRoom[]) => void>(() => {});
  const [sideEffects, setSideEffects] = React.useState(new Map<string, () => void>());
  const resolveById = React.useRef(new Set<string>());
  const dispatch = React.useCallback(
    (
      action:
        | "token_change"
        | { type: "roomById"; roomId: string; room: { id: string } | undefined }
    ) => {
      if (action === "token_change") {
        resolveById.current.clear();
      } else if (action.type === "roomById") {
        const { room, roomId } = action;
        const has = resolveById.current.has(roomId);
        if (room) {
          // room was resolved somehow
          has && resolveById.current.delete(roomId);
        } else if (!has) {
          // room is not resolved yet, and we have a connection
          resolveById.current.add(roomId);
          queueMicrotask(() => {
            setSideEffects(
              sideEffects =>
                new Map(
                  sideEffects.set(roomId, () => {
                    const topic = helpdeskId
                      ? `helpdesk/${helpdeskId}/roster`
                      : workspaceId
                      ? `workspace/${workspaceId}/roster`
                      : null;

                    if (topic) {
                      serverCall({ msgType: "Roster.GetRooms", roomIds: [roomId], topic }).then(
                        x => {
                          if (x.msgType !== "Roster.GetOk") {
                            console.error(x);
                            return;
                          }
                          onRoomRef.current(x.items.map(i => i.room));
                        },
                        err => {
                          console.error("failed to resolve", err);
                        }
                      );
                    }
                  })
                )
            );
          });
        }
      }
    },
    [fogSessionId]
  );
  React.useEffect(() => {
    if (fogSessionId) {
      sideEffects.forEach(sideEffect => sideEffect());
      sideEffects.clear();
    }
  }, [sideEffects, fogSessionId]);
  return { onRoomRef, resolveById, dispatch };
}
