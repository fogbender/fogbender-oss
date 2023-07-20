import { atomWithLocalStorage, LocalStorageKeys } from "fogbender-client/src/shared";
import { PrimitiveAtom, useAtom } from "jotai";
import React from "react";

const vendorNameCache: Record<string, string> = {};
const workspaceNameCache: Record<string, string> = {};

const vendorNameCacheAtom = atomWithLocalStorage(
  LocalStorageKeys.DesignatedVendorNames,
  vendorNameCache
);
const workspaceNameCacheAtom = atomWithLocalStorage(
  LocalStorageKeys.DesignatedWorkspaceNames,
  workspaceNameCache
);

/** Returns cached value if it exists in localStorage or latest value.  */
export function useLSCache<T>(
  cacheAtom: PrimitiveAtom<Record<string, T>>,
  cacheKey: string | undefined,
  latestValue: T | undefined
) {
  const [cache, setCache] = useAtom(cacheAtom);
  const cacheValue = React.useRef(cacheKey ? cache[cacheKey] : undefined);
  React.useEffect(() => {
    if (cacheValue.current !== latestValue && cacheKey && latestValue) {
      cacheValue.current = latestValue;
      setCache(cache => ({ ...cache, [cacheKey]: latestValue }));
    }
  }, [cacheKey, latestValue, setCache]);
  return cacheValue.current || latestValue;
}

export function useDesignatedVendorNameCache(
  designatedVendorId: string | undefined,
  designatedVendorName: string | undefined
) {
  return useLSCache(vendorNameCacheAtom, designatedVendorId, designatedVendorName);
}

export function useDesignatedWorkspaceNameCache(
  designatedWorkspaceId: string | undefined,
  designatedWorkspaceName: string | undefined
) {
  return useLSCache(workspaceNameCacheAtom, designatedWorkspaceId, designatedWorkspaceName);
}
