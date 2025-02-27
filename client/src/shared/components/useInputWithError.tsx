import classNames from "classnames";
import React from "react";

import { Icons } from "./Icons";
import { BalloonTip } from "./lib";
import { useInput } from "./useInput";

export const useInputWithError = ({
  title,
  defaultValue,
  error,
  disabled,
  autoFocus,
  redErrorBorder,
  onEnter = () => {},
  className = "",
  placeholder,
  type = "text",
}: {
  title: string;
  defaultValue?: string;
  error?: string | React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  redErrorBorder?: boolean;
  onEnter?: () => void;
  className?: string;
  placeholder?: string;
  type?: "text" | "password" | "new-password" | "email";
}) => {
  const [inputValue, inputElement, resetInput, focused, setValue, focus] = useInput({
    type,
    className: classNames(
      "w-full rounded-lg transition focus:outline-none px-3 appearance-none leading-loose",
      !disabled ? "bg-gray-100 text-gray-800" : "bg-gray-200 text-gray-500"
    ),
    outerDivClassName: "w-full",
    placeholder: placeholder || title,
    defaultValue,
    disabled,
    autoFocus,
    onEnter,
  });

  const [showErrorTooltip, setShowErrorTooltip] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      setShowErrorTooltip(true);
    }
  }, [error]);

  const fieldElement = React.useMemo(
    () => (
      <div
        className={classNames(
          "relative w-full flex rounded-lg min-h-10 h-14",
          !disabled ? "bg-gray-100" : "bg-gray-200",
          inputValue.length === 0 ? "flex-row items-center" : "flex-col items-start",
          "border",
          error || redErrorBorder ? "border-red-500" : "border-opacity-0",
          className,
          "dark:bg-black"
        )}
      >
        {inputValue.length > 0 && <div className="text-xs text-gray-500 px-3">{title}</div>}
        <div className="w-full flex content-between">{inputElement}</div>
        {error && (
          <div className="absolute top-0 right-0 pt-4 px-4 bg-gray-100 dark:bg-black rounded-lg">
            <span
              className="text-brand-red-500 cursor-pointer"
              onClick={() => setShowErrorTooltip(x => !x)}
            >
              <Icons.Exclamation />
            </span>
            {showErrorTooltip && (
              <div className="absolute z-10 top-full -right-2 mt-3 py-2 px-3 flex gap-x-2 rounded-lg fog:box-shadow bg-white dark:bg-black fog:text-body-m">
                <span className="whitespace-nowrap">{error}</span>
                <span
                  className="text-gray-500 cursor-pointer"
                  onClick={() => setShowErrorTooltip(false)}
                >
                  <Icons.XClose />
                </span>
                <div className="absolute -top-3.5 right-2.5 transform rotate-180 text-white dark:text-black">
                  <BalloonTip />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    [title, inputElement, inputValue, error, showErrorTooltip]
  );

  return [inputValue, fieldElement, resetInput, setValue, focused, focus] as const;
};
