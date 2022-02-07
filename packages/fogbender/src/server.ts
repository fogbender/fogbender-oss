import type { Token, Badge, Fogbender, FogbenderLoader, Snapshot } from "./types";
export type { Token, Badge, Fogbender, FogbenderLoader, Snapshot };

export { checkToken } from "./checkToken";

export const createNewFogbender = (): Fogbender => {
  const state = {
    versions: {} as { [key: string]: string },
    token: undefined as Token | undefined,
    url: undefined as string | undefined,
    iframe: undefined as HTMLIFrameElement | undefined,
    chatWindow: null as null | Window,
  };
  const fogbender: Fogbender & { _privateData: any } = {
    _privateData: state,
    async setVersion(tag, version) {
      state.versions[tag] = version;
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
  };
  return fogbender;
};
