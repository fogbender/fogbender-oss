import { type EventNotificationMessage, type Room as RoomT, useNotifications } from "fogbender-proto";
import { useAtom } from "jotai";
import React from "react";

import { muteSoundAtom, swNotificationsAtom } from "../store/config.store";
import { getActiveSwRegistration } from "../store/notifications";

import { roomToName } from "./format";
import { usePrevious } from "./usePrevious";

function prepareNotifications(
  message: EventNotificationMessage,
  roomById: (id: string) => RoomT | undefined,
  isAgent: boolean,
  ourId: string | undefined,
  setRoomToOpen?: (room: RoomT) => void
) {
  const room = roomById(message.roomId);
  if (room) {
    const body =
      room.type === "dialog"
        ? `${message.fromName}: ${message.plainText}`
        : `${message.fromName} [${roomToName(room, ourId, isAgent)}]: ${message.plainText}`;
    return {
      room,
      body,
      onClick: () => {
        window.focus();
        setRoomToOpen?.(room);
      },
    };
  }
  return;
}

export const useClientNotifications = ({
  roomById,
  notificationTitle = "",
  setRoomToOpen,
  ourId,
}: {
  setRoomToOpen?: (room: RoomT) => void;
  notificationTitle?: string;
  roomById: (id: string) => RoomT | undefined;
  ourId: string | undefined;
}) => {
  const onNotification = React.useCallback(
    (message: EventNotificationMessage) => {
      const res = prepareNotifications(message, roomById, false, ourId, setRoomToOpen);
      if (res) {
        const {
          room: { id: roomId },
          body,
          onClick,
        } = res;
        if (isIframe) {
          // we can't specify the targetOrigin because it could run from any domain
          // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
          window.parent?.postMessage(
            { type: "NOTIFICATION", notification: JSON.stringify({ body, roomId }) },
            "*"
          );
        } else {
          const notification = new Notification(notificationTitle, { body });
          notification.onclick = onClick;
        }
      }
    },
    [notificationTitle, roomById, setRoomToOpen]
  );

  return { onNotification };
};

export const useAgentNotifications = ({
  notificationTitle = "",
  roomById,
  setRoomToOpen,
  isIdle,
  ourId,
}: {
  setRoomToOpen: (room: RoomT) => void;
  notificationTitle?: string;
  roomById: (id: string) => RoomT | undefined;
  isIdle: boolean | undefined;
  ourId: string | undefined;
}) => {
  const [swNotifications] = useAtom(swNotificationsAtom);
  const onNotification = React.useCallback(
    (message: EventNotificationMessage) => {
      if (window.Notification?.permission === "granted" && isIdle) {
        const res = prepareNotifications(message, roomById, true, ourId, setRoomToOpen);
        if (res) {
          const { body, onClick } = res;
          if (swNotifications) {
            getActiveSwRegistration().then(registration => {
              registration?.showNotification(notificationTitle, {
                body,
                icon: "/logo192.png",
              });
            });
          } else {
            const notification = new Notification(notificationTitle, {
              body,
              icon: "/logo192.png",
            });
            notification.onclick = onClick;
          }
        }
      }
    },
    [isIdle, roomById, setRoomToOpen, swNotifications, notificationTitle]
  );
  return { onNotification };
};

export const useOnNotifications = ({
  userId,
  onNotification,
}: {
  userId: string | undefined;
  onNotification: (message: EventNotificationMessage) => void;
}) => {
  const { notification, lastIncomingMessage } = useNotifications({ userId });
  const [muteSound] = useAtom(muteSoundAtom);
  const prevNotification = usePrevious(notification);
  React.useEffect(() => {
    if (notification) {
      const oldId = prevNotification?.id;
      if (notification.id !== oldId) {
        onNotification(notification);
        if (muteSound === false) {
          const audio = new Audio("/messenger-notification.wav");
          audio.playbackRate = 2;
          console.info("Sound notification start time", Date.now());
          audio.onended = () => {
            console.info("Sound notification end time", Date.now());
          };
          (async function playSound() {
            try {
              await audio.play();
            } catch (err) {
              console.error("sound notification error", err);
            }
          })();
        }
      }
    }
  }, [onNotification, notification, prevNotification, muteSound]);
  return { lastIncomingMessage };
};

export const isIframe = (() => {
  try {
    return window.self !== window.parent;
  } catch (e) {
    console.error(e);
    return false;
  }
})();
