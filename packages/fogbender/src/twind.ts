import { domSheet } from "twind/sheets";
import { cssomSheet } from "twind";

const sheet = () => {
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

let signletonHolder: ReturnType<typeof sheet> | undefined;

export function getSheet() {
  return signletonHolder || (signletonHolder = sheet());
}
