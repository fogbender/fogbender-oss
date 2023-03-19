import { useAtom } from "jotai";

import { useSharedRoster } from "./ws";

export function useRosterSections() {
  const sharedRoster = useSharedRoster();
  const { rosterSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const [rosterSections] = useAtom(rosterSectionsAtom);
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
