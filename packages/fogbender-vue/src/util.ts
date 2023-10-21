import { Env, Fogbender, Token } from "fogbender";
import { InjectionKey, Slot } from "vue";

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export const addVersion = (token?: Token): Token | undefined => {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-vue"] = "0.1.4";
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

export const slot = (s: Slot | any, attrs?: any) => {
  if (typeof s == "function") return s(attrs);
  return s;
};

export const fogbender: InjectionKey<Fogbender> = Symbol("fogbender");
