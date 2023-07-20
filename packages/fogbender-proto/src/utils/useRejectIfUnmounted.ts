import React from "react";

export function useRejectIfUnmounted() {
  const mounted = React.useRef(false);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const rejectIfUnmounted: <T>(res: T) => Promise<T> = React.useCallback(res => {
    return new Promise((resolve, reject) => {
      if (mounted.current) {
        resolve(res);
      } else {
        reject(new Error("Promise canceled because it's called from unmounted component"));
      }
    });
  }, []);

  return rejectIfUnmounted;
}
