/* eslint-disable no-new */
import { ResizeSensor } from "css-element-queries";
import { Badge, Env, Token } from ".";

type FogbenderEventMap = {
  "configured": boolean;
  "fogbender.badges": { badges: { [roomId: string]: Badge } };
  "fogbender.unreadCount": { unreadCount: number };
};

export type Events = {
  emit<K extends keyof FogbenderEventMap>(event: K, data: FogbenderEventMap[K]): void;
  on<K extends keyof FogbenderEventMap>(
    event: K,
    listener: (ev: FogbenderEventMap[K]) => void
  ): () => void;
  badges: { [roomId: string]: Badge };
  configured: boolean;
  unreadCount: number;
};

export function createEvents() {
  const listeners = new Map<keyof FogbenderEventMap, Set<(ev: any) => void>>();
  const events = {} as unknown as Events;
  events.badges = {};
  events.configured = false;
  events.emit = <T>(event: keyof FogbenderEventMap, data: T) => {
    listeners.get(event)?.forEach(listener => listener(data));
  };
  events.on = <T>(event: keyof FogbenderEventMap, callback: (data: T) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback);
    return () => {
      listeners.get(event)?.delete(callback);
    };
  };
  return events;
}

export function renderIframe(
  { events }: { events: Events },
  {
    rootEl,
    env,
    url,
    token,
    headless,
    disableFit,
  }: {
    rootEl: HTMLElement;
    env: Env | undefined;
    url: string;
    token: Token;
    headless?: boolean;
    disableFit?: boolean;
  },
  openWindow: () => void
) {
  const iFrame = document.createElement("iframe");

  iFrame.src = url;
  iFrame.style.display = "block";
  iFrame.style.width = headless ? "0" : "100%";
  iFrame.style.height = headless ? "0" : "100%";
  if (headless) {
    iFrame.style.position = "fixed";
    iFrame.style.top = "-100px";
  }

  window.addEventListener("message", e => {
    if (e.origin !== url) {
      return;
    }
    if (e.source !== iFrame.contentWindow) {
      return;
    }
    if (e.data?.type === "APP_IS_READY") {
      iFrame.contentWindow?.postMessage({ env, initToken: token, headless }, url);
      iFrame.contentWindow?.postMessage(
        { notificationsPermission: window.Notification?.permission },
        url
      );
    } else if (e.data?.type === "REQUEST_NOTIFICATIONS_PERMISSION") {
      window.Notification?.requestPermission().then(function (permission) {
        iFrame.contentWindow?.postMessage({ notificationsPermission: permission }, url);
      });
    } else if (e.data?.type === "BADGES" && e.data?.badges !== undefined) {
      const badges: FogbenderEventMap["fogbender.badges"]["badges"] = JSON.parse(e.data.badges);
      events.badges = badges;
      events.emit("fogbender.badges", { badges });
      const unreadCount = (() => {
        let isMentionOrDialog = false;
        let count = 0;
        Object.keys(badges).find(roomId => {
          const badge = badges[roomId];
          if (badge.mentionsCount) {
            isMentionOrDialog = true;
          } else if (badge.count) {
            isMentionOrDialog = badge.roomType === "dialog";
          }
          count += badge.count;
          // stop once first mention or dialog is found
          return isMentionOrDialog;
        });
        return isMentionOrDialog ? -1 : count;
      })();
      events.unreadCount = unreadCount;
      events.emit("fogbender.unreadCount", { unreadCount });
    } else if (
      e.data?.type === "NOTIFICATION" &&
      e.data.notification !== undefined &&
      token !== undefined
    ) {
      if (window.Notification?.permission === "granted") {
        const { body, roomId } = JSON.parse(e.data.notification);
        const notification = new Notification(token.customerName, { body });
        notification.onclick = () => {
          if (headless) {
            openWindow();
          } else {
            window.parent.focus();
            iFrame.contentWindow?.postMessage({ roomIdToOpen: roomId }, url);
          }
        };
      }
    }
  });

  rootEl.innerHTML = "";
  rootEl.append(iFrame);

  function adaptIFrame() {
    if (!rootEl || disableFit) {
      return;
    }
    const height = headless
      ? 0
      : Math.min(window.innerHeight, window.innerHeight - rootEl.getBoundingClientRect().top);
    iFrame.style.height = height + "px";
  }

  adaptIFrame();

  new ResizeSensor(rootEl, adaptIFrame);
  new ResizeSensor(document.body, adaptIFrame);
  window.addEventListener("resize", adaptIFrame);
  return () => {
    iFrame.src = "about:blank";
    rootEl.innerHTML = "";
  };
}
