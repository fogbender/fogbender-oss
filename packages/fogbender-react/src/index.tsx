import React from "react";
import { Badge, Fogbender, Token, createNewFogbender, NewFogbenderType } from "fogbender";
import { FogbenderProvider, useFogbender, FogbenderProviderProps } from "./FogbenderProvider";
import { FogbenderIsConfigured } from "./FogbenderIsConfigured";
import { noopCleanup, useRenderComponent } from "./utils";

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
    fb.setToken(addVersion(token));
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
  useRenderComponent(() => {
    if (divRef.current) {
      return fogbender.renderIframe({ headless, rootEl: divRef.current });
    } else {
      return noopCleanup();
    }
  });
};

export const FogbenderFloatingWidget: React.FC = () => {
  useCreateFloatingWidget();
  return null;
};

const useCreateFloatingWidget = () => {
  const fogbender = useFogbender();
  useRenderComponent(() => {
    return fogbender.createFloatingWidget();
  });
};

export const FogbenderUnreadBadge: React.FC = React.memo(() => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderUnreadBadge(divRef);
  return <div ref={divRef} />;
});

const useRenderUnreadBadge = (divRef: React.RefObject<HTMLDivElement | null>) => {
  const fogbender = useFogbender();
  useRenderComponent(() => {
    if (divRef.current) {
      return fogbender.renderUnreadBadge({ el: divRef.current });
    } else {
      return noopCleanup();
    }
  });
};

export const FogbenderConfig: React.FC<{
  clientUrl: string | undefined;
  token: Token | undefined;
}> = ({ clientUrl, token }) => {
  const fogbender = useFogbender();
  React.useEffect(() => {
    fogbender.setClientUrl(clientUrl);
    return () => {
      fogbender.setClientUrl(undefined);
    };
  }, [clientUrl]);
  React.useEffect(() => {
    fogbender.setToken(addVersion(token));
    return () => {
      fogbender.setToken(undefined);
    };
  }, [token]);
  return null;
};

function addVersion(token: Token | undefined) {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-react"] = "0.1.0";
  }
  return token;
}
