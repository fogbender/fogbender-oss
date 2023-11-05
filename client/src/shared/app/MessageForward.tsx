import classNames from "classnames";
import {
  type EventRoom,
  invariant,
  KnownCommsIntegrations,
  KnownIssueTrackerIntegrations,
  type Message,
  type MessageCreate,
  type SearchRoster,
  useRoster,
  useRosterActions,
  useSharedRoster,
  useWs,
} from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";
import { v4 as uuidv4 } from "uuid";

import { Icons } from "../components/Icons";
import { FilterInput, ThickButton } from "../components/lib";
import { MessageView } from "../messages/MessageView";
import { queryKeys } from "../utils/client";
import { formatCustomerName, renderTag } from "../utils/format";

type ForwardMode = "Existing room" | "Customer" | "Related rooms";

const KnownIntegrations = [...KnownCommsIntegrations, ...KnownIssueTrackerIntegrations];

const filterInputPlaceholder = {
  "Existing room": "Search by room name",
  "Customer": "Search by customer name",
};

export const MessageForward: React.FC<{
  fromRoomId?: string;
  userId?: string;
  helpdeskId?: string;
  workspaceId?: string;
  vendorId?: string;
  selection: Message[];
  isInternal: boolean;
  messagesByTarget: { [targetId: string]: Message[] };
  messageCreateMany: (messages: MessageCreate[]) => void;
  onComplete: () => void;
  isAgent: boolean | undefined;
}> = ({
  fromRoomId,
  userId,
  helpdeskId,
  workspaceId,
  selection,
  isInternal,
  messagesByTarget,
  messageCreateMany,
  onComplete,
  isAgent,
}) => {
  const { roomById } = useSharedRoster();
  const { serverCall } = useWs();
  const { roomsByTags } = useRosterActions({ helpdeskId, workspaceId });
  const { filteredRoster, setRosterFilter } = useRoster({
    helpdeskId,
    workspaceId,
    userId,
  });

  const room = fromRoomId ? roomById(fromRoomId) : undefined;

  const [selectedRooms, setSelectedRooms] = React.useState(new Set<string>());

  const [rosterSearchValue, setRosterSearchValue] = React.useState<string>();

  const [forwardModes, setForwardModes] = React.useState<ForwardMode[]>(["Existing room"]);
  const [forwardMode, setForwardMode] = React.useState<ForwardMode>("Existing room");

  const broadcastTag = room?.tags?.find(t => t.name === ":triage");
  const isBroadcast = isInternal && broadcastTag !== undefined;

  const connectedIssueTag = React.useMemo(() => {
    const tag = room?.tags?.find(t => {
      const [, integration, project, issue, following] = t.name.split(":");
      if (
        integration &&
        KnownIntegrations.includes(integration) &&
        project &&
        issue &&
        !following
      ) {
        return true;
      } else {
        return false;
      }
    });
    return tag;
  }, [room]);

  const { data: filteredCustomers } = useQuery({
    queryKey: queryKeys.customerSearch(workspaceId, rosterSearchValue),
    queryFn: async () => {
      const res = await serverCall<SearchRoster>({
        msgType: "Search.Roster",
        term: rosterSearchValue || "Triage",
        termFields: ["rname", "cname"],
        type: "public",
        workspaceId,
      });
      if (isAgent) {
        invariant(res.msgType === "Search.Ok", "Expected search to return Search.Ok", () => {
          console.error("Customer search failed", workspaceId, rosterSearchValue, res);
        });
        return res.items.filter(c => c.isTriage);
      } else {
        return [];
      }
    },
  });

  const isConnectedToIssue = connectedIssueTag !== undefined;

  React.useEffect(() => {
    if (forwardMode === "Existing room" || forwardMode === "Customer") {
      setRosterFilter(rosterSearchValue);
    }
  }, [forwardMode, rosterSearchValue]);

  React.useEffect(() => {
    if (isConnectedToIssue && isInternal) {
      setForwardModes(modes =>
        modes.includes("Related rooms") ? modes : modes.concat("Related rooms")
      );
    }
    if (isBroadcast) {
      setForwardModes(modes => (modes.includes("Customer") ? modes : modes.concat("Customer")));
      setForwardMode("Customer");
    }
  }, [isBroadcast, isConnectedToIssue]);

  const [linkedRooms, setLinkedRooms] = React.useState<EventRoom[]>([]);

  React.useEffect(() => {
    if (forwardMode === "Related rooms" && connectedIssueTag) {
      roomsByTags([connectedIssueTag.id]).then(rooms => setLinkedRooms(rooms));
    }
    setSelectedRooms(new Set());
  }, [forwardMode, connectedIssueTag]);

  const rosterToShow = React.useMemo(() => {
    if (forwardMode === "Existing room") {
      return filteredRoster.filter(x => x.id !== fromRoomId);
    } else if (forwardMode === "Customer") {
      return (filteredCustomers || []).filter(x => x.id !== fromRoomId);
    } else if (forwardMode === "Related rooms") {
      return linkedRooms.filter(x => x.id !== fromRoomId);
    }
    return [];
  }, [forwardMode, fromRoomId, filteredRoster, filteredCustomers, linkedRooms]);

  React.useEffect(() => {
    setRosterSearchValue(undefined);
  }, [forwardMode]);

  const allRoomsSelected = React.useMemo(() => {
    return rosterToShow.length > 0 && rosterToShow.every(x => selectedRooms.has(x.id));
  }, [selectedRooms, rosterToShow]);

  const [forwarding, setForwarding] = React.useState(false);
  const [forwardError, setForwardError] = React.useState(false);

  const forwardIsDisabled = selectedRooms.size === 0;

  const forwardButtonTitle =
    selectedRooms.size === 0
      ? "Forward"
      : selectedRooms.size === 1
      ? `Forward to 1 room`
      : `Broadcast to ${selectedRooms.size} rooms`;

  const forwardSelection = async () => {
    const linkStartMessageId = selection[0]?.id;
    const linkEndMessageId = selection.slice(-1)[0]?.id;
    if (linkStartMessageId && linkEndMessageId) {
      const linkRoomId = selection[0]?.roomId;
      const linkStartMessageId = selection[0]?.id;
      const linkEndMessageId = selection.slice(-1)[0]?.id;
      if (!linkRoomId || !linkStartMessageId || !linkEndMessageId) {
        return false;
      }
      setForwarding(true);
      try {
        await messageCreateMany(
          Array.from(selectedRooms).map(targetRoomId => ({
            msgType: "Message.Create",
            clientId: uuidv4(),
            roomId: targetRoomId,
            text: selectedRooms.size === 1 ? `[Forward]` : `[Broadcast]`,
            linkRoomId,
            linkStartMessageId,
            linkEndMessageId,
            linkType: "forward",
          }))
        );
      } catch (e: any) {
        setForwardError(e.error);
        throw e;
      } finally {
        setForwarding(false);
      }

      return true;
    }

    return false;
  };

  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async () => {
    let success = false;

    setSubmitting(true);

    success = await forwardSelection();

    setSubmitting(false);

    if (success) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="fog:text-header3">
        {selection.length === 1 ? `1 message` : `${selection.length} messages`}
      </div>
      <div className="relative w-full overflow-y-auto fbr-scrollbar" style={{ maxHeight: "8rem" }}>
        {selection.map(msg => (
          <MessageView
            key={msg.id}
            message={msg}
            prevMessage={undefined}
            nextMessage={undefined}
            isLast={false}
            isFirst={false}
            onMessageClick={undefined}
            selected={false}
            selectedSingle={false}
            flipTagHighlight={() => {}}
            highlightedTags={[]}
            roomById={roomById}
            inInternalRoom={isInternal}
            messageUpdate={() => {}}
            setReaction={() => {}}
            sourceMessages={messagesByTarget[msg.id]}
            onMessageRef={undefined}
            newMessagesAtId={undefined}
            newMessagesIsDimmed={false}
            allowForward={false}
            allowFileIssue={false}
            allowDelete={false}
            showAiHelper={false}
            cancelSelection={() => {}}
            isSearchView={true}
            nonInteractive={true}
            inDialog={false}
          />
        ))}
      </div>
      <div
        className={classNames("-mb-4 pt-6 border-t border-gray-300 bg-white", "dark:bg-gray-800")}
      >
        <div className="fog:text-header2">Forward to&hellip;</div>
        {forwardModes.length > 1 && (
          <div className="flex flex-wrap items-center -mx-8 px-8 mb-4 border-b border-gray-200">
            {forwardModes.map(mode => (
              <div
                key={mode}
                className={classNames(
                  "py-3 px-6 border-b-5 whitespace-nowrap",
                  mode === forwardMode
                    ? "border-brand-orange-500"
                    : "border-transparent text-blue-500 hover:text-brand-red-500 cursor-pointer"
                )}
                onClick={() => setForwardMode(mode)}
              >
                {mode}
              </div>
            ))}
          </div>
        )}

        {(forwardMode === "Existing room" || forwardMode === "Customer") && (
          <div className="px-2">
            <FilterInput
              placeholder={filterInputPlaceholder[forwardMode]}
              value={rosterSearchValue}
              setValue={setRosterSearchValue}
              noBorder={true}
              focusOnMount={true}
            />
          </div>
        )}

        <div className="overflow-y-auto fbr-scrollbar" style={{ height: "25vh" }}>
          <table className="relative w-full fog:text-body-m border-0">
            <thead className={classNames("sticky top-0 bg-white", "dark:bg-gray-800")}>
              <tr>
                <th
                  className="w-5 p-2 border-b border-gray-200 text-blue-700 align-middle text-center"
                  onClick={
                    allRoomsSelected
                      ? () => setSelectedRooms(new Set())
                      : () => setSelectedRooms(new Set(rosterToShow.map(x => x.id)))
                  }
                >
                  <div
                    className={classNames(
                      rosterToShow.length === 0 && "invisible pointer-events-none"
                    )}
                  >
                    {allRoomsSelected ? <Icons.CheckboxOn /> : <Icons.CheckboxOff />}
                  </div>
                </th>
                {isAgent && (
                  <th
                    className="p-2 border-b border-gray-200 fog:text-caption-l text-left"
                    style={{ width: "40%" }}
                  >
                    Customer
                  </th>
                )}
                {isAgent && (
                  <th
                    className="p-2 border-b border-gray-200 fog:text-caption-l text-left"
                    style={{ width: "40%" }}
                  >
                    Customer id
                  </th>
                )}
                <th className="p-2 border-b border-gray-200 fog:text-caption-l text-left">Room</th>
                {isConnectedToIssue && forwardMode === "Related rooms" && (
                  <th className="p-2 border-b border-gray-200 fog:text-caption-l text-left">
                    Issue
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rosterToShow.map(x => (
                <tr
                  key={x.id}
                  className={classNames(
                    "w-5 p-2 hover:bg-gray-100 cursor-pointer",
                    "dark:hover:bg-gray-500",
                    selectedRooms.has(x.id) && "bg-gray-100 dark:bg-gray-500"
                  )}
                  onClick={() =>
                    setSelectedRooms(rooms => {
                      rooms.has(x.id) ? rooms.delete(x.id) : rooms.add(x.id);
                      return new Set(rooms);
                    })
                  }
                >
                  <td className="p-2 text-blue-700 align-middle text-center">
                    {selectedRooms.has(x.id) ? <Icons.CheckboxOn /> : <Icons.CheckboxOff />}
                  </td>
                  {isAgent && (
                    <td className="p-2">
                      <span className="overflow-ellipsis">
                        {formatCustomerName(x.customerName)}
                      </span>
                    </td>
                  )}
                  {isAgent && (
                    <td className="p-2">
                      <span className="overflow-ellipsis">{x.customerId}</span>
                    </td>
                  )}
                  <td className="p-2">
                    <span className="overflow-ellipsis">{x.name}</span>
                  </td>
                  {isConnectedToIssue && connectedIssueTag && forwardMode === "Related rooms" && (
                    <td className="p-2">{renderTag(connectedIssueTag)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center mt-4 gap-x-4">
        <ThickButton
          onClick={onSubmit}
          disabled={forwardIsDisabled}
          loading={forwarding || submitting}
        >
          {forwardButtonTitle}
        </ThickButton>
        <div className="fog:text-body-m">
          {forwardError && <div className="text-red-500">{forwardError}</div>}
        </div>
      </div>
    </div>
  );
};
