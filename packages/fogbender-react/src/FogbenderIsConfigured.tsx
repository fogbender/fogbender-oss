import React from "react";
import type { Snapshot } from "fogbender";
import { useFogbender } from "./FogbenderProvider";

export const FogbenderIsConfigured: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const isConfigured = useIsConfigured();
  if (isConfigured) {
    return <>{children}</>;
  } else {
    return null;
  }
};

export function useIsConfigured() {
  const fogbender = useFogbender();
  return useFromSnapshot(async () => {
    return fogbender.isClientConfigured();
  }, false);
}

export function useFromSnapshot<T>(snapshotGen: () => Promise<Snapshot<T>>, initialValue: T) {
  const [value, setValue] = React.useState(initialValue);
  const fogbender = useFogbender();
  React.useEffect(() => {
    const unsub = [] as (() => void)[];
    const run = async () => {
      const snapshot = await snapshotGen();
      unsub.push(snapshot.subscribe(setValue));
    };
    run();
    return () => {
      unsub.forEach(u => u());
    };
  }, [fogbender]);
  return value;
}
