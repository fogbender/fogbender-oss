// make sure to keep in sync with fogbender-ptoto schema
export type Token = {
  widgetId: string;
  customerId: string;
  customerName: string;
  userId: string;
  userHMAC?: string;
  userJWT?: string;
  userPaseto?: string;
  userName: string;
  userAvatarUrl?: string;
  userEmail?: string;
};

export type Badge = {
  count: number;
  mentionsCount: number;
  roomId: string;
};

export type Fogbender = (opts: {
  rootEl?: HTMLElement;
  url?: string;
  token?: Token;
  headless?: boolean;
  onBadges?: (badges: Badge[]) => void;
  showFloatingWidget?: boolean;
}) => void;

export type Snapshot<T> = {
  getValue: () => T;
  subscribe: (cb: (s: Snapshot<T>) => void) => () => void;
};

export interface NewFogbenderType {
  releaseInfo(info: string): Promise<NewFogbenderType>;
  setClientUrl(url: string | undefined): Promise<NewFogbenderType>;
  setToken(token: Token | undefined): Promise<NewFogbenderType>;
  isClientConfigured(): Promise<Snapshot<boolean>>;
  renderIframe(opts: {
    rootEl: HTMLElement;
    headless: boolean;
    onBadges?: (badges: Badge[]) => void;
  }): Promise<() => void>;
  createFloatingWidget(): Promise<() => void>;
  renderUnreadBadge(otps: { el: HTMLElement }): Promise<() => void>;
}
export type FogbenderLoader = {
  startLoader: (clientUrl: string, onLoad: () => void) => Promise<NewFogbenderType>;
  _once: boolean;
  _checkOnce: () => boolean;
  _queue: {
    methodName: keyof NewFogbenderType;
    args: any[];
    resolve: (value: any) => any;
    reject: (value: any) => any;
  }[];
  _fogbender?: NewFogbenderType;
  _setFogbender: (fogbender: NewFogbenderType) => void;
};
