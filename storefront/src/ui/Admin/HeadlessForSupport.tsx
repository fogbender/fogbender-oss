import {
  createNewFogbender,
  FogbenderConfig,
  FogbenderFloatingWidget,
  FogbenderHeadlessWidget,
  FogbenderIsConfigured,
  FogbenderProvider,
  FogbenderUnreadBadge,
} from "fogbender-react";
import { useAtom } from "jotai";
import { stringifyUrl } from "query-string";
import React from "react";

import { detectBetaEnvironment, getClientUrlWithBeta } from "../../config";
import { hideHeadlessClientsAtom } from "../../features/config/config.store";
import { useUserToken } from "../useUserToken";
const clientUrl = getClientUrlWithBeta();

export const HeadlessForSupport = ({
  vendorId,
  hideFloatie,
  hideBadge = false,
}: {
  vendorId: string;
  hideFloatie?: boolean;
  hideBadge?: boolean;
}) => {
  const [hideHeadless] = useAtom(hideHeadlessClientsAtom);
  const { token } = useUserToken(vendorId);
  const fogbender = React.useRef(createNewFogbender());

  if (hideHeadless) {
    return null;
  }

  return (
    <div>
      <FogbenderProvider fogbender={fogbender.current}>
        {token && (
          <FogbenderConfig env={detectBetaEnvironment()} clientUrl={clientUrl} token={token} />
        )}
        <FogbenderIsConfigured>
          <FogbenderHeadlessWidget />
          {!hideBadge && <FogbenderUnreadBadge />}
          {!hideFloatie && <FogbenderFloatingWidget />}
        </FogbenderIsConfigured>
      </FogbenderProvider>
    </div>
  );
};

export const useFullScreenClientUrl = (vendorId: string | undefined) => {
  const { token } = useUserToken(vendorId);

  return React.useMemo(() => {
    if (!token) {
      return undefined;
    }

    return stringifyUrl({
      url: clientUrl,
      query: {
        env: detectBetaEnvironment(),
        token: JSON.stringify(token),
      },
    });
  }, [token]);
};
