import classNames from "classnames";
import { useRosterSections } from "fogbender-proto";
import React from "react";

import { filterMap } from "../utils/filterMap";

import { RosterViewOptions, RosterViewSubscription } from "./Roster";

export const Customers = ({
  selectedCustomerIds,
  onSelectCustomerId,
}: {
  selectedCustomerIds: Set<string>;
  onSelectCustomerId: (id: string | undefined) => void;
}) => {
  const viewId = "customers";
  const { rosterSections, isRosterReady } = useRosterSections(viewId);

  const sort = (aLastMessageAt: number, bLastMessageAt: number) => {
    if (aLastMessageAt < bLastMessageAt) {
      return 1;
    } else if (aLastMessageAt > bLastMessageAt) {
      return -1;
    } else {
      return 0;
    }
  };

  const viewOptions = React.useMemo(
    () =>
      ({
        view: viewId,
        sections: ["CUSTOMER"],
      } as RosterViewOptions),
    [viewId]
  );

  const customers = React.useMemo(() => {
    const arr = Array.from(rosterSections.values()).sort((a, b) => {
      const aTs = a.rooms?.map(r => r.room.lastMessage?.createdTs || 0).sort(sort);
      const bTs = b.rooms?.map(r => r.room.lastMessage?.createdTs || 0).sort(sort);
      return sort(aTs?.[0] || 0, bTs?.[0] || 0);
    });
    return filterMap(arr, c => {
      if (c.entityType === "CUSTOMER" && c.entity) {
        return {
          id: c.entity.id,
          name: c.entity.name,
        };
      }
      return undefined;
    });
  }, [rosterSections]);

  return (
    <div className="w-full h-full flex flex-col fbr-scrollbar overflow-y-scroll border-r border-gray-200">
      {isRosterReady && <RosterViewSubscription options={viewOptions} />}
      <div
        title="All"
        className={classNames(
          "flex items-center gap-x-2 p-2 pr-4 cursor-pointer",
          "border-l-5",
          selectedCustomerIds.size === 0 ? "border-brand-orange-500" : "border-transparent"
        )}
        onClick={() => onSelectCustomerId(undefined)}
      >
        All
      </div>

      {customers
        //
        .map(c => {
          return (
            <div
              key={c.id}
              onClick={() => onSelectCustomerId(c.id)}
              className={classNames(
                "flex items-center gap-x-2 p-2 pr-4 cursor-pointer",
                "border-l-5",
                selectedCustomerIds.has(c.id)
                  ? "border-brand-orange-500"
                  : "border-transparent hover:border-brand-orange-500 hover:border-opacity-50"
              )}
            >
              <div className="truncate" title={c.name}>
                {c.name}
              </div>
            </div>
          );
        })}
    </div>
  );
};
