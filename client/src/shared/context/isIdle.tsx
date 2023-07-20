import React from "react";

import { useIdle } from "../utils/useIdle";

function useProviderValue() {
  const isIdle = useIdle(10e3, true); // idle after 10 seconds, idle on start
  return isIdle;
}

type Context = ReturnType<typeof useProviderValue>;

const IsIdleContext = React.createContext<Context | undefined>(undefined);
IsIdleContext.displayName = "IsIdleContext";

export const IsIdleProvider = (props: { children: React.ReactNode }) => {
  const value = useProviderValue();
  return <IsIdleContext.Provider value={value} {...props} />;
};

export function useIsIdle() {
  const context = React.useContext(IsIdleContext);
  if (context === undefined) {
    throw new Error(`useIsIdle must be used within a IsIdleProvider`);
  }
  return context;
}
