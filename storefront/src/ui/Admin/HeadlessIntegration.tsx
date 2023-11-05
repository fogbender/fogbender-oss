import {
  atomWithKey,
  type EventBadge,
  UnreadCircle,
  UnreadCircleExpanded,
  useFavicon,
  useIsIdle,
  useLastIncomingMessage,
  useSharedRoster,
  WsProvider,
} from "fogbender-client/src/shared";
import { atom, useAtom } from "jotai";
import { useUpdateAtom } from "jotai/utils";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSelector } from "react-redux";

import { hideHeadlessClientsAtom } from "../../features/config/config.store";
import { getAuthenticatedAgentId } from "../../redux/session";
import { useVendorsQuery } from "../useVendor";

import { client } from "./client";

export const badgesAtom = atomWithKey("unreadCounter", atom([] as EventBadge[]));

export const HeadlessIntegration = () => {
  const [hideHeadless] = useAtom(hideHeadlessClientsAtom);
  if (hideHeadless) {
    return null;
  }
  return <HeadlessIntegrationInt />;
};

export const HeadlessIntegrationInt = () => {
  const agentId = useSelector(getAuthenticatedAgentId);

  const vendors = useVendorsQuery();
  const anyVendorId = React.useMemo(() => vendors?.find(() => true)?.id, [vendors]);
  const agentToken = React.useMemo(() => {
    if (agentId && anyVendorId) {
      return {
        agentId,
        vendorId: anyVendorId,
      };
    }
    return;
  }, [agentId, anyVendorId]);
  if (!agentToken) {
    return null;
  }
  return (
    <ErrorBoundary
      fallback={
        <div className="fixed bottom-0 left-0 z-10 m-4 rounded-lg bg-red-500 bg-opacity-50 p-1 px-2">
          fogbender headless client has crashed
        </div>
      }
    >
      <WsProvider token={agentToken} isIdle={true} client={client}>
        <HeadlessAgentApp />
      </WsProvider>
    </ErrorBoundary>
  );
};

const HeadlessAgentApp = () => {
  const lastIncomingMessage = useLastIncomingMessage();
  const { badges, roomById } = useSharedRoster();

  const setBadges = useUpdateAtom(badgesAtom);

  React.useEffect(() => {
    setBadges(Object.values(badges));
  }, [badges, setBadges]);

  const enabled = true;
  const isIdle = useIsIdle();
  useFavicon(enabled, badges, roomById, isIdle === true, lastIncomingMessage);

  // TODO: notifications

  return null;
};

export const UnreadBadge: React.FC<{
  vendorId?: string;
  workspaceId?: string;
  expanded?: boolean;
  excludeWorkspaceId?: string;
}> = ({ vendorId, workspaceId, expanded, excludeWorkspaceId }) => {
  const [badges] = useAtom(badgesAtom);
  const filteredBadges = React.useMemo(() => {
    if (vendorId) {
      return badges.filter(badge => badge.vendorId === vendorId);
    }
    if (workspaceId) {
      return badges.filter(badge => badge.workspaceId === workspaceId);
    }
    if (excludeWorkspaceId) {
      return badges.filter(badge => badge.workspaceId !== excludeWorkspaceId);
    }
    return badges;
  }, [badges, vendorId, workspaceId, excludeWorkspaceId]);

  const unreadCount = React.useMemo(() => {
    return countBadges(filteredBadges, expanded);
  }, [expanded, filteredBadges]);
  if (unreadCount.hasUnread === "no" && !expanded) {
    return null;
  }
  return expanded ? (
    <UnreadCircleExpanded
      total={unreadCount.count}
      asMention={unreadCount.hasUnread === "direct"}
    />
  ) : (
    <UnreadCircle total={unreadCount.count} asMention={unreadCount.hasUnread === "direct"} />
  );
};

// if isExact is false, then user has at least `count` unread messages, but may have more
function countBadges(
  filteredBadges: EventBadge[],
  requireExactCount = false
): {
  hasUnread: "yes" | "no" | "direct";
  count: number;
  isExact: boolean;
} {
  let isDirect = false;
  let count = 0;
  filteredBadges.find(badge => {
    if (badge.mentionsCount) {
      isDirect = true;
    } else if (badge.count) {
      isDirect = badge.roomType === "dialog";
    }
    if (badge.count > 0) {
      count++;
    }
    // stop once first mention or dialog is found if exactCount is false
    return isDirect && !requireExactCount;
  });
  return {
    hasUnread: isDirect ? "direct" : count > 0 ? "yes" : "no",
    count,
    isExact: isDirect ? requireExactCount : true,
  };
}
