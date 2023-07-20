import React from "react";

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export function useRenderComponent(componentRenderer: () => Promise<() => void>) {
  React.useEffect(() => {
    const promise = componentRenderer();
    return () => {
      promise.then(cleanup => cleanup());
    };
  }, [componentRenderer]);
}
