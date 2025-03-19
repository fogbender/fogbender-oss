import { createNewFogbender, type FallbackToken, type VisitorToken } from "fogbender";
import {
  FogbenderConfig,
  FogbenderFloatingWidget,
  FogbenderHeadlessWidget,
  FogbenderIsConfigured,
  FogbenderProvider,
  FogbenderUnreadBadge,
  FogbenderRoomyWidget,
} from "fogbender-react";
import React from "react";
import { useSelector } from "react-redux";

import { getClientUrl } from "../config";
import { selectShowWidget } from "../redux/fogbender";
import { defaultToken, useStorageToken } from "../store";

import { AuthContext } from "./Auth";

const clientUrl = getClientUrl();

export const Support = ({ headless }: { headless?: boolean }) => {
  const fogbender = React.useRef(createNewFogbender());
  const token = useToken();
  const showWidget = useSelector(selectShowWidget);
  if (headless && !showWidget) {
    return null;
  }
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        {headless ? <FogbenderHeadlessWidget /> : <FogbenderRoomyWidget />}
        {headless ? <FogbenderFloatingWidget /> : null}
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const SupportFallback = ({ headless }: { headless?: boolean }) => {
  const fogbender = React.useRef(createNewFogbender());
  const fullToken = useToken();
  const token = React.useMemo<FallbackToken | undefined>(
    () =>
      fullToken && fullToken.widgetKey
        ? {
            widgetId: fullToken.widgetId,
            widgetKey: fullToken.widgetKey,
            versions: fullToken.versions,
          }
        : undefined,
    [fullToken]
  );
  const showWidget = useSelector(selectShowWidget);
  if (headless && !showWidget) {
    return null;
  }
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        {headless ? <FogbenderHeadlessWidget /> : <FogbenderRoomyWidget />}
        {headless ? <FogbenderFloatingWidget /> : null}
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const SupportVisitor = ({ headless }: { headless?: boolean }) => {
  const fogbender = React.useRef(createNewFogbender());
  const fullToken = useToken();
  const token = React.useMemo<VisitorToken | undefined>(
    () =>
      fullToken && fullToken.widgetKey
        ? {
            widgetId: fullToken.widgetId,
            visitorKey: fullToken.visitorKey,
            versions: fullToken.versions,
            visitor: true,
          }
        : undefined,
    [fullToken]
  );

  const showWidget = useSelector(selectShowWidget);
  if (headless && !showWidget) {
    return null;
  }
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        {headless ? <FogbenderHeadlessWidget /> : <FogbenderRoomyWidget />}
        {headless ? <FogbenderFloatingWidget /> : null}
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const SupportVisitorFloatie = ({}: { headless?: boolean }) => {
  const fogbender = React.useRef(createNewFogbender());
  const fullToken = useToken();
  const token = React.useMemo<VisitorToken | undefined>(
    () =>
      fullToken && fullToken.widgetKey
        ? {
            widgetId: fullToken.widgetId,
            visitorKey: fullToken.visitorKey,
            versions: fullToken.versions,
            visitor: true,
          }
        : undefined,
    [fullToken]
  );

  return (
    <>
      <div className="min-h-screen bg-gray-300" />
      <FogbenderProvider fogbender={fogbender.current}>
        <FogbenderConfig clientUrl={clientUrl} token={token} />
        <FogbenderIsConfigured>
          <FogbenderFloatingWidget />
        </FogbenderIsConfigured>
      </FogbenderProvider>
    </>
  );
};

export const Badge = () => {
  const fogbender = React.useRef(createNewFogbender());
  const token = useToken();
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        <FogbenderHeadlessWidget />
        <FogbenderUnreadBadge />
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const useToken = () => {
  const lsToken = useLSToken();
  const [state] = React.useContext(AuthContext);
  if (state.isAuthenticated && lsToken.widgetId && lsToken.widgetKey) {
    return lsToken;
  } else {
    return undefined;
  }
};

function useLSToken() {
  const token = { ...defaultToken };

  const storageToken = useStorageToken();
  const queryToken = new URLSearchParams(window.location.search);

  (
    [
      "widgetId",
      "widgetKey",
      "visitorKey",
      "customerId",
      "customerName",
      "userId",
      "userHMAC",
      "userJWT",
      "userPaseto",
      "userName",
      "userAvatarUrl",
      "userEmail",
    ] as const
  ).forEach(key => {
    const value = queryToken.get(key) || storageToken[key];
    if (typeof value === "string" && value.trim() !== "") {
      token[key] = value;
    }
  });

  return token;
}
