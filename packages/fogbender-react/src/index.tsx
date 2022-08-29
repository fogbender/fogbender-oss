import React from "react";
import { Badge, Env, Token, createNewFogbender, Fogbender } from "fogbender";
import { FogbenderProvider, useFogbender, FogbenderProviderProps } from "./FogbenderProvider";
import { FogbenderIsConfigured } from "./FogbenderIsConfigured";
import { noopCleanup, useRenderComponent } from "./utils";

export {
  Badge,
  Env,
  Token,
  createNewFogbender,
  Fogbender,
  FogbenderProvider,
  useFogbender,
  FogbenderProviderProps,
  FogbenderIsConfigured,
};

type FogbenderWidgetOptions = {
  height?: string;
  disableFit?: boolean;
  cssWidth?: string;
  cssHeight?: string;
};

export const FogbenderSimpleWidget: React.FC<{
  clientUrl?: string;
  env?: Env;
  token: Token;
  options?: FogbenderWidgetOptions;
}> = ({ clientUrl, env, token, options }) => {
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
      <FogbenderWidget options={options} />
    </FogbenderProvider>
  );
};

export const FogbenderWidget: React.FC<{ options?: FogbenderWidgetOptions }> = ({ options }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, false, options);
  return <div ref={divRef} />;
};

export const FogbenderHeadlessWidget: React.FC = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useRenderIframe(divRef, true);
  return <div ref={divRef} />;
};

const useRenderIframe = (
  divRef: React.RefObject<HTMLDivElement | null>,
  headless: boolean,
  options?: FogbenderWidgetOptions
) => {
  const fogbender = useFogbender();
  useRenderComponent(
    React.useCallback(() => {
      if (divRef.current) {
        return fogbender.renderIframe({
          headless,
          rootEl: divRef.current,
          disableFit: options?.disableFit === true,
          cssWidth: options?.cssWidth,
          cssHeight: options?.cssHeight,
        });
      } else {
        return noopCleanup();
      }
    }, [fogbender, headless])
  );
};

export const FogbenderFloatingWidget: React.FC<{
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
  defaultOpen?: boolean;
}> = ({ verbose, openInNewTab, closeable, defaultOpen }) => {
  useCreateFloatingWidget({ verbose, openInNewTab, closeable, defaultOpen });
  return null;
};

const useCreateFloatingWidget = ({
  verbose,
  openInNewTab,
  closeable,
  defaultOpen,
}: {
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
  defaultOpen?: boolean;
}) => {
  const fogbender = useFogbender();
  useRenderComponent(
    React.useCallback(() => {
      return fogbender.createFloatingWidget({ verbose, openInNewTab, closeable, defaultOpen });
    }, [fogbender, verbose, openInNewTab, closeable])
  );
};

export const FogbenderUnreadBadge: React.FC = React.memo(() => {
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
}> = ({ clientUrl, env, token }) => {
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
  return null;
};

function addVersion(token: Token | undefined) {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-react"] = "0.2.4";
  }
  return token;
}

export const FogbenderSimpleFloatie: React.FC<{
  token: Token;
  clientUrl?: string | undefined;
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
}> = ({ token, clientUrl, openInNewTab, verbose, closeable }) => {
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
