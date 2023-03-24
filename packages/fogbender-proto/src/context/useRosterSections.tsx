import { useAtom } from "jotai";
import { selectAtom } from "jotai/utils";

import { useSharedRoster } from "./ws";

const selectMain = <T,>(views: Map<string, T>) => views.get("main")!;

// for main view
export function useRosterSections() {
  const sharedRoster = useSharedRoster();
  const { rosterSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const mainRosterSectionsAtom = selectAtom(rosterSectionsAtom, selectMain);
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
