import { checkToken, isVisitorToken } from "./checkToken";
import { createEvents, renderIframe } from "./createIframe";
import { createFloatingWidget } from "./floatingWidget";
import { renderUnreadBadge } from "./renderUnreadBadge";
import type { Env, Fogbender, Token, VisitorInfo } from "./types";
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
  const lightDarkModeKey = (widgetId: string) => `light-dark-mode-${widgetId}`;
  const state = {
    versions: {} as { [key: string]: string },
    env: undefined as Env | undefined,
    token: undefined as Token | undefined,
    url: defaultUrl as string | undefined,
    events: createEvents(),
    chatWindow: null as null | Window,
    mode: "dark" as "light" | "dark",
    roomCreationEnabled: false,
    setIframeMode: undefined as ((mode: "light" | "dark") => void) | undefined,
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
  const storeVisitorInfo = (info: VisitorInfo) => {
    if (state.token) {
      state.token.visitorToken = info.token;
    }
    const { widgetId } = info;
    try {
      localStorage.setItem(`visitor-${widgetId}`, JSON.stringify(info));
    } catch (e) {
      console.error(e);
    }
  };
  const storeLightDarkModeInfo = (mode: "light" | "dark") => {
    if (state.token) {
      const { widgetId } = state.token;
      try {
        localStorage.setItem(lightDarkModeKey(widgetId), mode);
      } catch (e) {
        console.error(e);
      }
    }
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
    async setMode(mode) {
      state.mode = mode;
      if (state.setIframeMode) {
        state.setIframeMode(mode);
      }
      return fogbender;
    },
    async setRoomCreation(isEnabled) {
      state.roomCreationEnabled = isEnabled;
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

      if (token) {
        try {
          const { widgetId } = token;
          const mode = localStorage.getItem(lightDarkModeKey(widgetId));
          if (mode && ["light", "dark"].includes(mode)) {
            state.mode = mode as "light" | "dark";
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (state.token) {
        state.token = {
          ...state.token,
          versions: { ...state.token.versions, ...state.versions, fogbender: "0.7.1" },
          visitorToken,
          visitUrl: (() => {
            try {
              return window.parent.location.toString();
            } catch {
              return undefined;
            }
          })(),
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
      return createFloatingWidget(
        state,
        openWindow,
        el => {
          const rerender = () => {
            return renderIframe(
              state,
              {
                rootEl: el,
                env,
                token,
                url,
                disableFit: true,
                onVisitorInfo: (info, reload) => {
                  storeVisitorInfo(info);
                  if (reload) {
                    cleanup();
                    const { cleanup: cleanup2, setIframeMode } = rerender();
                    state.setIframeMode = setIframeMode;
                    cleanup = cleanup2;
                  }
                },
                onLightDarkModeInfo: mode => storeLightDarkModeInfo(mode),
                initialMode: () => state.mode,
                isFloaty: true,
                roomCreationEnabled: state.roomCreationEnabled,
              },
              openWindow
            );
          };
          const { cleanup: cleanup0, setIframeMode } = rerender();
          state.setIframeMode = setIframeMode;
          let cleanup = cleanup0;
          return () => {
            cleanup();
          };
        },
        opts
      );
    },
    async renderIframe(opts) {
      const rerender = () => {
        if (!state.url) {
          throw new Error("Fogbender: no url given");
        }
        if (!state.token) {
          throw new Error("Fogbender: no token given");
        }
        return renderIframe(
          state,
          {
            ...opts,
            env: state.env,
            token: state.token,
            url: state.url,
            onVisitorInfo: (info, reload) => {
              storeVisitorInfo(info);
              if (reload) {
                cleanup();
                const { cleanup: cleanup3, setIframeMode } = rerender();
                state.setIframeMode = setIframeMode;
                cleanup = cleanup3;
              }
            },
            onLightDarkModeInfo: mode => storeLightDarkModeInfo(mode),
            initialMode: () => state.mode,
            roomCreationEnabled: state.roomCreationEnabled,
          },
          openWindow
        );
      };
      const { cleanup: cleanup1, setIframeMode } = rerender();
      state.setIframeMode = setIframeMode;
      let cleanup = cleanup1;
      return () => {
        cleanup();
      };
    },
    async renderUnreadBadge(opts) {
      const cleanup = renderUnreadBadge(state, openWindow, opts);
      return cleanup;
    },
  };
  return fogbender;
};
