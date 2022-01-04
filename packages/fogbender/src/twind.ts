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

let signletonHolder: ReturnType<typeof createSheet> | undefined;

export function getSheet() {
  const { sheet } = signletonHolder || (signletonHolder = createSheet());
  setup({
    sheet,
    theme: {
      extend: {
        colors: {
          "brand-red-500": "#FA3541",
        },
      },
    },
  });
  return signletonHolder;
}
