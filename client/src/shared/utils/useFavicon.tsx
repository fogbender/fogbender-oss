import type { EventBadge, Room as RoomT, ServerEvents } from "fogbender-proto";
import React from "react";

const setFavicon = (icon: string) => {
  const link = document.querySelector('link[rel~="icon"]');

  if (link) {
    link.remove();
  }

  const newLink: HTMLLinkElement = document.createElement("link");

  newLink.type = "image/x-icon";
  newLink.rel = "shortcut icon";
  newLink.href = `/${icon}`;
  document.head.appendChild(newLink);
};

export const useFavicon = (
  enabled: boolean,
  badges: { [roomId: string]: EventBadge },
  roomById: (roomId: string, why: "favicon") => RoomT | undefined,
  isIdle: boolean,
  lastIncomingMessage: ServerEvents["inbound"] | undefined
) => {
  const [newFavicon, setNewFavicon] = React.useState<string>();
  const [hasUnread, setHasUnread] = React.useState<"direct" | "rooms" | undefined>();
  const [hasNew, setHasNew] = React.useState<"direct" | "rooms" | undefined>();

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const hasUnreadDialogs = Object.values(badges).find(
      x => x.count > 0 && roomById(x.roomId, "favicon")?.type === "dialog"
    );
    const hasUnreadRooms = Object.values(badges).find(
      x => x.count > 0 && roomById(x.roomId, "favicon")?.type !== "dialog"
    );
    if (hasUnreadDialogs) {
      setHasUnread("direct");
    } else if (hasUnreadRooms) {
      setHasUnread("rooms");
    } else {
      setHasUnread(undefined);
    }
    if (isIdle) {
      if ((hasNew === "direct" && !hasUnreadDialogs) || (hasNew === "rooms" && !hasUnreadRooms)) {
        setHasNew(undefined);
      }
    } else {
      setHasNew(undefined);
    }
  }, [isIdle, badges, hasNew, roomById, enabled]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!isIdle || lastIncomingMessage?.msgType !== "Event.Badge" || hasNew === "direct") {
      return;
    }
    if (lastIncomingMessage.count > 0) {
      if (roomById(lastIncomingMessage.roomId, "favicon")?.type === "dialog") {
        setHasNew("direct");
      } else {
        setHasNew("rooms");
      }
    }
  }, [isIdle, hasNew, lastIncomingMessage, roomById, enabled]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    if (hasNew) {
      setNewFavicon(`favicon-unread-${hasUnread || hasNew}-new-${hasNew}.ico`);
    } else if (hasUnread) {
      setNewFavicon(`favicon-unread-${hasUnread}.ico`);
    } else {
      setNewFavicon(undefined);
    }
  }, [hasUnread, hasNew, enabled]);

  React.useEffect(() => {
    enabled && setFavicon(newFavicon || "favicon.ico");
  }, [enabled, newFavicon]);
};
