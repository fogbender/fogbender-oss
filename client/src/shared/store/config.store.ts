import { atom } from "jotai";
import { atomWithRealTimeLocalStorage } from "../utils/atomWithLocalStorage";

export const modeAtom = atom("light" as "light" | "dark");

export const showAiHelperAtom = atomWithRealTimeLocalStorage("config.show_ai_helper", false);
export const muteNotificationsAtom = atomWithRealTimeLocalStorage(
  "config.mute_notifications",
  false
);
export const muteSoundAtom = atomWithRealTimeLocalStorage("config.mute_sound", false);
export const swNotificationsAtom = atomWithRealTimeLocalStorage("config.sw_notifications", false);
export const hideWelcomeAtom = atomWithRealTimeLocalStorage("config.hide_welcome", false);
export const showOutlookRosterAtom = atomWithRealTimeLocalStorage(
  "config.show_outlook_roster",
  false
);
export const showFocusedRosterAtom = atomWithRealTimeLocalStorage(
  "config.show_focused_roster",
  false
);
export type BooleanConfigAtom = typeof muteNotificationsAtom;
