import { useWs } from "fogbender-proto";
import React from "react";

import { useJotaiQuery } from "../store/fileGalery.store";

export const useFileRefresher = (messageId: string, retryCount: number, isExpired: boolean) => {
  const { serverCall } = useWs();
  const x = useJotaiQuery({
    enabled: isExpired,
    queryKey: messageId,
    queryFn: async () => {
      console.info("fetching new download url", messageId);
      const res = await serverCall({
        msgType: "Message.RefreshFiles",
        messageId,
      });
      if (res.msgType === "Message.Ok") {
        return res.messageId;
      } else {
        console.error("failed to refresh file", res);
        throw new Error("failed to refresh file");
      }
    },
  });
  React.useEffect(() => {
    return () => {
      x.remove();
    };
  }, [retryCount]);
};


