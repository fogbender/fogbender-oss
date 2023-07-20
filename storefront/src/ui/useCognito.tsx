import React from "react";

import { getServerUrl } from "../config";

export function useCognito() {
  const login = React.useCallback(async (jwt: string, _onComplete?: () => void) => {
    try {
      const response = await fetch(getServerUrl() + "/auth/cognito", {
        credentials: "include",
        method: "POST",
        body: jwt,
      });
      return (await response.json()) as { ok: boolean; login_callback: null | string };
    } catch (e) {
      return { ok: false, login_callback: null };
    }
  }, []);

  return { login };
}
