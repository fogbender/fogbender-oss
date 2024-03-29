import React from "react";
import type { EventRoom, EventRosterRoom } from "../schema";
import type { ServerCall } from "../useServerWs";
import { invariant } from "../utils/invariant";

export type RoomByIdWhy = "badge" | "favicon" | "other";

export function useRoomResolver(
  fogSessionId: string | undefined,
  serverCall: ServerCall,
  workspaceId: string | undefined,
  helpdeskId: string | undefined
) {
  const onRoomRef = React.useRef<(roomsIn: EventRoom[], rosterRooms: EventRosterRoom[]) => void>(
    () => {}
  );
  const [sideEffects, setSideEffects] = React.useState(new Map<string, () => void>());
  const resolveById = React.useRef(new Set<string>());
  const dispatch = React.useCallback(
    (
      action:
        | "token_change"
        | { type: "roomById"; roomId: string; room: { id: string } | undefined; why: RoomByIdWhy }
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
          if (action.why === "badge" || action.why === "favicon") {
            // we can't resolve badges with Roster.GetRooms or we will see #739
            queueMicrotask(() => {
              setSideEffects(
                sideEffects =>
                  new Map(
                    sideEffects.set(roomId, () => {
                      serverCall({ msgType: "Search.Room", roomId }).then(
                        x => {
                          if (x.msgType !== "Search.Ok") {
                            console.error(x);
                            return;
                          }
                          onRoomRef.current(x.items, []);
                        },
                        err => {
                          console.error("failed to resolve", err);
                        }
                      );
                    })
                  )
              );
            });
            return;
          }
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
                          invariant(
                            x.msgType === "Roster.GetOk",
                            `failed to resolve room ${roomId}`,
                            () => console.error("failed to resolve", roomId, topic, x)
                          );

                          onRoomRef.current(
                            x.items.map(i => i.room),
                            x.items
                          );
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
