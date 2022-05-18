import React from "react";
import { EventRoom } from "../schema";
import { ServerCall } from "../useServerWs";

export function useRoomResolver(fogSessionId: string | undefined, serverCall: ServerCall) {
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
                    serverCall({ msgType: "Search.Room", roomId }).then(
                      x => {
                        if (x.msgType !== "Search.Ok") {
                          console.error(x);
                          return;
                        }
                        onRoomRef.current(x.items);
                      },
                      err => {
                        console.error("failed to resolve", err);
                      }
                    );
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
