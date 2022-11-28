import { useAtom } from "jotai";

import { useWs } from "./ws";

export function useRosterSections() {
  const { sharedRoster } = useWs();
  const { rosterSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const [rosterSections] = useAtom(rosterSectionsAtom);
  const [, dispatch] = useAtom(rosterSectionsActionsAtom);
  return { rosterSections, dispatch };
}

export function useRosterRoom(roomId: string) {
  const { sharedRoster } = useWs();
  const { rosterRoomFamily, rosterSectionsActionsAtom } = sharedRoster;
  const [rosterRoom] = useAtom(rosterRoomFamily(roomId));
  const [, dispatch] = useAtom(rosterSectionsActionsAtom);
  return { rosterRoom, dispatch };
}
