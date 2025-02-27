import classNames from "classnames";
import React from "react";

import { CloseButton } from "./lib";

export type UseInputOptions = {
  type: "text" | "password" | "new-password" | "email";
  placeholder: string;
  outerDivClassName?: "" | string;
  className?: "" | string;
  showResetButton?: boolean;
  resetCallback?: () => void;
  defaultValue?: string;
  inline?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
  onBlur?: () => void;
};

export function useInput(opts: UseInputOptions) {
  const {
    type,
    placeholder,
    outerDivClassName,
    className,
    showResetButton,
    resetCallback,
    defaultValue,
    inline,
    disabled,
    autoFocus = false,
    onEnter = () => {},
    onBlur = () => {},
  } = opts;

  const [focused, setFocused] = React.useState(false);
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  const reset = React.useCallback((value?: string) => {
    setValue(value || "");

    if (resetCallback) {
      resetCallback();
    }
  }, []);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const focus = React.useCallback(() => {
    setTimeout(() => inputRef?.current?.focus(), 100);
  }, []);

  const input = (
    <div className={classNames(inline ? "relative inline" : "relative", outerDivClassName)}>
      <input
        ref={inputRef}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onKeyDown={e => e.key === "Enter" && onEnter()}
        value={value}
        className={classNames(
          className === undefined
            ? "appearance-none rounded border bg-gray-100 py-1 px-2 text-sm leading-normal text-gray-800 transition focus:border-gray-700 focus:outline-none"
            : className,
          "dark:bg-black dark:text-white"
        )}
        type={type}
        placeholder={placeholder}
        disabled={!!disabled}
        autoFocus={autoFocus}
      />
      {value && showResetButton && (
        <CloseButton onClick={reset} className="top-0 right-0 mr-2 flex h-full" />
      )}
    </div>
  );

  return [value, input, reset, focused, setValue, focus] as const;
}
