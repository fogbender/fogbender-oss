import classNames from "classnames";
import React from "react";
import TextareaAutosize from "react-textarea-autosize";

import { CloseButton } from "./lib";

export type UseTxtAreaOptions = {
  placeholder: string;
  outerDivClassName?: "" | string;
  className?: "" | string;
  showResetButton?: boolean;
  resetCallback?: () => void;
  defaultValue?: string;
  inline?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function useTxtArea(opts: UseTxtAreaOptions) {
  const {
    placeholder,
    outerDivClassName,
    showResetButton,
    resetCallback,
    defaultValue,
    inline,
    disabled,
    autoFocus = false,
  } = opts;

  const [focused, setFocused] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue || "");

  const reset = React.useCallback((value?: string) => {
    setValue(value || "");

    if (resetCallback) {
      resetCallback();
    }
  }, []);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const txtArea = (
    <div className={classNames(inline ? "relative inline" : "relative", outerDivClassName)}>
      <TextareaAutosize
        ref={textareaRef}
        onChange={e => setValue(e.target.value)}
        maxRows={5}
        className={classNames(
          "fbr-scrollbar fbr-placeholder-truncate w-full resize-none rounded bg-gray-100 py-1.5 px-2.5 text-base text-black placeholder:text-gray-500 focus:outline-none sm:text-sm"
        )}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        disabled={!!disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {value && showResetButton && (
        <CloseButton onClick={reset} className="top-0 right-0 mr-2 flex h-full" />
      )}
    </div>
  );

  return [value, txtArea, reset, focused, setValue] as const;
}
