import { LocalStorageKeys, SafeLocalStorage } from "fogbender-client/src/shared";
import React from "react";

import { getServerUrl } from "../config";
import { actionCreators, useDispatch } from "../redux";

export function useLogout() {
  const dispatch = useDispatch();
  const logout = React.useCallback(
    async (_onComplete?: () => void) => {
      await fetch(getServerUrl() + "/auth/google/signout", { credentials: "include" });

      Object.values(LocalStorageKeys).map(key => SafeLocalStorage.removeItem(key));

      dispatch(actionCreators.setUser({ user: null }));
    },
    [dispatch]
  );

  return [logout];
}
