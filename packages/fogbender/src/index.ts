import { createEvents, renderIframe } from "./createIframe";
import { createFloatingWidget } from "./floatingWidget";
import { renderUnreadBadge } from "./renderUnreadBadge";
import type { Token, Badge, Fogbender, FogbenderLoader, Snapshot } from "./types";
export type { Token, Badge, Fogbender, FogbenderLoader, Snapshot };

export const createNewFogbender = (): Fogbender => {
  const state = {
    versions: {} as { [key: string]: string },
    token: undefined as Token | undefined,
    url: undefined as string | undefined,
    iframe: undefined as HTMLIFrameElement | undefined,
    events: createEvents(),
    chatWindow: null as null | Window,
  };
  const openWindow = () => {
    if (!state.chatWindow || state.chatWindow.closed) {
      state.chatWindow = window.open(
        state.url + "?token=" + encodeURIComponent(JSON.stringify(state.token)),
        "_blank"
      );
    }
    state.chatWindow?.focus();
  };
  const updateConfigured = () => {
    const configured = !!state.url && !!state.token;
    state.events.configured = configured;
    state.events.emit("configured", configured);
  };
  const fogbender: Fogbender & { _privateData: any } = {
    _privateData: state,
    async setVersion(tag, version) {
      state.versions[tag] = version;
      return fogbender;
    },
    async setClientUrl(_url: string) {
      state.url = _url;
      updateConfigured();
      return fogbender;
    },
    async setToken(token) {
      state.token = token;
      if (state.token) {
        state.token = {
          ...state.token,
          versions: { ...state.token.versions, ...state.versions, fogbender: "0.0.4" },
        };
      }
      updateConfigured();
      return fogbender;
    },
    async isClientConfigured() {
      const snapshot = {
        getValue: () => state.events.configured,
        subscribe: (cb: (s: Snapshot<boolean>) => void) => {
          return state.events.on("configured", () => cb(snapshot));
        },
      };
      return snapshot;
    },
    async createFloatingWidget(opts: { verbose?: boolean } = {}) {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      const cleanup = createFloatingWidget(state, openWindow, opts);
      return cleanup;
    },
    async renderIframe(opts) {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      const cleanup = renderIframe(
        state,
        { ...opts, token: state.token, url: state.url },
        openWindow
      );
      return cleanup;
    },
    async renderUnreadBadge(opts) {
      const cleanup = renderUnreadBadge(state, openWindow, opts);
      return cleanup;
    },
  };
  return fogbender;
};
