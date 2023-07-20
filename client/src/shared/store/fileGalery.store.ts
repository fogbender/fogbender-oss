import { atom, useAtomValue } from "jotai";
import { atomFamily, loadable } from "jotai/utils";

type Params = {
  queryKey: string;
  queryFn: () => Promise<any>;
  enabled: boolean;
};

// https://github.com/pmndrs/jotai/discussions/975#discussioncomment-1986865
export const queryFamily = atomFamily(
  ({ queryFn, enabled }: Params) => atom(() => enabled && queryFn()),
  (a, b) => a.queryKey === b.queryKey
);

export const useJotaiQuery = (params: Params) => ({
  data: useAtomValue(loadable(queryFamily(params))),
  remove: () => queryFamily.remove(params),
});
