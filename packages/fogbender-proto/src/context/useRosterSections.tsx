import { useAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import React from "react";
import type { RosterSections } from "./rosterSections";

import { useSharedRoster } from "./ws";

const emptyMap = new Map() as RosterSections;

export function useRosterSections(viewId = "main") {
  const sharedRoster = useSharedRoster();
  const { rosterViewSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const mainRosterSectionsAtom = selectAtom(
    rosterViewSectionsAtom,
    React.useCallback(atom => atom.get(viewId) ?? emptyMap, [viewId])
  );
  const [rosterSections] = useAtom(mainRosterSectionsAtom);
  const [, dispatch] = useAtom(rosterSectionsActionsAtom);
  return { rosterSections, dispatch };
}

export function useRosterRoom(roomId: string) {
  const sharedRoster = useSharedRoster();
  const { rosterRoomFamily, rosterSectionsActionsAtom } = sharedRoster;
  const [rosterRoom] = useAtom(rosterRoomFamily(roomId));
  const [, dispatch] = useAtom(rosterSectionsActionsAtom);
  return { rosterRoom, dispatch };
}
