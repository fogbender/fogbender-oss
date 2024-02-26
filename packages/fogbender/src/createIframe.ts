/* eslint-disable no-new */
import { ResizeSensor } from "css-element-queries";
import type { Badge, Env, Token } from ".";
import { type VisitorInfo } from "./types";

type FogbenderEventMap = {
  "configured": boolean;
  "fogbender.badges": { badges: { [roomId: string]: Badge } };
  "fogbender.unreadCount": { unreadCount: number };
  "fogbender.closeFloaty": true;
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
    onVisitorInfo,
    onLightDarkModeInfo,
    initialMode = () => "light",
  }: {
    rootEl: HTMLElement;
    env: Env | undefined;
    url: string;
    token: Token;
    onVisitorInfo: (info: VisitorInfo, reload: boolean) => void;
    onLightDarkModeInfo: (x: "light" | "dark") => void;
    headless?: boolean;
    disableFit?: boolean;
    initialMode: () => "light" | "dark";
  },
  openWindow: () => void
) {
  let _mode = initialMode();
  const iFrame = document.createElement("iframe");

  rootEl.style.height = "100%";
  iFrame.src = url;
  iFrame.style.display = "block";
  iFrame.style.width = headless ? "0" : "100%";
  iFrame.style.height = headless ? "0" : "100%";
  if (headless) {
    iFrame.style.position = "fixed";
    iFrame.style.top = "-100px";
  }

  // we already check the origin, so it seems like false positive
  // nosemgrep: javascript.browser.security.insufficient-postmessage-origin-validation.insufficient-postmessage-origin-validation
  window.addEventListener("message", e => {
    if (e.origin !== url) {
      return;
    }
    if (e.source !== iFrame.contentWindow) {
      return;
    }
    if (e.data?.type === "APP_IS_READY") {
      iFrame.contentWindow?.postMessage({ env, initToken: token, headless, mode: _mode }, url);
      iFrame.contentWindow?.postMessage(
        { notificationsPermission: window.Notification?.permission },
        url
      );
    } else if (e.data?.type === "REQUEST_NOTIFICATIONS_PERMISSION") {
      window.Notification?.requestPermission().then(function (permission) {
        iFrame.contentWindow?.postMessage({ notificationsPermission: permission }, url);
      });
    } else if (e.data?.type === "VISITOR_INFO") {
      const visitorInfo: VisitorInfo = JSON.parse(e.data.visitorInfo);
      onVisitorInfo?.(visitorInfo, e.data.reload);
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
          if (badge.count) {
            count++;
          }
          // stop once first mention or dialog is found
          return isMentionOrDialog;
        });
        return isMentionOrDialog ? -1 : count;
      })();
      events.unreadCount = unreadCount;
      events.emit("fogbender.unreadCount", { unreadCount });
    } else if (e.data?.type === "WIDGET_LIGHT_DARK_MODE" && e.data.lightDarkMode !== undefined) {
      onLightDarkModeInfo(e.data.lightDarkMode);
    } else if (
      e.data?.type === "NOTIFICATION" &&
      e.data.notification !== undefined &&
      token !== undefined
    ) {
      if (window.Notification?.permission === "granted") {
        const { body, roomId } = JSON.parse(e.data.notification);
        // customerName is not set only in FallbackToken, so we should not be seeing any notifications
        const notification = new Notification(token.customerName || "Support", { body });
        notification.onclick = () => {
          if (headless) {
            openWindow();
          } else {
            window.parent.focus();
            iFrame.contentWindow?.postMessage({ roomIdToOpen: roomId }, url);
          }
        };
      }
    } else if (e.data?.type === "CLOSE_FLOATY") {
      events.emit("fogbender.closeFloaty", true);
    }
  });

  rootEl.append(iFrame);

  function adaptIFrame() {
    if (!rootEl || disableFit) {
      return;
    }
    const totalFooterHeight = (el: Element, acc: number): number => {
      const cs = getComputedStyle(el);
      const x =
        parseInt(cs.paddingBottom) + parseInt(cs.marginBottom) + parseInt(cs.borderBottomWidth);

      if (el.parentElement) {
        return totalFooterHeight(el.parentElement, acc + x);
      }

      return acc;
    };

    let heightBelow = 0;

    const tabletViewportBreakpoint = 640;

    const isTablet = window.innerWidth < tabletViewportBreakpoint;

    const getIframeHeight = () => {
      const height = headless
        ? "0"
        : isTablet
        ? "100%"
        : `${Math.min(
            window.innerHeight,
            window.innerHeight - heightBelow - rootEl.getBoundingClientRect().top
          )}px`;

      return height;
    };

    try {
      const iFrameTopBorderWidth = parseInt(getComputedStyle(iFrame).borderTopWidth);
      heightBelow = Math.max(totalFooterHeight(iFrame, 0) + iFrameTopBorderWidth, 0);
    } catch (e) {}

    const height = getIframeHeight();
    iFrame.style.height = height;
  }

  function setMode(mode: "light" | "dark") {
    _mode = mode;
    iFrame.contentWindow?.postMessage({ mode }, url);
  }

  adaptIFrame();

  new ResizeSensor(rootEl, adaptIFrame);
  new ResizeSensor(document.body, adaptIFrame);
  window.addEventListener("resize", adaptIFrame);
  return {
    setIframeMode: setMode,
    cleanup: () => {
      iFrame.src = "about:blank";
      rootEl.removeChild(iFrame);
    },
  };
}
