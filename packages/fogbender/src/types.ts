// make sure to keep in sync with fogbender-ptoto schema
export type Token = {
  widgetId: string;
  widgetKey?: string;
  customerId: string;
  customerName: string;
  userId: string;
  userHMAC?: string;
  userJWT?: string;
  userPaseto?: string;
  userName: string;
  userAvatarUrl?: string;
  userEmail: string;
  versions?: { [key: string]: string };
};

export type Env = "prod" | "staging" | "dev";

export type Badge = {
  count: number;
  mentionsCount: number;
  roomId: string;
  roomType: string;
};

export type Snapshot<T> = {
  getValue: () => T;
  subscribe: (cb: (s: Snapshot<T>) => void) => () => void;
};

export interface Fogbender {
  setVersion(tag: string, version: string): Promise<Fogbender>;
  setEnv(env: Env | undefined): Promise<Fogbender>;
  setClientUrl(url: string | undefined): Promise<Fogbender>;
  setToken(token: Token | undefined): Promise<Fogbender>;
  isClientConfigured(): Promise<Snapshot<boolean>>;
  renderIframe(opts: {
    rootEl: HTMLElement;
    headless?: boolean;
    disableFit?: boolean;
    onBadges?: (badges: Badge[]) => void;
  }): Promise<() => void>;
  createFloatingWidget(opts?: {
    verbose?: boolean;
    openInNewTab?: boolean;
    closeable?: boolean;
  }): Promise<() => void>;
  renderUnreadBadge(otps: { el: HTMLElement }): Promise<() => void>;
}
export type FogbenderLoader = {
  _load: (clientUrl: string, onLoad: () => void) => Promise<Fogbender>;
  _once: boolean;
  _queue: [
    methodName: keyof Fogbender,
    args: any[],
    resolve: (value: any) => any,
    reject: (value: any) => any
  ][];
  _fogbender?: Fogbender;
};
