import React from "react";

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export function useRenderComponent(componentRenderer: () => Promise<() => void>) {
  React.useEffect(() => {
    let isMounted = true;
    let cleanup = () => {};
    componentRenderer().then(componentCleanup => {
      if (!isMounted) {
        // promise was resolved after component was unmounted, so there's no way to render
        componentCleanup();
      } else {
        // default case: use component cleanup function when component is unmounted
        cleanup = componentCleanup;
      }
    });
    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);
}
