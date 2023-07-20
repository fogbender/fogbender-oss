// https://github.com/streamich/react-use/blob/master/src/useIdle.ts

import { useEffect, useRef, useState } from "react";
import { throttle } from "throttle-debounce";

import { off, on } from "./onOff";

const defaultEvents = ["mousemove", "mousedown", "resize", "keydown", "touchstart", "wheel"];
const oneMinute = 60e3;

export const useIdle = (
  ms: number = oneMinute,
  isIdleOnStart = false,
  events: string[] = defaultEvents
): boolean => {
  const visibleRef = useRef(true);
  const [isIdle, setIsIdle] = useState<boolean>(isIdleOnStart);

  useEffect(() => {
    let mounted = true;
    let timeout: number;
    let localState: boolean = isIdle;

    const setIdle = (newIsIdle: boolean) => {
      if (mounted) {
        localState = newIsIdle;
        setIsIdle(newIsIdle);
      }
    };

    const onEvent = throttle(50, () => {
      if (localState) {
        if (!document.hidden && visibleRef.current) {
          setIdle(false);
          window.clearTimeout(timeout);
          timeout = window.setTimeout(() => setIdle(true), ms);
        }
      }
    });

    const onVisible = () => {
      if (!document.hidden) {
        visibleRef.current = true;
        onEvent();
      }
    };

    const onNotVisible = () => {
      visibleRef.current = false;
      setIdle(true);
    };

    for (let i = 0; i < events.length; i++) {
      on(window, events[i], onEvent);
    }
    on(document, "visibilitychange", onVisible);
    on(window, "blur", onNotVisible);
    on(window, "focus", onVisible);

    timeout = window.setTimeout(() => setIdle(true), ms);

    return () => {
      mounted = false;

      for (let i = 0; i < events.length; i++) {
        off(window, events[i], onEvent);
      }
      off(document, "visibilitychange", onVisible);
      off(window, "blur", onNotVisible);
      off(window, "focus", onVisible);
    };
  }, [ms, events]);

  return isIdle;
};
