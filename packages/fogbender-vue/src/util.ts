import { Token, Fogbender, Env } from "fogbender";

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export const addVersion = (token?: Token): Token | undefined => {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-vue"] = "0.1.0";
  }
  return token;
};

export const renderWidget = (
  fogbender: Fogbender,
  htmlElem: any,
  headless: boolean,
  isMounted: boolean,
  setCleanup: (cleanup: () => void) => void
) => {
  renderComponent(
    () => {
      if (htmlElem) {
        return fogbender.renderIframe({
          headless,
          rootEl: htmlElem,
        });
      } else {
        return noopCleanup();
      }
    },
    isMounted,
    setCleanup
  );
};

export const renderComponent = (
  componentRenderer: () => Promise<() => void>,
  isMounted: boolean,
  setCleanup: (cleanup: () => void) => void
) => {
  isMounted = true;
  componentRenderer().then(componentCleanup => {
    if (!isMounted) {
      componentCleanup();
    } else {
      setCleanup(componentCleanup);
    }
  });
};

export const configureFogbender = (fb: Fogbender, token?: Token, clientUrl?: string, env?: Env) => {
  fb.setClientUrl(clientUrl);
  fb.setEnv(env);
  fb.setToken(addVersion(token));
};
