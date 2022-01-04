import { createEvents, renderIframe } from "./createIframe";
import { createFloatingWidget } from "./floatingWidget";
import type { Token, Badge, NewFogbenderType, Fogbender, FogbenderLoader, Snapshot } from "./types";
export type { Token, Badge, NewFogbenderType, Fogbender, FogbenderLoader, Snapshot };

export const createNewFogbender = (): NewFogbenderType => {
  const state = {
    releaseInfo: "npm-0.0.1",
    token: undefined as Token | undefined,
    url: undefined as string | undefined,
    iframe: undefined as HTMLIFrameElement | undefined,
    events: createEvents(),
  };
  const updateConfigured = () => {
    const configured = !!state.url && !!state.token;
    state.events.configured = configured;
    state.events.emit("configured", configured);
  };
  const fogbender: NewFogbenderType & { _privateData: any } = {
    _privateData: state,
    async releaseInfo(info: string) {
      state.releaseInfo = info;
      return fogbender;
    },
    async setClientUrl(_url: string) {
      state.url = _url;
      updateConfigured();
      return fogbender;
    },
    async setToken(_token: Token) {
      state.token = _token;
      updateConfigured();
      return fogbender;
    },
    async isClientConfigured() {
      const snapshot = {
        getValue: () => state.events.configured,
        subscribe: (cb: (s: Snapshot<boolean>) => void) => {
          const listener = () => cb(snapshot);
          state.events.addEventListener("configured", listener);
          return () => {
            state.events.removeEventListener("configured", listener);
          };
        },
      };
      return snapshot;
    },
    async createFloatingWidget() {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      createFloatingWidget(state, state.url, state.token);
      return fogbender;
    },
    async renderIframe(opts) {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      state.iframe = renderIframe(state, { ...opts, token: state.token, url: state.url });
      return fogbender;
    },
  };
  return fogbender;
};
