import React from "react";
import { useFogbender } from "./FogbenderProvider";

export const FogbenderIsConfigured: React.FC = ({ children }) => {
  const isConfigured = useIsConfigured();
  if (isConfigured) {
    return <>{children}</>;
  } else {
    return null;
  }
};

export function useIsConfigured() {
  const [isConfigured, setIsConfigured] = React.useState(false);
  const fogbender = useFogbender();
  React.useEffect(() => {
    const unsub = [] as (() => void)[];
    const run = async () => {
      const snapshot = await fogbender.isClientConfigured();
      setIsConfigured(snapshot.getValue());
      unsub.push(
        snapshot.subscribe(s => {
          setIsConfigured(s.getValue());
        })
      );
    };
    run();
    return () => {
      unsub.forEach(u => u());
    };
  }, [fogbender]);
  return isConfigured;
}
