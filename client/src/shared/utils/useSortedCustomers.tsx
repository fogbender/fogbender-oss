import type { Customer, EventBadge, Room } from "fogbender-proto";
import React from "react";

import { isExternalHelpdesk, isInternalHelpdesk } from "./format";

export const useSortedCustomers = ({
  customers,
  roster,
  badges,
}: {
  customers: Customer[];
  roster: Room[];
  badges: { [key: string]: EventBadge };
}) => {
  const customerBadges = React.useCallback(
    (customerId: string) => {
      const customerRooms = roster.filter(r => r.customerId === customerId);
      const customerRoomIds = customerRooms.map(r => r.id);
      return Object.values(badges)
        .filter(v => v.count !== 0 && customerRoomIds.indexOf(v.roomId) !== -1)
        .map(b => {
          const room = roster.find(r => r.id === b.roomId);
          return { ...b, isDm: room?.type === "dialog" || false };
        });
    },
    [roster, badges]
  );

  const sortedCustomers = React.useMemo(
    () =>
      customers
        .concat()
        .filter(c => c.deletedTs === null || c.deletedTs === undefined)
        .sort((c0, c1) => {
          return c0.name > c1.name ? 1 : c0.name < c1.name ? -1 : 0;
        })
        .sort((c0, c1) => {
          const c0Tss = customerBadges(c0.id).map(b => b?.lastRoomMessage?.updatedTs || 0);
          const c1Tss = customerBadges(c1.id).map(b => b?.lastRoomMessage?.updatedTs || 0);

          const c0TssMax = c0Tss.length > 0 ? Math.max(...c0Tss) : undefined;
          const c1TssMax = c1Tss.length > 0 ? Math.max(...c1Tss) : undefined;

          if (c0TssMax && !c1TssMax) {
            return -1;
          } else if (!c0TssMax && c1TssMax) {
            return 1;
          } else {
            return 0;
          }
        })
        .sort(c0 => {
          return isExternalHelpdesk(c0.name) ? -1 : 0;
        })
        .sort(c0 => {
          return isInternalHelpdesk(c0.name) ? -1 : 0;
        }),

    [customers, customerBadges]
  );

  return { sortedCustomers, customerBadges };
};
