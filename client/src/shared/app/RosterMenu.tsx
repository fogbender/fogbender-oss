import classNames from "classnames";
import { useAtom } from "jotai";
import React from "react";

import { showFocusedRosterAtom } from "..";
import { Icons, SwitchOff, SwitchOn } from "../components/Icons";
import { useClickOutside } from "../utils/useClickOutside";

import { FancyMenuItem } from "./FancyMenuItem";

export const RosterMenu = () => {
  const [expanded, setExpanded] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setExpanded(false), !expanded);

  const [showFocusedRoster, setShowFocusedRoster] = useAtom(showFocusedRosterAtom);

  const menuItemClassName = "dark:text-white dark:hover:text-brand-red-500";

  return (
    <span
      className={classNames(
        "relative cursor-pointer",
        "text-gray-500 hover:text-brand-red-500",
        "self-center"
      )}
      onClick={() => setExpanded(x => !x)}
    >
      <Icons.Menu className="w-4" />
      <div
        ref={menuRef}
        className={classNames(
          "absolute z-20 top-full left-0 py-2 rounded-md fog:box-shadow-m bg-white text-black dark:bg-black fog:text-body-m",
          expanded ? "block" : "hidden"
        )}
      >
        <FancyMenuItem
          className={menuItemClassName}
          onClick={() => setShowFocusedRoster(x => !x)}
          text="Focused roster"
          icon={!showFocusedRoster ? <SwitchOff className="w-10" /> : <SwitchOn className="w-10" />}
        />
      </div>
    </span>
  );
};
