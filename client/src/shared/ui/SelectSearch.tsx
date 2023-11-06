import { Combobox } from "@headlessui/react";
import classNames from "classnames";
import React from "react";

import { XCircleFilled } from "../components/Icons";

export interface SelectSearchOption {
  option: React.ReactNode;
}

interface SelectSearchProps<O> {
  autoFocus?: boolean;
  children?: React.ReactNode;
  options: O[];
  onChange?: (option: O) => void;
  disabled?: boolean | undefined;
  searchInputValue: string | undefined;
  searchInputPlaceholder: string;
  searchInputTitle?: string;
  displayValue: (option: O | undefined) => string | undefined;
  wrapperClassName?: string;
  comboboxButtonClassName?: string;
  comboboxInputClassName?: string;
  optionsClassName?: string;
  isStatic?: boolean;
  onClearInput?: () => void;
  selectedOption: O | undefined;
  setSearchInputValue: (value: string | undefined) => void;
}

// tslint:disable-next-line:function-name
export function SelectSearch<O extends SelectSearchOption>(props: SelectSearchProps<O>) {
  const {
    autoFocus,
    children,
    options,
    searchInputPlaceholder: placeholder,
    onChange,
    disabled,
    wrapperClassName,
    optionsClassName,
    isStatic,
    onClearInput,
    selectedOption,
    searchInputValue,
    setSearchInputValue,
  } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const optionsRef = React.useRef<HTMLUListElement>(null);

  const value = React.useMemo(() => selectedOption || "", [selectedOption]);

  React.useLayoutEffect(() => {
    autoFocus && inputRef.current?.focus();
  }, []);

  return (
    <div className={classNames("fog:text-body-m relative w-full", wrapperClassName)}>
      <Combobox value={value} disabled={disabled} onChange={onChange}>
        <div
          className={classNames(
            "flex items-center justify-between bg-white pr-2",
            props.comboboxButtonClassName
          )}
        >
          <Combobox.Button as="div" className="w-full">
            <Combobox.Input
              title={props.searchInputTitle}
              ref={inputRef}
              className={classNames(
                "h-[36px] w-full rounded-md px-2 outline-none",
                props.comboboxInputClassName
              )}
              placeholder={placeholder}
              displayValue={props.displayValue as (option: O) => string}
              onChange={evt => {
                setSearchInputValue(evt.target.value);
              }}
            />
          </Combobox.Button>
          {searchInputValue && (
            <span
              className="w-4 cursor-pointer text-gray-500"
              onClick={() => {
                inputRef.current && (inputRef.current.value = "");
                inputRef.current?.focus();
                setSearchInputValue(undefined);
                onClearInput?.();
              }}
            >
              <XCircleFilled />
            </span>
          )}
        </div>
        <Combobox.Options
          static={isStatic}
          ref={optionsRef}
          className={classNames(
            `fog:box-shadow-m fbr-scrollbar fbr-scrollbar-no-gutter absolute left-0 top-full z-30 mt-1 max-h-96 w-full
               overflow-y-auto rounded-b-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none`,
            optionsClassName
          )}
        >
          {children ??
            options.map((v, ind) => {
              return (
                <Combobox.Option
                  key={ind}
                  value={v}
                  className='data-[headlessui-state~="active"]:bg-gray-100 dark:data-[headlessui-state~="active"]:bg-gray-600 dark:data-[headlessui-state~="selected"]:bg-gray-600 data-[headlessui-state~="selected"]:bg-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                >
                  <div className={classNames("cursor-pointer px-4 py-3")}>{v.option}</div>
                </Combobox.Option>
              );
            })}
          {!options.length && (
            <Combobox.Option value="No results. Try again?" disabled={true}>
              <div className={classNames("cursor-default px-4 py-3")}>No results. Try again?</div>
            </Combobox.Option>
          )}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}
