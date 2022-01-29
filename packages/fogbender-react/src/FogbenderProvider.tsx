import React from "react";
import { Fogbender } from ".";

export interface FogbenderProviderProps {
  fogbender: Fogbender;
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
  React.useEffect(() => {
    // fogbender.mount();
    return () => {
      //   fogbender.destroy();
    };
  }, [fogbender]);

  return <context.Provider value={fogbender}>{children}</context.Provider>;
};
