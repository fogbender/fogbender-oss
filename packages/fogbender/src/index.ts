import { checkToken, isVisitorToken } from "./checkToken";
import { createEvents, renderIframe } from "./createIframe";
import { createFloatingWidget } from "./floatingWidget";
import { renderUnreadBadge } from "./renderUnreadBadge";
import type { Env, Fogbender, Token } from "./types";
export type {
  Env,
  Token,
  FallbackToken,
  VisitorToken,
  UserToken,
  Badge,
  Fogbender,
  FogbenderLoader,
  Snapshot,
} from "./types";
export { checkToken, isUserToken, isVisitorToken } from "./checkToken";

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
      // true means bad
      if (tokenCheck) {
        throw new Error("Wrong token format:\n" + JSON.stringify(tokenCheck, null, 1));
      }
      state.token = token;
      let visitorToken = undefined as undefined | string;
      if (isVisitorToken(token)) {
        const { widgetId } = token;
        const key = `visitor-${widgetId}`;
        try {
          const visitorInfo = localStorage.getItem(key);
          if (visitorInfo) {
            const info = JSON.parse(visitorInfo);
            visitorToken = info.token;
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (state.token) {
        state.token = {
          ...state.token,
          versions: { ...state.token.versions, ...state.versions, fogbender: "0.2.3" },
          visitorToken,
        };
      }
      updateConfigured();
      return fogbender;
    },
    async isClientConfigured() {
      const snapshot = {
        getValue: () => state.events.configured,
        subscribe: (cb: (value: boolean) => void) => {
          cb(state.events.configured);
          return state.events.on("configured", cb);
        },
      };
      return snapshot;
    },
    async createFloatingWidget(opts = {}) {
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
