import React from "react";
import { type Badge, Env, Token, createNewFogbender, Fogbender } from "fogbender";
import { FogbenderProvider, useFogbender, FogbenderProviderProps } from "./FogbenderProvider";
import { FogbenderIsConfigured } from "./FogbenderIsConfigured";
import { noopCleanup, useRenderComponent } from "./utils";

export {
  type Badge,
  Env,
  Token,
  createNewFogbender,
  Fogbender,
  FogbenderProvider,
  useFogbender,
  FogbenderProviderProps,
  FogbenderIsConfigured,
};

type RoomyWidgetProps = {
  clientUrl?: string;
  env?: Env;
  token: Token;
};

// old name; new name is FogbenderSimpleRoomyWidget
export const FogbenderSimpleWidget = ({ clientUrl, env, token }: RoomyWidgetProps) => {
  const [fogbender, setFogbender] = React.useState(undefined as Fogbender | undefined);
  React.useEffect(() => {
    const fb = createNewFogbender();
    fb.setClientUrl(clientUrl);
    fb.setEnv(env);
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

// old name; new name is FogbenderRoomyWidget
export const FogbenderWidget = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, false);
  return <div ref={divRef} />;
};

export const FogbenderHeadlessWidget = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, true);
  return <div ref={divRef} />;
};

const useRenderIframe = (divRef: React.RefObject<HTMLDivElement | null>, headless: boolean) => {
  const fogbender = useFogbender();
  useRenderComponent(
    React.useCallback(() => {
      if (divRef.current) {
        return fogbender.renderIframe({ headless, rootEl: divRef.current });
      } else {
        return noopCleanup();
      }
    }, [fogbender, headless])
  );
};

type FloatyWidgetProps = {
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
  defaultOpen?: boolean;
};

// old name; new name is FogbenderFloatyWidget
export const FogbenderFloatingWidget = (props: FloatyWidgetProps) => {
  useCreateFloatingWidget(props);

  return null;
};

const useCreateFloatingWidget = ({
  verbose,
  openInNewTab,
  closeable,
  defaultOpen,
}: FloatyWidgetProps) => {
  const fogbender = useFogbender();
  useRenderComponent(
    React.useCallback(() => {
      return fogbender.createFloatingWidget({ verbose, openInNewTab, closeable, defaultOpen });
    }, [fogbender, verbose, openInNewTab, closeable])
  );
};

export const FogbenderUnreadBadge = React.memo(() => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderUnreadBadge(divRef);
  return <div ref={divRef} />;
});

const useRenderUnreadBadge = (divRef: React.RefObject<HTMLDivElement | null>) => {
  const fogbender = useFogbender();
  useRenderComponent(
    React.useCallback(() => {
      if (divRef.current) {
        return fogbender.renderUnreadBadge({ el: divRef.current });
      } else {
        return noopCleanup();
      }
    }, [fogbender])
  );
};

export const FogbenderConfig: React.FC<{
  clientUrl?: string;
  env?: Env;
  token: Token | undefined;
  mode?: "light" | "dark";
}> = ({ clientUrl, env, token, mode = "light" }) => {
  const fogbender = useFogbender();
  React.useEffect(() => {
    fogbender.setClientUrl(clientUrl);
    return () => {
      fogbender.setClientUrl(undefined);
    };
  }, [clientUrl]);
  React.useEffect(() => {
    fogbender.setEnv(env);
    return () => {
      fogbender.setEnv(undefined);
    };
  }, [clientUrl]);
  React.useEffect(() => {
    fogbender.setToken(addVersion(token));
    return () => {
      fogbender.setToken(undefined);
    };
  }, [token]);
  React.useEffect(() => {
    fogbender.setMode(mode);
  }, [mode]);
  return null;
};

function addVersion(token: Token | undefined) {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-react"] = "0.4.0";
  }
  return token;
}

type SimpleFloatyWidgetProps = {
  token: Token;
  clientUrl?: string | undefined;
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
};

// old name; new name is FogbenderSimpleFloatyWidget
export const FogbenderSimpleFloatie = ({
  token,
  clientUrl,
  openInNewTab,
  verbose,
  closeable,
}: SimpleFloatyWidgetProps) => {
  const fogbender = React.useMemo(createNewFogbender, []);
  return (
    <FogbenderProvider fogbender={fogbender}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        <FogbenderFloatingWidget
          key={"" + verbose + ":" + openInNewTab + ":" + closeable}
          verbose={verbose}
          openInNewTab={openInNewTab}
          closeable={closeable}
        />
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const FogbenderRoomyWidget = FogbenderWidget;
export const FogbenderSimpleRoomyWidget = FogbenderSimpleWidget;
export const FogbenderFloatyWidget = FogbenderFloatingWidget;
export const FogbenderSimpleFloatyWidget = FogbenderSimpleFloatie;
