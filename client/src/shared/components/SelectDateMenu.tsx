import * as chronoNode from "chrono-node";
import classNames from "classnames";
import React from "react";

import { SelectSearch } from "../ui/SelectSearch";
import { parseDate } from "../utils/dateParser";

import { Icons } from "./Icons";

const localeConfig = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

interface SelectDateMenuProps {
  menuRef?: React.RefObject<HTMLInputElement>;
  setIsSelectDateVisible: (newValue: boolean) => void;
  onSelectDate: (dateString: number) => void;
  title: string;
  placeholder?: string;
}

// eslint-disable-next-line import/no-anonymous-default-export
export default (props: SelectDateMenuProps) => {
  const { menuRef, setIsSelectDateVisible, onSelectDate, title, placeholder = "Search…" } = props;
  const [searchInput, setSearchInput] = React.useState<string | undefined>();
  const [selectedOption, setSelectedOption] = React.useState<(typeof options)[number]>();

  const options = React.useMemo(() => {
    const result = parse(searchInput);
    if (!result.length) {
      return parse(undefined); // send undefined query so that in case of no result fallback values should be returned
    }
    return result;
  }, [searchInput]);

  return (
    <div
      ref={menuRef}
      className={classNames(
        "absolute z-10 h-[201px] top-0 right-[5px] pt-2 fog:box-shadow-m bg-white dark:bg-black dark:text-white text-black w-[310px]"
      )}
    >
      <div className="flex items-center justify-between pr-2 pl-4">
        <h2 className="font-semibold text-base">{title}</h2>
        <button
          onClick={() => {
            setSearchInput(undefined);
            setSelectedOption(undefined);
            setIsSelectDateVisible(false);
          }}
        >
          <Icons.XClose className="cursor-pointer w-3.5 h-3.5 text-gray-500 dark:text-white" />
        </button>
      </div>
      <div className="flex items-center pl-4">
        <Icons.SnoozeTimer className="w-[16.25px] h-[15px]" />
        <SelectSearch
          selectedOption={selectedOption}
          isStatic={true}
          autoFocus={true}
          searchInputValue={searchInput}
          onChange={option => {
            // server expects the date in micro seconds;
            const dateTs = new Date(chronoNode.parseDate(option.value)).getTime() * 1000;
            setSelectedOption(option);
            setSearchInput(option.displayLabel);
            onSelectDate(dateTs);
            setIsSelectDateVisible(false);
          }}
          onClearInput={() => {
            setSelectedOption(undefined);
            setSearchInput(undefined);
          }}
          setSearchInputValue={input => {
            setSearchInput(input);
          }}
          optionsClassName={classNames("left-[-30px] h-[136px] w-[310px]")}
          searchInputPlaceholder={placeholder}
          options={options}
          displayValue={x => x?.displayLabel}
        />
      </div>
      <hr className="text-gray-500" />
    </div>
  );
};

export const parse = (input: string | undefined) => {
  const dateSuggestions = parseDate({
    query: input,
    fallback: ["Tomorrow", "Next Week", "This Saturday"],
  });
  const locale = navigator.language || "en-US";
  const dateToOption = (input: string, d: Date) => {
    const date = new Date(d).toLocaleDateString(locale, localeConfig);
    return {
      option: (
        <div className="flex justify-between">
          <span className="max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis">
            {input}
          </span>
          <span>{date}</span>
        </div>
      ),
      displayLabel: input,
      value: date,
    };
  };
  return dateSuggestions.map(option => dateToOption(option.label, option.date));
};
