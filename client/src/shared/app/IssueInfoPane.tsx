import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  type EventRoom,
  type IntegrationIssueInfo,
  type SearchRoster,
  type Tag,
  useLastIncomingMessage,
  useWs,
} from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";

import { DetailedRoomsTable } from "../components/DetailedRoomsTable";
import { Icons, SwitchOff, SwitchOn } from "../components/Icons";
import { LinkButton } from "../components/lib";
import { type Agent } from "../types";
import { queryKeys } from "../utils/client";
import { renderTag } from "../utils/format";

import { type LayoutOptions } from "./LayoutOptions";

dayjs.extend(relativeTime);

export const IssueInfoPane: React.FC<{
  ourId: string | undefined;
  workspaceId: string;
  vendorId: string;
  tag: Tag;
  activeRoomId: string | undefined;
  openRoom: (room: EventRoom, opts: LayoutOptions) => void;
  agents: Agent[] | undefined;
  setShowIssueInfo: (tag: Tag | undefined) => void;
}> = ({ ourId, workspaceId, vendorId, tag, activeRoomId, openRoom, agents, setShowIssueInfo }) => {
  const lastIncomingMessage = useLastIncomingMessage();
  const { serverCall } = useWs();

  const tagName = tag.name;

  const [, , projectId, issueId, _following] = tagName.split(":");

  const roomsByTagData = useQuery(
    queryKeys.roomsByTagName(workspaceId, tagName),
    async () => {
      if (tagName) {
        const res = await serverCall<SearchRoster>({
          msgType: "Search.Roster",
          tagNames: [tagName],
          workspaceId,
        });
        if (res.msgType === "Search.Ok" && res.items.length > 0) {
          return res.items;
        }
      }
      return;
    },
    {
      enabled: !!tagName,
    }
  );

  const { data: roomsByTag } = roomsByTagData;

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.RosterRoom") {
      roomsByTagData.refetch();
    }
  }, [lastIncomingMessage, roomsByTagData]);

  const issueInfoData = useQuery(
    queryKeys.issueInfo(workspaceId, projectId, issueId),
    async () => {
      const res = await serverCall<IntegrationIssueInfo>({
        msgType: "Integration.IssueInfo",
        workspaceId,
        integrationProjectId: projectId,
        issueId,
      });
      if (res.msgType === "Integration.Ok" && "issue" in res) {
        return res["issue"];
      } else {
        return;
      }
    },
    {
      enabled: !!issueId,
    }
  );

  const { data: issueInfo } = issueInfoData;

  const [showClosed, setShowClosed] = React.useState(false);

  return (
    <div
      className={classNames(
        "relative flex flex-col justify-end overflow-hidden h-full focus:outline-none bg-white dark:bg-gray-800",
        "sm:border-l",
        "p-2"
      )}
    >
      <div
        className={classNames(
          "fbr-scrollbar flex flex-col gap-2 justify-start flex-1 overflow-auto overflow-x-hidden text-black dark:text-white"
        )}
      >
        <div className="flex gap-2 items-center">
          <LinkButton onClick={() => setShowIssueInfo(undefined)} className="!p-0">
            <Icons.ArrowBack />
          </LinkButton>

          {renderTag(tag, { asLink: false })}

          {(issueInfoData.isLoading || issueInfoData.isRefetching) && (
            <Icons.Spinner className="w-3 h-3 text-blue-500" />
          )}
        </div>

        {issueInfo && (
          <table className="text-xs w-full">
            <tbody>
              <tr>
                <td className="p-2 text-left">URL</td>
                <td className="p-2 text-left">
                  <a
                    className="fog:text-link no-underline font-semibold break-all"
                    href={issueInfo.url}
                    rel="noopener"
                    target="_blank"
                  >
                    {issueInfo.url}
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-2 text-left">Title</td>
                <td className="p-2 text-left">
                  <span className="font-semibold">{issueInfo.title}</span>
                </td>
              </tr>
              <tr>
                <td className="p-2 text-left">Status</td>
                <td className="p-2 text-left">
                  <span className="font-semibold">{issueInfo.state}</span>
                </td>
              </tr>
              {issueInfo.labels && (
                <tr>
                  <td className="p-2 text-left">Labels</td>
                  <td className="p-2 text-left flex flex-wrap gap-1">
                    {issueInfo.labels?.map((label, i) => (
                      <div key={i} className="font-semibold">
                        {label.title}
                      </div>
                    ))}
                  </td>
                </tr>
              )}
              <tr className="cursor-pointer" onClick={() => setShowClosed(x => !x)}>
                <td className="p-2 text-left">
                  {showClosed ? <SwitchOn className="w-7" /> : <SwitchOff className="w-7" />}
                </td>
                <td className="p-2 text-left">Show closed</td>
              </tr>
            </tbody>
          </table>
        )}

        {roomsByTag && (
          <DetailedRoomsTable
            ourId={ourId}
            vendorId={vendorId}
            rooms={roomsByTag}
            loading={roomsByTagData.isLoading || roomsByTagData.isRefetching}
            agents={agents}
            activeRoomId={activeRoomId}
            openRosterClick={(e, r) => openRoom(r, { forceFullscreen: e.metaKey || e.ctrlKey })}
            onTagClick={(tag: Tag) => setShowIssueInfo(tag)}
            showCustomerName={true}
            showClosed={showClosed}
          />
        )}
      </div>
    </div>
  );
};
