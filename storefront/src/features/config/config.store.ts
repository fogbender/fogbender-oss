import { atomWithRealTimeLocalStorage } from "fogbender-client/src/shared";

export const hideHeadlessClientsAtom = atomWithRealTimeLocalStorage(
  "config.hide_headless_clients",
  false
);
