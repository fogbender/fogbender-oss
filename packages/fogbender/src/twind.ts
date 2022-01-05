import { domSheet } from "twind/sheets";
import { cssomSheet, setup } from "twind";

const createSheet = () => {
  let attach = (_root: ShadowRoot | null) => {};
  const fastCss = (() => {
    try {
      return !!new CSSStyleSheet();
    } catch (e) {
      return false;
    }
  })();

  if (fastCss) {
    const target = new CSSStyleSheet();
    attach = (root: ShadowRoot | null) => {
      if (root) {
        (root as ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = [
          target,
        ];
      }
    };
    return { sheet: cssomSheet({ target }), attach };
  } else {
    const target = document.createElement("style");
    attach = (root: ShadowRoot | null) => {
      root?.appendChild(target);
    };
    return { sheet: domSheet({ target }), attach };
  }
};

const createTwind = () => {
  const sheet = createSheet();

  setup({
    sheet: sheet.sheet,
    theme: {
      extend: {
        colors: {
          "brand-red-500": "#FA3541",
        },
      },
    },
  });
  return sheet;
};

let singletonHolder: ReturnType<typeof createTwind> | undefined;

export function getTwind() {
  return singletonHolder || (singletonHolder = createTwind());
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface NodeModule {
    hot?: {
      data: { singletonHolder?: typeof singletonHolder };
      dispose: (callback: (data: { singletonHolder?: typeof singletonHolder }) => void) => void;
    };
  }
}

if (module.hot) {
  singletonHolder = module.hot?.data?.singletonHolder || singletonHolder;
  module.hot.dispose(data => {
    data.singletonHolder = singletonHolder;
  });
}
