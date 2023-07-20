import React from "react";
import { useWs, Message, convertEventMessageToMessage } from "./ws";
import type { SearchRoomMessages } from "../schema";

export function useSearchHistory(term: string, roomId: string) {
  const [result, setResult] = React.useState<Message[]>();
  const { serverCall } = useWs();

  React.useMemo(async () => {
    await serverCall<SearchRoomMessages>({
      msgType: "Search.RoomMessages",
      roomId,
      term,
      limit: 50,
    })
      .then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setResult(x.items.map(convertEventMessageToMessage));
      })
      .catch(() => {});
  }, [roomId, term]);
  return result;
}
