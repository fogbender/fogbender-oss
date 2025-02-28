import { cssomSheet, setup, type Sheet } from "twind";

export const sharedSheet = () => {
  const target = document.createElement("style");
  const offset = target.childNodes.length;
  const instances = new Set<HTMLStyleElement>([target]);

  const sheet: Sheet<HTMLStyleElement> = {
    target,
    insert: (rule, index) =>
      instances.forEach(instance => {
        instance.insertBefore(document.createTextNode(rule), instance.childNodes[offset + index]);
      }),
  };
  const attach = (root: ShadowRoot | null) => {
    const instance = target.cloneNode(true) as typeof target;
    instances.add(instance);
    if (instances.size === 100) {
      console.error("Fogbender: oopsie poopsie, too many instances of sharedSheet");
    }
    root?.appendChild(instance);
  };
  return { sheet, attach };
};

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
    return sharedSheet();
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
        fontSize: {
          "2xs": "0.625rem",
        },
        minWidth: {
          "1rem": "1rem",
        },
        minHeight: {
          "1rem": "1rem",
        },
        fill: {
          "white": "#FFF",
          "blue-500": "#3B82F6",
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
  interface NodeModule {
    hot?: {
      data: { singletonHolder?: typeof singletonHolder };
      dispose: (callback: (data: { singletonHolder?: typeof singletonHolder }) => void) => void;
    };
  }
}

if (typeof module === "object" && module.hot) {
  singletonHolder = module.hot?.data?.singletonHolder || singletonHolder;
  module.hot.dispose(data => {
    data.singletonHolder = singletonHolder;
  });
}
