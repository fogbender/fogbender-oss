import type { Token } from "fogbender-react";
import { atom, type PrimitiveAtom, useAtomValue } from "jotai";

import { getWidgetIdAndKey } from "./config";

const { widgetId, widgetKey } = getWidgetIdAndKey();

export const atomWithStorageAndQsOverride = <T>(
  key: string,
  initialValue: T,
  parse: (qs: URLSearchParams) => T | undefined | null,
  merge?: (oldValue: T, newValue: T) => T
): PrimitiveAtom<T> => {
  const getQsValue = (() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("override")) {
      const value = parse(queryParams);
      if (value) {
        return value;
      }
    }
    return initialValue;
  })();
  const getLSValue = (() => {
    const item = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (item !== null) {
      try {
        return JSON.parse(item) as T;
      } catch (e) {
        console.error(e);
      }
    }
    return initialValue;
  })();
  const getInitialValue = () => {
    if (getQsValue !== initialValue) {
      const value = merge ? merge(getLSValue, getQsValue) : getQsValue;
      sessionStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
    if (getLSValue !== initialValue) {
      return getLSValue;
    }
    return initialValue;
  };
  const baseAtom = atom(getInitialValue());
  let emptyValueMemo: string | undefined;
  const derivedAtom = atom(
    get => get(baseAtom),
    (get, set, update) => {
      const nextValue = typeof update === "function" ? update(get(baseAtom)) : update;
      set(baseAtom, nextValue);
      try {
        const stringified = JSON.stringify(nextValue);
        emptyValueMemo = emptyValueMemo || JSON.stringify(initialValue);
        if (emptyValueMemo === stringified) {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, stringified);
          localStorage.setItem(key, stringified);
        }
      } catch (e) {
        console.error(e);
      }
    }
  );
  return derivedAtom;
};

export const vendorNameAtom = atomWithStorageAndQsOverride("vendorName", "", q =>
  q.get("vendorName")
);

export function useVendorName() {
  const vendorName = useAtomValue(vendorNameAtom);
  return vendorName || "Diesel Engine, Inc.";
}

export const tokenAtom = atomWithStorageAndQsOverride<Partial<Token>>(
  "token",
  {},
  s => {
    try {
      const props = (
        [
          "widgetId",
          "widgetKey",
          "visitorKey",
          "customerId",
          "customerName",
          "userId",
          "userHMAC",
          "userJWT",
          "userPaseto",
          "userName",
          "userAvatarUrl",
          "userEmail",
        ] as const
      )
        .map(key => [key, s.get(key)] as const)
        .filter(([_, value]) => Boolean(value));
      if (props.length) {
        return Object.fromEntries(props);
      }
    } catch (e) {
      console.error(e);
    }
    return undefined;
  },
  (oldValue, newValue) => ({ ...oldValue, ...newValue })
);

export function useStorageToken() {
  return useAtomValue(tokenAtom);
}

export function useCustomerName() {
  return useAtomValue(tokenAtom)?.customerName;
}

export const defaultToken: Token = {
  widgetId,
  widgetKey,
  customerId: "marin_farm_llc",
  customerName: "Marin Farm LLC",
  userId: "john_doe",
  userName: "John Doe",
  userAvatarUrl: undefined,
  userEmail: "john_doe@example.com",
  versions: {
    "vendor-demo": "0.1.0",
  },
};

export function useUserProfile() {
  const localToken = useStorageToken();
  const userName = localToken?.userName || defaultToken.userName;
  const userEmail = localToken?.userEmail || defaultToken.userEmail;
  const userId = localToken?.userId;
  const userPicture =
    localToken?.userAvatarUrl ||
    defaultToken.userAvatarUrl ||
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${btoa(userId || "")}`;

  return { userName, userEmail, userPicture };
}
