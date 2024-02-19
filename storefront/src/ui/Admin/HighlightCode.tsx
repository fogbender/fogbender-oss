import DOMPurify from "dompurify";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Clipboard } from "fogbender-client/src/shared/components/Icons";
import "highlight.js/lib/common";
import "highlight.js/styles/base16/one-light.css";
import React from "react";
import { rehype } from "rehype";
import rehypeHighlight from "rehype-highlight";

export const HighlightCode: React.FC<{
  className?: string;
  blurAreas?: {
    line: number;
    column: number;
    length: number;
  }[];
}> = ({ className, blurAreas, children }) => {
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
      code.className = `${className} dark:text-white`;
    }
    pre.appendChild(code);
    return String(
      rehype().data("settings", { fragment: true }).use(rehypeHighlight).processSync(pre.outerHTML)
    );
  }, [className, text]);
  return (
    <div className="relative">
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
      <div className="flex items-center justify-center absolute top-2 right-2 h-8 w-8 bg-white rounded-lg fog:box-shadow-s">
        <ClipboardCopy text={text}>
          <Clipboard />
        </ClipboardCopy>
      </div>
    </div>
  );
};
