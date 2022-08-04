import React from "react";
import { useWs } from "./ws";
import { EventMessage } from "../schema";

export function useSearchHistory(term: string, roomId: string) {
  const [result, setResult] = React.useState<EventMessage[]>();
  const { serverCall } = useWs();

  React.useMemo(async () => {
    await serverCall({ msgType: "Search.RoomMessages", roomId, term, limit: 50 })
      .then((x: any) => {
        setResult(x);
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
      })
      .catch(() => {});
  }, [roomId, term]);
  return result;
}
