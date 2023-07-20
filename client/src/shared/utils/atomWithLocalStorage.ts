import { atom, PrimitiveAtom } from "jotai";

import { SafeLocalStorage } from "../utils/SafeLocalStorage";

export const atomWithLocalStorage = <T>(key: string, initialValue: T): PrimitiveAtom<T> => {
  const getInitialValue = () => {
    const item = SafeLocalStorage.getItem(key);
    if (item !== null) {
      try {
        return JSON.parse(item) as T;
      } catch (e) {
        console.error(e);
      }
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
          SafeLocalStorage.removeItem(key);
        } else {
          SafeLocalStorage.setItem(key, stringified);
        }
      } catch (e) {
        console.error(e);
      }
    }
  );
  return derivedAtom;
};

export const atomWithRealTimeLocalStorage = <T>(key: string, initialValue: T): PrimitiveAtom<T> => {
  const supports = typeof BroadcastChannel !== "undefined";
  const getInitialValue = () => {
    try {
      const item = SafeLocalStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch (e) {
      console.error(e);
    }
    return initialValue;
  };
  const baseAtom = atom(getInitialValue());
  let callbackMemo: ((value: string) => void) | undefined;
  if (supports) {
    baseAtom.onMount = setAtom => {
      const channel = new BroadcastChannel("ls-update-channel-" + key);
      channel.onmessage = event => {
        event.data && setAtom(JSON.parse(event.data) as T);
      };
      callbackMemo = value => channel.postMessage(JSON.stringify(value));
      setAtom(getInitialValue());
      return () => {
        callbackMemo = undefined;
        channel.close();
      };
    };
  }
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
          SafeLocalStorage.removeItem(key);
        } else {
          SafeLocalStorage.setItem(key, stringified);
        }
      } catch (e) {
        console.error(e);
      }
      callbackMemo?.(nextValue);
    }
  );
  return derivedAtom;
};
