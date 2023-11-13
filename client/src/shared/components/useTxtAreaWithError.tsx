import classNames from "classnames";
import React from "react";

import { Icons } from "./Icons";
import { BalloonTip } from "./lib";
import { useTxtArea } from "./useTxtArea";

export const useTxtAreaWithError = ({
  title,
  defaultValue,
  error,
  disabled,
  autoFocus,
  redErrorBorder,
  className = "",
}: {
  title: string;
  defaultValue?: string;
  error?: string | React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  redErrorBorder?: boolean;
  className?: string;
}) => {
  const [txtAreaValue, txtAreaElement, resetTxtArea, focused, setValue] = useTxtArea({
    outerDivClassName: "w-full",
    placeholder: title,
    defaultValue,
    disabled,
    autoFocus,
  });

  const [showErrorTooltip, setShowErrorTooltip] = React.useState(false);

  React.useEffect(() => {
    if (error) setShowErrorTooltip(true);
  }, [error]);

  const fieldElement = React.useMemo(
    () => (
      <div
        className={classNames(
          "relative flex w-full rounded-lg",
          "px-1 pt-1",
          "bg-gray-100 dark:bg-black",
          txtAreaValue.length === 0 ? "flex-row items-center" : "flex-col items-start",
          "border",
          error || redErrorBorder ? "border-red-500" : "border-opacity-0",
          className
        )}
      >
        {txtAreaValue.length > 0 && <div className="px-3 text-xs text-gray-500">{title}</div>}
        <div className="flex w-full content-between">{txtAreaElement}</div>
        {error && (
          <div className="absolute top-0 right-0 rounded-lg bg-gray-100 px-4 pt-4">
            <span
              className="text-brand-red-500 cursor-pointer"
              onClick={() => setShowErrorTooltip(x => !x)}
            >
              <Icons.Exclamation />
            </span>
            {showErrorTooltip && (
              <div className="fog:box-shadow fog:text-body-m absolute top-full -right-2 z-10 mt-3 flex gap-x-2 rounded-lg bg-white py-2 px-3">
                <span className="whitespace-nowrap">{error}</span>
                <span
                  className="cursor-pointer text-gray-500"
                  onClick={() => setShowErrorTooltip(false)}
                >
                  <Icons.XClose />
                </span>
                <div className="absolute -top-3.5 right-2.5 rotate-180 transform text-white dark:text-black">
                  <BalloonTip />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    [title, txtAreaElement, txtAreaValue, error, showErrorTooltip]
  );

  return { txtAreaValue, fieldElement, resetTxtArea, setValue, focused } as const;
};
