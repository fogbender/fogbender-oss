import { createNewFogbender } from "fogbender";
import React from "react";
import { Fogbender } from ".";

export interface FogbenderProviderProps {
  fogbender?: Fogbender;
  children?: React.ReactNode;
}

const context = React.createContext<Fogbender | undefined>(undefined);

context.displayName = "FogbenderProvider";

export const useFogbender = () => {
  const fogbender = React.useContext(context);

  if (!fogbender) {
    throw new Error("No fogbender set, use FogbenderProvider to set one");
  }

  return fogbender;
};

export const FogbenderProvider: React.FC<FogbenderProviderProps> = ({ fogbender, children }) => {
  const defaultFogbender = React.useRef<Fogbender | undefined>();
  const value = fogbender || (defaultFogbender.current = createNewFogbender());
  return <context.Provider value={value}>{children}</context.Provider>;
};
