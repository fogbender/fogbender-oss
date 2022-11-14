import { useAtom } from "jotai";

import { useWs } from "./ws";

export function useRosterSections() {
  const { sharedRoster } = useWs();
  const { rosterSectionsAtom, rosterSectionsActionsAtom } = sharedRoster;
  const [rosterSections] = useAtom(rosterSectionsAtom);
  const [, dispatch] = useAtom(rosterSectionsActionsAtom);
  return { rosterSections, dispatch };
}
