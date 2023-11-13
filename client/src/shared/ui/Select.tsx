import { Listbox } from "@headlessui/react";
import classNames from "classnames";
import React from "react";

import { ChevronButton } from "./ChevronButton";

export interface SelectOption {
  id: string;
  option: React.ReactNode;
  optionTitle?: string;
}

interface SelectProps<O> {
  children?: React.ReactNode;
  options: O[];
  selectedOption: O | undefined;
  onChange?: (option: O) => void;
  onOptionsFocus?: () => void;
  title?: string;
  variant?: "small" | "large" | undefined;
  disabled?: boolean | undefined;
}

export const Select = <O extends SelectOption>(props: SelectProps<O>) => {
  const {
    //
    title,
    variant,
    children,
    options,
    selectedOption,
    disabled,
    onChange,
    onOptionsFocus,
  } = props;
  const isLarge = variant === "large";

  return (
    <div className={classNames("relative", isLarge ? "fog:text-body-l" : "fog:text-body-m")}>
      <Listbox
        disabled={disabled}
        onChange={onChange}
        by={(a, b) => (a && b ? a.id === b.id : false)}
      >
        {({ open }) => {
          return (
            <>
              <Listbox.Button className="w-full focus-visible:outline-none">
                <div
                  className={classNames(
                    "relative flex items-center",
                    isLarge ? "gap-x-4 py-3 px-4" : "gap-x-2 py-2 px-2",
                    disabled ? "bg-gray-200" : "cursor-pointer bg-gray-100",
                    disabled ? "text-gray-500" : selectedOption ? "text-black" : "text-gray-500",
                    open ? "rounded-t-lg" : "rounded-lg",
                    "dark:bg-black dark:text-white"
                  )}
                >
                  {selectedOption && title && isLarge && (
                    <div className="fog:text-body-xs absolute top-0.5 left-4 right-0 text-gray-500">
                      <div className="truncate text-left">{title}</div>
                    </div>
                  )}
                  <div className="flex-1 truncate text-left">
                    {selectedOption?.optionTitle || selectedOption?.option || title || "Select..."}
                  </div>
                  <ChevronButton isOpen={open} isLarge={isLarge} />
                </div>
              </Listbox.Button>
              <Listbox.Options
                onFocus={onOptionsFocus}
                className="fog:box-shadow-m fbr-scrollbar fbr-scrollbar-no-gutter absolute left-0 top-full z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-b-lg bg-white  ring-1 ring-black ring-opacity-5 focus:outline-none"
              >
                {children ??
                  options.map(v => {
                    return (
                      <Listbox.Option
                        key={v.id}
                        value={v}
                        className={classNames(
                          "cursor-pointer px-4 font-normal hover:bg-gray-100 focus:bg-gray-100 data-[headlessui-state~='active']:bg-gray-100 data-[headlessui-state~='selected']:bg-gray-100",
                          "dark:hover:bg-gray-600 dark:bg-black dark:data-[headlessui-state~='active']:bg-gray-600 data-[headlessui-state~='selected']:bg-gray-600",
                          isLarge ? "py-4" : "py-2"
                        )}
                      >
                        <div>{v.option}</div>
                      </Listbox.Option>
                    );
                  })}
              </Listbox.Options>
            </>
          );
        }}
      </Listbox>
    </div>
  );
};
