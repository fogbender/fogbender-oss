import classNames from "classnames";
import DOMPurify from "dompurify";
import React from "react";
import { PiEyeBold, PiEyeClosedBold } from "react-icons/pi";
import { rehype } from "rehype";
import rehypeHighlight from "rehype-highlight";
import { useAtomValue } from "jotai";

import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Clipboard } from "fogbender-client/src/shared/components/Icons";

import { modeAtom } from "fogbender-client/src/shared";

import "highlight.js/lib/common";
// import "highlight.js/styles/base16/one-light.css";

export type MaskMode = "mask" | "clear";

export const HighlightCode: React.FC<{
  className?: string;
  children?: React.ReactNode;
  blurAreas?: {
    line: number;
    column: number;
    length: number;
  }[];
}> = ({ className, blurAreas, children }) => {
  const mode = useAtomValue(modeAtom);

  const styleTag = React.useRef<HTMLStyleElement | null>(null);

  React.useEffect(() => {
    const loadTheme = async (mode: "light" | "dark") => {
      const themeStyle =
        mode === "light"
          ? await fetch("/assets/code-light.css")
              .then(response => response.text())
              .then(css => {
                return css;
              })
          : await fetch("/assets/code-dark.css")
              .then(response => response.text())
              .then(css => {
                return css;
              });

      styleTag.current = document.createElement("style");
      styleTag.current.innerHTML = themeStyle;

      document.head.appendChild(styleTag.current);
    };

    loadTheme(mode);

    if (styleTag.current) {
      document.head.removeChild(styleTag.current);
    }
  }, [mode]);

  const arr = React.Children.toArray(children);
  arr.forEach(node => {
    if (typeof node !== "string") {
      console.error(node);
      throw new Error("HighlightCode component only takes strings as children");
    }
  });
  const text = arr.join("");
  const __html = React.useMemo(() => {
    const pre = document.createElement("pre");
    const code = document.createElement("code");

    code.textContent = text;
    if (className) {
      code.className = className;
    }
    pre.appendChild(code);
    return String(
      rehype().data("settings", { fragment: true }).use(rehypeHighlight).processSync(pre.outerHTML)
    );
  }, [className, text]);
  return (
    <div className="relative border dark:border-green-300 border-opacity-0 dark:border-opacity-100">
      <div className="relative overflow-auto fbr-scrollbar p-4 bg-gray-100 dark:bg-black leading-relaxed">
        <div className="absolute inset-0 m-4 pointer-events-none">
          {blurAreas?.map((x, i) => (
            <div
              key={i}
              className="absolute backdrop-blur-sm backdrop-filter rounded"
              style={{
                height: "calc(1.625 * 1em)",
                width: `calc(${x.length} * 1ch)`,
                top: `calc(${x.line - 1}rem * 1.625)`,
                left: `calc(${x.column} * 1ch)`,
              }}
            >
              &nbsp;
            </div>
          ))}
        </div>
        <div
          ref={el => {
            if (el) {
              el.replaceChildren(DOMPurify.sanitize(__html, { RETURN_DOM: true }));
            }
          }}
        />
      </div>
      <div className="flex items-center justify-center absolute top-2 right-2 h-8 w-8 bg-white dark:bg-gray-700 rounded-lg fog:box-shadow-s">
        <ClipboardCopy text={text}>
          <Clipboard />
        </ClipboardCopy>
      </div>
    </div>
  );
};

export const HighlightCodeWithMask: React.FC<{
  className?: string;
  clearText: string;
  visibleText: string;
  onMaskToggle: (x: MaskMode) => void;
}> = ({ className, clearText, visibleText, onMaskToggle }) => {
  const [mask, setMask] = React.useState<MaskMode>("mask");
  const __html = React.useMemo(() => {
    const pre = document.createElement("pre");
    const code = document.createElement("code");

    code.textContent = visibleText;
    if (className) {
      code.className = className;
    }
    pre.appendChild(code);
    return String(
      rehype().data("settings", { fragment: true }).use(rehypeHighlight).processSync(pre.outerHTML)
    );
  }, [className, visibleText]);
  return (
    <div className="relative border dark:border-green-300 border-opacity-0 dark:border-opacity-100">
      <div className="break-all relative overflow-auto fbr-scrollbar p-4 bg-gray-100 dark:bg-black leading-relaxed text-xs">
        <div
          ref={el => {
            if (el) {
              el.replaceChildren(DOMPurify.sanitize(__html, { RETURN_DOM: true }));
            }
          }}
        />
      </div>
      <div className="flex items-center justify-center absolute top-2 right-2 h-8 w-8 bg-white dark:bg-gray-700 rounded-lg fog:box-shadow-s">
        <ClipboardCopy text={clearText}>
          <Clipboard />
        </ClipboardCopy>
      </div>
      <div
        onClick={() => {
          const newMask = (() => {
            if (mask === "mask") {
              return "clear";
            } else {
              return "mask";
            }
          })();
          setMask(newMask);
          onMaskToggle(newMask);
        }}
        className={classNames(
          "text-gray-500 dark:text-gray-300",
          "hover:text-brand-red-500 dark:hover:text-brand-red-500",
          "bg-white dark:bg-gray-700",
          "flex items-center justify-center",
          "absolute top-12 right-2 h-8 w-8",
          "rounded-lg fog:box-shadow-s",
          "cursor-pointer"
        )}
      >
        {mask === "mask" ? <PiEyeClosedBold size={18} /> : <PiEyeBold size={18} />}
      </div>
    </div>
  );
};
