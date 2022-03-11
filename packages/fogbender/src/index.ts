import { checkToken } from "./checkToken";
import { createEvents, renderIframe } from "./createIframe";
import { createFloatingWidget } from "./floatingWidget";
import { renderUnreadBadge } from "./renderUnreadBadge";
import type { Env, Token, Badge, Fogbender, FogbenderLoader, Snapshot } from "./types";
export type { Env, Token, Badge, Fogbender, FogbenderLoader, Snapshot };
export { checkToken } from "./checkToken";

export const createNewFogbender = (): Fogbender => {
  const defaultUrl = "https://client.fogbender.com";
  const state = {
    versions: {} as { [key: string]: string },
    env: undefined as Env | undefined,
    token: undefined as Token | undefined,
    url: defaultUrl as string | undefined,
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
    async setEnv(env) {
      state.env = env;
      return fogbender;
    },
    async setClientUrl(_url) {
      state.url = _url === undefined ? defaultUrl : _url;
      updateConfigured();
      return fogbender;
    },
    async setToken(token) {
      const tokenCheck = checkToken(token);
      if (tokenCheck) {
        throw new Error("Wrong token format:\n" + JSON.stringify(tokenCheck, null, 1));
      }
      state.token = token;
      if (state.token) {
        state.token = {
          ...state.token,
          versions: { ...state.token.versions, ...state.versions, fogbender: "0.0.6" },
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
      const { token, url, env } = state;
      const cleanup = createFloatingWidget(
        state,
        openWindow,
        el => renderIframe(state, { rootEl: el, env, token, url, disableFit: true }, openWindow),
        opts
      );
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
        { ...opts, env: state.env, token: state.token, url: state.url },
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
