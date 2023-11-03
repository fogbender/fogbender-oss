import { LocalStorageKeys, SafeLocalStorage, type UserMe } from "fogbender-client/src/shared";
import React from "react";
import { useSelector } from "react-redux";

import { actionCreators, useDispatch } from "../redux";
import { getIsAuthorized } from "../redux/session";

import { useServerApiGet } from "./useServerApi";

export function useCheckCurrentSession({ skip }: { skip: boolean }) {
  const [done, setDone] = React.useState(false);
  const isUser = useSelector(getIsAuthorized);

  const dispatch = useDispatch();

  const [loading, error, data] = useServerApiGet<UserMe>(
    isUser || skip ? undefined : "/api/agents/me"
  );
  React.useEffect(() => {
    if (error) {
      console.error("Failed to check session", error);
      dispatch(actionCreators.setUser({ user: null }));
    } else if (!loading && data) {
      SafeLocalStorage.setItem(LocalStorageKeys.HadLogin, "true");
      dispatch(actionCreators.setUser({ user: data }));

      const vendorId = SafeLocalStorage.getItem(LocalStorageKeys.DesignatedVendorId);

      if (vendorId) {
        dispatch(actionCreators.designateVendorId(vendorId));
      }

      const workspaceId = SafeLocalStorage.getItem(LocalStorageKeys.DesignatedWorkspaceId);

      if (workspaceId) {
        dispatch(actionCreators.designateWorkspaceId(workspaceId));
      }

      setDone(true);
    } else if (!loading && !data) {
      dispatch(actionCreators.setUser({ user: null }));
    }
  }, [error, loading, data, dispatch]);
  return [loading, done];
}

export function useFogbenderVendor() {
  const [done, setDone] = React.useState(false);
  const dispatch = useDispatch();
  const [loading, error, data] = useServerApiGet<{ fogbenderWidgetId: string }>(`/api/fogbender`);

  React.useEffect(() => {
    if (error) {
      console.error("Failed to get fogbender", error);
    } else if (!loading && data) {
      dispatch(actionCreators.setFogbenderWidgetId(data.fogbenderWidgetId));
      setDone(true);
    }
  }, [error, loading, data, dispatch]);
  return [loading, done];
}
