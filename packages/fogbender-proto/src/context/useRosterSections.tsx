import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import React from "react";
import type { RosterSections } from "./rosterSections";

import { useSharedRoster } from "./ws";

const emptyMap = new Map() as RosterSections;

export function useRosterSections(viewId = "main") {
  const sharedRoster = useSharedRoster();
  const { isRosterReadyAtom, rosterViewSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const mainRosterSectionsAtom = selectAtom(
    rosterViewSectionsAtom,
    React.useCallback(atom => atom.get(viewId) ?? emptyMap, [viewId])
  );
  const isRosterReady = useAtomValue(isRosterReadyAtom);
  const rosterSections = useAtomValue(mainRosterSectionsAtom);
  const dispatch = useSetAtom(rosterSectionsActionsAtom);
  return { isRosterReady, rosterSections, dispatch };
}

export function useRosterRoom(roomId: string) {
  const sharedRoster = useSharedRoster();
  const { rosterRoomFamily, rosterSectionsActionsAtom } = sharedRoster;
  const rosterRoom = useAtomValue(rosterRoomFamily(roomId));
  const dispatch = useSetAtom(rosterSectionsActionsAtom);
  return { rosterRoom, dispatch };
}
