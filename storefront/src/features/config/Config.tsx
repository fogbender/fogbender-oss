import {
  BooleanConfigAtom,
  showAiHelperAtom,
  showFocusedRosterAtom,
  showOutlookRosterAtom,
  swNotificationsAtom,
} from "fogbender-client/src/shared/store/config.store";
import { useAtom } from "jotai";
import React from "react";

import { hideHeadlessClientsAtom } from "./config.store";

// config component
export const Config = function Config() {
  return (
    <div>
      <div className="flex flex-col gap-y-4 p-2">
        Debugger:
        <Checkbox atom={showAiHelperAtom}>Show AI helper</Checkbox>
        <Checkbox atom={showOutlookRosterAtom}>use Outlook roster</Checkbox>
        <Checkbox atom={showFocusedRosterAtom}>use focused roster</Checkbox>
        <Checkbox atom={swNotificationsAtom}>Use Service Worker notifications (on mobile)</Checkbox>
        <Checkbox atom={hideHeadlessClientsAtom}>
          Disable clients so you only have one websocket connection
        </Checkbox>
      </div>
    </div>
  );
};

export const Checkbox: React.FC<{ atom: BooleanConfigAtom }> = ({ atom, children }) => {
  const [value, setValue] = useAtom(atom);
  return (
    <label className="block">
      <input
        type="checkbox"
        checked={value}
        onChange={e => {
          setValue(e.target.checked);
        }}
      />{" "}
      {children}
    </label>
  );
};
