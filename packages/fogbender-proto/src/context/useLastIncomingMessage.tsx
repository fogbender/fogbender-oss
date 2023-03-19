import { useAtomValue } from "jotai";
import { useWs } from "./ws";

export type LastIncomingMessageAtom = ReturnType<typeof useWs>["lastIncomingMessageAtom"];

export const useLastIncomingMessage = () => {
  const { lastIncomingMessageAtom } = useWs();
  return useAtomValue(lastIncomingMessageAtom);
};
