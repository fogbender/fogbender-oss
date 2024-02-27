/* eslint-disable no-unused-vars */
import { JSX as JSX_ } from "solid-js";

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSX_.IntrinsicElements {}
    type Element = JSX_.Element;
    // etc
  }
  interface Window {
    isMobile: () => boolean;
    opera: any;
  }
}
