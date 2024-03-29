import type { Env, Token, Badge, Fogbender, FogbenderLoader, Snapshot } from "./types";
export type { Env, Token, Badge, Fogbender, FogbenderLoader, Snapshot };

export { checkToken, isUserToken, isVisitorToken } from "./checkToken";

export const createNewFogbender = (): Fogbender => {
  const state = {
    versions: {} as { [key: string]: string },
    env: undefined as Env | undefined,
    token: undefined as Token | undefined,
    url: undefined as string | undefined,
    iframe: undefined as HTMLIFrameElement | undefined,
    chatWindow: null as null | Window,
    mode: "light" as "light" | "dark",
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
    async setClientUrl(_url: string) {
      state.url = _url;
      return fogbender;
    },
    async setToken(token) {
      state.token = token;
      if (state.token) {
        state.token = {
          ...state.token,
          versions: { ...state.token.versions, ...state.versions, fogbender: "0.0.1" },
        };
      }
      return fogbender;
    },
    async isClientConfigured() {
      return undefined as any;
    },
    async createFloatingWidget() {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      return () => {};
    },
    async renderIframe() {
      if (!state.url) {
        throw new Error("Fogbender: no url given");
      }
      if (!state.token) {
        throw new Error("Fogbender: no token given");
      }
      return () => {};
    },
    async renderUnreadBadge() {
      return () => {};
    },
    async setMode(_mode: "light" | "dark") {
      state.mode = _mode;
      return fogbender;
    },
  };
  return fogbender;
};
