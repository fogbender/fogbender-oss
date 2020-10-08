import { atom, useAtom } from "jotai";
import React from "react";

import { withImmer } from "../utils/withImmer";

const loadAroundAtom = atom<{ roomId: string | undefined; ts?: number }>({ roomId: undefined });
const loadAroundByRoomAtom = withImmer(
  atom<{ [roomId: string]: { roomId: string; messageId: string; ts: number } }>({})
);

export function useLoadAround() {
  const [loadAround, setLoadAround] = useAtom(loadAroundAtom);
  const [loadAroundByRoom, setLoadAroundByRoom] = useAtom(loadAroundByRoomAtom);
  const updateLoadAround = React.useCallback(
    (roomId: string, messageId: string | undefined) => {
      const ts = new Date().getTime();
      if (messageId) {
        setLoadAround({ roomId, ts });
      } else {
        setLoadAround({ roomId: undefined });
      }
      setLoadAroundByRoom(x => {
        if (messageId) {
          x[roomId] = { roomId, messageId, ts };
        } else {
          delete x[roomId];
        }
      });
    },
    [setLoadAround, setLoadAroundByRoom]
  );
  return { loadAround, loadAroundByRoom, updateLoadAround };
}
