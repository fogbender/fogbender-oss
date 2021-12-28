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
