import { createFloatingWidget } from "./floatingWidget";

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

export interface NewFogbenderType {
  createFloatingWidget(rootEl: HTMLElement, url: string, token: Token): Promise<NewFogbenderType>;
}

export const createNewFogbender = (): NewFogbenderType => {
  const fogbender: NewFogbenderType = {
    async createFloatingWidget(rootEl, url, token) {
      createFloatingWidget(rootEl, url, token);
      return fogbender;
    },
  };
  return fogbender;
};
