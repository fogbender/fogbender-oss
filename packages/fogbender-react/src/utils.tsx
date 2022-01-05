import React from "react";

export const noopCleanup = async () => {
  return () => {};
};

export function useRenderComponent(componentRenderer: () => Promise<() => void>) {
  const isMounted = React.useRef(false);
  let cleanup: () => void = () => {};
  React.useEffect(() => {
    isMounted.current = true;
    componentRenderer().then(componentCleanup => {
      if (!isMounted.current) {
        // promise was resolved after component was unmounted, so there's no way to render
        componentCleanup();
      } else {
        // default case: use component cleanup function when component is unmounted
        cleanup = componentCleanup;
      }
    });
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, []);
}
