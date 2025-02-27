import classNames from "classnames";
import { useAtom } from "jotai";
import React from "react";

import { showFocusedRosterAtom } from "..";
import { Icons } from "../components/Icons";
import { useClickOutside } from "../utils/useClickOutside";

import { FancyMenuItem } from "./FancyMenuItem";

export const RosterMenu = () => {
  const [expanded, setExpanded] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setExpanded(false), !expanded);

  const [showFocusedRoster, setShowFocusedRoster] = useAtom(showFocusedRosterAtom);

  const menuItemClassName = "dark:text-white group-hover:text-brand-red-500";

  return (
    <span
      className={classNames(
        "relative cursor-pointer",
        "text-gray-500 group group-hover:text-brand-red-500",
        "self-center"
      )}
      onClick={() => setExpanded(x => !x)}
    >
      <Icons.Menu className="w-4" />
      <div
        ref={menuRef}
        className={classNames(
          "absolute z-20 top-6 left-0 py-2 rounded-md fog:box-shadow-m bg-white text-black dark:bg-zinc-800 fog:text-body-m",
          expanded ? "block" : "hidden"
        )}
      >
        <FancyMenuItem
          className={menuItemClassName}
          onClick={(e?: React.MouseEvent) => {
            if (e) {
              e.stopPropagation();

              const elem = e.target as HTMLElement;
              const div = elem.closest("div.absolute") as HTMLInputElement;

              if (div) {
                const toggle = div.querySelector(".toggle") as HTMLInputElement;

                if (toggle) {
                  toggle.click();
                }
              }
            }
          }}
          text="Focused roster"
          icon={
            <input
              onClick={e => {
                e.stopPropagation();
                setShowFocusedRoster(x => !x);
              }}
              type="checkbox"
              className="toggle toggle-sm group-hover:text-brand-red-500"
              defaultChecked={showFocusedRoster}
            />
          }
        />
      </div>
    </span>
  );
};
