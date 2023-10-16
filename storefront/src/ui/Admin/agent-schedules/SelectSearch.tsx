import React from "react";
import { Combobox } from "@headlessui/react";
import classNames from "classnames";
import { Icons, XCircleFilled } from "fogbender-client/src/shared";
import { SelectSearchOption } from "fogbender-client/src/shared/ui/SelectSearch";

type Select<o> = {
  inputSearchValue: string | undefined;
  showOptions: boolean;
  onChange?: (option: o) => void;
  options: o[];
  placeholder?: string;
  setInputSearchValue: (x: string | undefined) => void;
};

export default function SelectSearch<o extends SelectSearchOption>(props: Select<o>) {
  const {
    inputSearchValue,
    options,
    onChange,
    placeholder = "Search agents",
    setInputSearchValue,
    showOptions,
  } = props;

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Combobox onChange={onChange}>
      <div className="-mt-2 px-2">
        <div className={classNames("flex items-center", showOptions && "border-b")}>
          <Combobox.Label className="w-4 text-gray-500 cursor-pointer">
            {inputSearchValue ? <XCircleFilled /> : <Icons.Search />}
          </Combobox.Label>
          <Combobox.Input
            ref={inputRef}
            className={
              "flex-1 px-2 py-3 bg-transparent outline-none text-black placeholder-gray-500 text-base sm:text-sm"
            }
            placeholder={placeholder}
            onChange={evt => {
              setInputSearchValue(evt.target.value);
            }}
          />
        </div>
      </div>
      <Combobox.Options
        static={true}
        onFocus={() => {
          inputRef.current?.focus();
        }}
        className="bg-white focus:outline-none"
      >
        {!!showOptions && (
          <div className="max-h-32 my-2 overflow-y-auto fbr-scrollbar">
            {options.map((x, i) => (
              <Combobox.Option
                key={`a-${i}`}
                value={x}
                className='data-[headlessui-state~="active"]:bg-gray-200 data-[headlessui-state~="selected"]:bg-gray-200'
              >
                {x.option}
              </Combobox.Option>
            ))}
          </div>
        )}
      </Combobox.Options>
    </Combobox>
  );
}
