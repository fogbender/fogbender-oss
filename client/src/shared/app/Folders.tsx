import classNames from "classnames";
import {
  type EventRosterRoom,
  type EventRosterSection,
  type RosterSectionActions,
  useRosterSections,
} from "fogbender-proto";
import { atom, useAtomValue, useSetAtom } from "jotai";
import React from "react";

import { Icons } from "../components/Icons";
import { UnreadCircle } from "../components/lib";
import { showFocusedRosterAtom } from "../store/config.store";

import { RosterViewSubscription, type RosterViewOptions } from "./Roster";

export const viewIdAtom = atom(undefined as string | undefined);

export const Folders: React.FC<{
  selectedCustomerIds: Set<string>;
  ourId: string | undefined;
  isAgent: boolean;
  searching: boolean;
  onSelectSectionId: (id: string) => void;
  selectedSectionId: string | undefined;
}> = ({ ourId, isAgent, searching, onSelectSectionId, selectedCustomerIds, selectedSectionId }) => {
  const focused = useAtomValue(showFocusedRosterAtom);

  const viewKey = React.useRef(0);

  const viewOptions = React.useMemo(() => {
    return {
      view: "customer_rooms_" + viewKey.current++,
      // TODO: figure out the right sections
      sections: [
        "NEW VISITOR",
        "NEW",
        "CLOSED",
        "ARCHIVED",
        "?PINNED",
        "ASSIGNED TO ME",
        "ASSIGNED",
        "DIRECT",
        "*OPEN",
      ],
      limit: 10,
      filters: { customerIds: Array.from(selectedCustomerIds), focused },
    } as RosterViewOptions;
  }, [selectedCustomerIds, focused]);

  const viewId = viewOptions.view;
  {
    const setViewId = useSetAtom(viewIdAtom);
    React.useEffect(() => {
      setViewId(viewId);
    }, [viewId, setViewId]);
  }

  const { rosterSections, isRosterReady, dispatch } = useRosterSections(viewId);

  return (
    <div className="w-full h-full flex flex-col border-r border-gray-200">
      {isRosterReady && <RosterViewSubscription options={viewOptions} />}
      <div className="w-full h-full flex flex-col">
        {Array.from(rosterSections.values())
          .filter(s => !["DIRECT", "INTERNAL", "NEW"].includes(s.id))
          .map(section => {
            const visible =
              section.id === "OPEN" || section.id === "INBOX" ? true : Boolean(section.count);
            if (!visible) return null;
            return (
              <Section
                onClick={() => onSelectSectionId(section.id)}
                key={section.id}
                dispatchRosterSection={dispatch}
                section={section}
                searching={searching}
                isAgent={isAgent}
                ourId={ourId}
                isSelected={selectedSectionId === section.id}
              />
            );
          })}
      </div>
      <hr className="my-2 mx-2" />
      <div className="w-full h-full flex flex-col">
        {Array.from(rosterSections.values())
          .filter(s => ["DIRECT", "INTERNAL", "NEW"].includes(s.id))
          .map(section => {
            const visible =
              section.id === "OPEN" || section.id === "INBOX" ? true : Boolean(section.count);
            if (!visible) return null;
            return (
              <Section
                onClick={() => onSelectSectionId(section.id)}
                key={section.id}
                dispatchRosterSection={dispatch}
                section={section}
                searching={searching}
                isAgent={isAgent}
                ourId={ourId}
                isSelected={selectedSectionId === section.id}
              />
            );
          })}
      </div>
    </div>
  );
};

const sectionTitles = (sectionId: string, isAgent: boolean) =>
  ({
    "OPEN": "Unassigned",
    "INBOX": "Team support",
    "PRIVATE": isAgent ? "Private conversations" : "Private issues",
    "PINNED": "Pinned",
    "ASSIGNED TO ME": "Mine",
    "ASSIGNED": "Assigned",
    "DIRECT": "Direct",
    "ARCHIVED": "Archived",
    "INTERNAL": "Internal",
    "NEW": "New customers",
    "NEW VISITOR": "New visitors",
    "CLOSED": "Closed",
  }[sectionId] || "Unknown: " + sectionId);

type SectionProps = {
  dispatchRosterSection: (update: RosterSectionActions) => void;
  onClick: () => void;
  section: EventRosterSection & { rooms?: EventRosterRoom[] };
  searching: boolean;
  isAgent: boolean;
  ourId: string | undefined;
  isSelected: boolean;
};

const Section = (props: SectionProps) => {
  const { onClick, section, isAgent, isSelected } = props;

  const sectionTitle = sectionTitles(section.id, isAgent);

  return (
    <React.Fragment>
      <div
        className={classNames(
          "flex items-center gap-x-2 pt-2 pb-2 pl-3 pr-1 cursor-pointer",
          "border-l-5",
          isSelected
            ? "border-brand-orange-500"
            : "border-transparent hover:border-orange-500 hover:border-opacity-50"
        )}
        onClick={onClick}
      >
        <div className="flex-1 max-w-[68px] truncate" title={sectionTitle}>
          {sectionTitle}
        </div>
        <div className="flex items-center gap-x-1">
          <span className={classNames("text-gray-400", !section.mentionsCount && "hidden")}>
            <Icons.Mention className="w-3" />
          </span>
          <span
            className={classNames(
              section.unreadCount === 0 && section.mentionsCount === 0 && "hidden"
            )}
          >
            <UnreadCircle total={section.unreadCount || section.mentionsCount || 1} dimmed={true} />
          </span>
        </div>
      </div>
    </React.Fragment>
  );
};
