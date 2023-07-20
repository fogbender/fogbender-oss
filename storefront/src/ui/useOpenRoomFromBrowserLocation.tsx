import { Room as RoomT, useLoadAround } from "fogbender-client/src/shared";
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router";

export function useOpenRoomFromBrowserLocation(roomById: (id: string) => RoomT | undefined) {
  const { roomId, messageId } = useParams<"roomId" | "messageId">();
  const location = useLocation();
  const navigate = useNavigate();
  const { updateLoadAround } = useLoadAround();

  const opened = (
    location.state as {
      opened?: boolean;
    }
  )?.opened;
  const room = roomId && !opened ? roomById(roomId) : undefined;

  React.useEffect(() => {
    if (room && !opened) {
      // FIXME setting unexisting messageId breaks loadAround
      updateLoadAround(room.id, messageId || "m99999999999999999999");
      navigate({ pathname: "." }, { state: { opened: true } });
    }
  }, [opened, room, navigate, updateLoadAround, messageId]);
}
