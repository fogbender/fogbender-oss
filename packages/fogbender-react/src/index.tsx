import React from "react";
import { Badge, Fogbender, Token, createNewFogbender, NewFogbenderType } from "fogbender";
import { FogbenderProvider, useFogbender, FogbenderProviderProps } from "./FogbenderProvider";
import { FogbenderIsConfigured } from "./FogbenderIsConfigured";

export {
  Badge,
  Fogbender,
  Token,
  createNewFogbender,
  NewFogbenderType,
  FogbenderProvider,
  useFogbender,
  FogbenderProviderProps,
  FogbenderIsConfigured,
};

export const FogbenderSimpleWidget: React.FC<{
  clientUrl: string;
  token: Token;
}> = ({ clientUrl, token }) => {
  const [fogbender, setFogbender] = React.useState(undefined as NewFogbenderType | undefined);
  React.useEffect(() => {
    const fb = createNewFogbender();
    fb.setClientUrl(clientUrl);
    fb.setToken(token);
    setFogbender(fb);
  }, []);
  if (!fogbender) {
    return null;
  }
  return (
    <FogbenderProvider fogbender={fogbender}>
      <FogbenderWidget />
    </FogbenderProvider>
  );
};

export const FogbenderWidget: React.FC = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, false);
  return <div ref={divRef} />;
};

export const FogbenderHeadlessWidget: React.FC = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, true);
  return <div ref={divRef} />;
};

const useRenderIframe = (divRef: React.RefObject<HTMLDivElement | null>, headless: boolean) => {
  const fogbender = useFogbender();
  React.useEffect(() => {
    if (divRef.current) {
      fogbender.renderIframe({ headless, rootEl: divRef.current });
    }
    return () => {
      // fogbender.destroyIframe()
    };
  }, [divRef.current]);
};

export const FogbenderFloatingWidget: React.FC = () => {
  useCreateFloatingWidget();
  return null;
};

const useCreateFloatingWidget = () => {
  const fogbender = useFogbender();
  React.useEffect(() => {
    fogbender.createFloatingWidget();
    return () => {
      // fogbender.destroyFloatingWidget()
    };
  }, []);
};

export const FogbenderConfig: React.FC<{
  clientUrl: string | undefined;
  token: Token | undefined;
}> = ({ clientUrl, token }) => {
  const fogbender = useFogbender();
  React.useEffect(() => {
    fogbender.setClientUrl(clientUrl);
  }, [clientUrl]);
  React.useEffect(() => {
    fogbender.setToken(token);
  }, [token]);
  return null;
};
