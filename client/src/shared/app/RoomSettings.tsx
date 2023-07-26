import classNames from "classnames";
import {
  EventIssue,
  EventRoom,
  Integration as IntegrationT,
  KnownIssueTrackerIntegrations,
  Room as RoomT,
  Tag as TagT,
  useIssues,
  useRoomMembers,
  useRoster,
  useRosterActions,
  useRosterRoom,
  useWs,
  useWsCalls,
} from "fogbender-proto";
import { atom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import { Icons } from "../components/Icons";
import { IntegrationDetails } from "../components/IntegrationDetails";
import { Avatar, FilterInput, ThickButton, ThinButton } from "../components/lib";
import { useTxtAreaWithError } from "../components/useTxtAreaWithError";
import { formatCustomerName, isInternal, renderTag } from "../utils/format";
import { formatRoomTs } from "../utils/formatTs";

import { Issue } from "./FileIssue";

function useImmer<T>(initialValue: T) {
  return useImmerAtom(React.useRef(atom(initialValue)).current);
}

type RoomType = "Discussion" | "Feature" | "Bug" | "Triage" | "Broadcast" | "Issue";
type IssuePriority = "High" | "Medium" | "Low" | undefined;

// `id` is the id of the settings panel (e.g. settings-r123456)
export const RoomSettings: React.FC<{
  isLayoutPinned: boolean;
  userId: string | undefined;
  roomId: string;
  workspaceId: string | undefined;
  vendorId: string | undefined;
  onClose: (id: string) => void;
  openRoomIds: string[];
  onSetRoomPin: (roomId: string, pinned: boolean) => void;
  roomById: (id: string) => RoomT | undefined;
  tags: TagT[] | undefined;
  hasUnread: boolean;
  workspaceIntegrations?: IntegrationT[];
  workspaceTags?: TagT[];
}> = ({
  isLayoutPinned,
  userId,
  roomId,
  workspaceId,
  vendorId,
  onClose,
  onSetRoomPin,
  openRoomIds,
  roomById,
  hasUnread,
  workspaceIntegrations = [],
  workspaceTags = [],
}) => {
  const { isAgent } = useWs();
  const { markRoomAsSeen, markRoomAsUnseen } = useWsCalls();
  const { rosterRoom } = useRosterRoom(roomId);
  const room = rosterRoom ? rosterRoom.room : roomById(roomId);

  const [saveCounter, setSaveCounter] = React.useState(1);

  const [roomNameError, setRoomNameError] = React.useState<string>();

  const {
    txtAreaValue: roomName,
    fieldElement: roomNameInput,
    resetTxtArea: resetRoomName,
    setValue: setRoomName,
  } = useTxtAreaWithError({
    title: "Room name",
    error: roomNameError,
    defaultValue: room?.name,
    disabled: !isAgent,
    className: !isAgent ? "!bg-gray-100 border-gray-100" : "",
  });

  const [membersToAdd, setMembersToAdd] = React.useState<string[]>([]);
  const [membersToRemove, setMembersToRemove] = React.useState<string[]>([]);

  const [tagsToAdd, setTagsToAdd] = React.useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = React.useState<string[]>([]);

  const isInternalRoom = isInternal(room?.customerName);
  const linkedReadOnly = isInternalRoom;

  const [initialRoomType, setInitialRoomType] = React.useState<RoomType>(() => {
    const roomTags = room?.tags?.map(x => x.name) || [];
    if (roomTags.includes(":discussion")) {
      return "Discussion";
    }
    if (isInternalRoom && roomTags.includes(":triage")) {
      return "Broadcast";
    }
    if (roomTags.includes(":issue")) {
      return "Issue";
    }
    return "Discussion";
  });

  const [roomType, setRoomType] = React.useState<RoomType>(() => initialRoomType);

  const [initialIssuePriority, setInitialIssuePriority] = React.useState<IssuePriority>(() => {
    const roomTags = room?.tags?.map(x => x.name) || [];

    if (roomTags.includes(":priority:high")) {
      return "High";
    }
    if (roomTags.includes(":priority:medium")) {
      return "Medium";
    }
    if (roomTags.includes(":priority:low")) {
      return "Low";
    }

    return undefined;
  });

  const [issuePriority, setIssuePriority] = React.useState<IssuePriority>(
    () => initialIssuePriority
  );

  const { updateRoom, labelIssue, unarchiveRoom, createIssue } = useRosterActions({
    workspaceId,
  });

  const myPinTag = userId ? `:@${userId}:pin` : undefined;
  const isRosterPinned = room?.tags?.some(t => t.name === myPinTag) || false;

  const onRosterPinRoom = React.useCallback(() => {
    if (!room || !myPinTag) {
      return;
    }
    const isPinned = room.tags?.some(t => t.name === myPinTag);
    if (isPinned) {
      updateRoom({ roomId: room.id, tagsToRemove: [myPinTag] });
    } else {
      updateRoom({ roomId: room.id, tagsToAdd: [myPinTag] });
    }
  }, [room, myPinTag, updateRoom]);

  /*
  const onArchiveRoom = React.useCallback(() => {
    archiveRoom({ roomId }).then(res => {
      if (res.msgType !== "Room.Ok") {
        throw res;
      }
      onClose(roomId);
    });
  }, [roomId, archiveRoom, onClose]);
  */

  const onUnarchiveRoom = React.useCallback(() => {
    unarchiveRoom({ roomId }).then(res => {
      if (res.msgType !== "Room.Ok") {
        throw res;
      }
    });
  }, [roomId, unarchiveRoom]);

  const [updating, setUpdating] = React.useState(false);

  const [updateError, setUpdateError] = React.useState<string>();

  const settingsPanes = room?.isTriage || !isAgent ? ["General"] : ["General", "Linked issues"];
  const [settingsPane, setSettingsPane] = React.useState<(typeof settingsPanes)[number]>("General");

  const issueTrackerIntegrations = workspaceIntegrations.filter(wi =>
    KnownIssueTrackerIntegrations.includes(wi.type)
  );

  const hasIssueTrackerIntegrations = issueTrackerIntegrations.length > 0;

  const [selectedIntegrationIds, setSelectedIntegrationIds] = React.useState<Set<string>>(
    new Set([])
  );

  const connectedIntegrationIds: string[] = (room?.tags || [])
    .filter(t => t.meta_type === "issue")
    .map(t => t.meta_entity_parent_id)
    .filter(x => x !== undefined) as string[];

  React.useEffect(() => {
    setSelectedIntegrationIds(new Set(connectedIntegrationIds));
  }, [room?.tags]);

  const newConnectedIds = Array.from(selectedIntegrationIds).filter(
    id => !connectedIntegrationIds.includes(id)
  );

  const { issues, issuesFilter, setIssuesFilter, issuesLoading } = useIssues({ workspaceId });

  const [selectedIssue, setSelectedIssue] = React.useState<EventIssue>();

  const findIntegration = (projectId: string) =>
    issueTrackerIntegrations.find(i => i.project_id === projectId);

  const changes = {
    name: roomName.trim() !== room?.name,
    members: membersToAdd.length > 0 || membersToRemove.length > 0,
    tags: tagsToAdd.length > 0 || tagsToRemove.length > 0,
    roomType: roomType !== initialRoomType,
    issuePriority: issuePriority !== initialIssuePriority,
    newIssues: newConnectedIds.length > 0,
    linkToIssue: !!selectedIssue,
  };

  const formHasChanges =
    changes.name ||
    changes.members ||
    changes.tags ||
    changes.roomType ||
    changes.issuePriority ||
    changes.newIssues ||
    changes.linkToIssue;

  const onUpdate = React.useCallback(async () => {
    if (!formHasChanges || !room) {
      /*
      // why close?

      if (room) {
        onClose(room.id);
      }
      */
      return;
    }
    setUpdateError(undefined);
    if (changes.name) {
      setUpdating(true);
      const res = await updateRoom({
        roomId: room.id,
        name: roomName,
      });
      setUpdating(false);
      if (res.msgType !== "Room.Ok") {
        if (res.code === 409) {
          setRoomNameError("Room name already taken");
        } else {
          setUpdateError(res.error);
        }
        return;
      }
      resetRoomName(roomName);
      setRoomNameError(undefined);
    }
    if (changes.members) {
      setUpdating(true);
      const res = await updateRoom({
        roomId: room.id,
        membersToAdd,
        membersToRemove,
      });
      setUpdating(false);
      if (res.msgType !== "Room.Ok") {
        setUpdateError(res.error);
        return;
      }
      setMembersToAdd(() => []);
      setMembersToRemove(() => []);
    }
    if (changes.tags) {
      setUpdating(true);
      const res = await updateRoom({
        roomId: room.id,
        tagsToAdd,
        tagsToRemove,
      });

      if (res.msgType !== "Room.Ok") {
        setUpdateError(res.error);
        return;
      }

      if (selectedIssue) {
        await labelIssue({
          integrationProjectId: selectedIssue.integrationProjectId,
          issueId: selectedIssue.id,
        });

        setIssuesFilter("");
        setSelectedIssue(undefined);
      }

      setUpdating(false);

      setTagsToAdd(() => []);
      setTagsToRemove(() => []);
    }
    if (changes.roomType) {
      setUpdating(true);
      const res = await updateRoom({
        roomId: room.id,
        tagsToAdd:
          roomType === "Discussion"
            ? [":discussion"]
            : roomType === "Issue"
            ? [":issue", ":status:open"]
            : roomType === "Broadcast"
            ? [":triage"]
            : [],
        tagsToRemove:
          roomType === "Issue"
            ? [":discussion", ":feature", ":bug", ":triage", ":status:closed"] // no tags for issue
            : roomType === "Broadcast"
            ? [":discussion", ":bug", ":feature", ":status:open", ":status:closed"] // remove all but :triage
            : [":issue", ":feature", ":bug", ":triage", ":status:open", ":status:closed"], // default is :discussion or none
      });
      setUpdating(false);
      if (res.msgType !== "Room.Ok") {
        setUpdateError(res.error);
        return;
      }
      setInitialRoomType(roomType);
    }
    if (changes.issuePriority) {
      setUpdating(true);
      const res = await updateRoom({
        roomId: room.id,
        tagsToAdd:
          issuePriority === "High"
            ? [":priority:high"]
            : issuePriority === "Medium"
            ? [":priority:medium"]
            : issuePriority === "Low"
            ? [":priority:low"]
            : [],
        tagsToRemove:
          issuePriority === "Low"
            ? [":priority:high", ":priority:medium"]
            : issuePriority === "Medium"
            ? [":priority:high", ":priority:low"]
            : issuePriority === "High"
            ? [":priority:medium", ":priority:low"]
            : [":priority:high", ":priority:medium", ":priority:low"],
      });
      setUpdating(false);
      if (res.msgType !== "Room.Ok") {
        setUpdateError(res.error);
        return;
      }
      setInitialIssuePriority(issuePriority);
    }
    if (changes.newIssues) {
      newConnectedIds.forEach(async projectId => {
        setUpdating(true);
        await createIssue({
          integrationProjectId: projectId,
          title: roomName,
          roomId,
        });
        setUpdating(false);
      });
    }
    setSaveCounter(counter => counter + 1);
  }, [
    room,
    formHasChanges,
    changes,
    membersToAdd,
    membersToRemove,
    tagsToAdd,
    tagsToRemove,
    onClose,
    roomName,
  ]);

  if (!room) {
    return null;
  }

  const integrations = ["gitlab", "github", "jira", "trello", "asana"] as const;
  const actionsClassName = "grid grid-cols-1 gap-y-1 gap-x-2 items-center sm:flex sm:gap-y-0";
  const formClassName = "col-span-1 sm:col-span-3 flex items-center";
  const [debugToggleShowTags, setDebugToggleShowTags] = React.useState(false);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onUpdate();
      }}
    >
      <div className="flex items-center gap-x-4 mb-6">
        <div className="flex-1 text-gray-700 leading-none text-right">Room settings</div>
      </div>

      <div className="my-4">{roomNameInput}</div>

      <div className="grid grid-cols-[auto_minmax(0,_1fr)] sm:grid-cols-4 gap-6 fog:text-body-m">
        {isAgent && settingsPanes.length > 1 && (
          <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center -mx-8 px-4 sm:px-8 mb-4 border-b border-gray-200">
            {settingsPanes.map(pane => (
              <div
                key={pane}
                className={classNames(
                  "py-3 px-6 border-b-5 whitespace-nowrap",
                  pane === settingsPane
                    ? "border-brand-orange-500"
                    : "border-transparent text-blue-500 hover:text-brand-red-500 cursor-pointer"
                )}
                onClick={() => setSettingsPane(pane)}
              >
                {pane}
              </div>
            ))}
          </div>
        )}
        {isAgent && (
          <>
            <div className="flex items-center text-gray-500">Customer</div>
            <div className={classNames(formClassName, "gap-x-3")}>
              <div className={classNames("flex-1 truncate", isInternalRoom && "text-green-500")}>
                {formatCustomerName(room.customerName)}
              </div>
            </div>
          </>
        )}

        {settingsPane === "General" && (
          <>
            <div className="text-gray-500">Created</div>
            <div className={classNames(formClassName, "flex-wrap gap-x-4")}>
              <div>{formatRoomTs(room.createdTs)}</div>
            </div>
          </>
        )}

        {isAgent && room?.isTriage && (
          <>
            <div className="flex items-start text-gray-500">Room type</div>
            <div className={formClassName}>
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center gap-x-2">
                  <Icons.RadioFullDisabled className="w-5 h-5 text-blue-500" />
                  <span>Triage</span>
                  <Icons.RoomTriage className="w-4 h-4 text-gray-500 hidden" />
                </div>
              </div>
            </div>
          </>
        )}

        {settingsPane === "General" && isAgent && !room?.isTriage && (
          <RoomTypeSelector room={room} roomType={roomType} setRoomType={setRoomType} />
        )}

        {settingsPane === "General" && !room?.isTriage && isAgent && (
          <IssuePrioritySelector
            issuePriority={issuePriority}
            setIssuePriority={setIssuePriority}
          />
        )}

        {settingsPane === "General" && (
          <>
            <div className="flex items-center text-gray-500">Room privacy</div>
            <div className={classNames(formClassName, "fog:text-caption-l gap-x-2")}>
              <span className="capitalize">{room.type}</span>
            </div>
            <div className="flex items-center text-gray-500">Room Visibility</div>
            <div className="col-span-1 capitalize sm:col-span-3 fog:text-body-s fog:text-caption-l">
              {room.type === "public" ? "team" : room.type === "private" ? "room members" : ""}
            </div>
          </>
        )}

        {settingsPane === "General" && (
          <>
            <div className="flex text-gray-500">Actions</div>
            <div className={classNames(formClassName, "fog:text-caption-l")}>
              <div className="flex flex-col gap-y-3">
                {openRoomIds.includes(room.id) && (
                  <div className={actionsClassName}>
                    <ThinButton
                      className="min-w-[7rem]"
                      onClick={() => onSetRoomPin(roomId, !isLayoutPinned)}
                    >
                      {isLayoutPinned ? "Unpin" : "Pin"} (layout)
                    </ThinButton>
                    <div className="fog:text-body-s text-gray-500">Visibility: only you</div>
                  </div>
                )}

                {isAgent && (
                  <>
                    {hasUnread && (
                      <div className={actionsClassName}>
                        <ThinButton className="min-w-[7rem]" onClick={() => markRoomAsSeen(roomId)}>
                          Mark as read
                        </ThinButton>
                        <div className="fog:text-body-s text-gray-500">Visibility: only you</div>
                      </div>
                    )}
                    <div className={actionsClassName}>
                      <ThinButton className="min-w-[7rem]" onClick={onRosterPinRoom}>
                        {isRosterPinned ? "Unpin (roster)" : "Pin (roster)"}
                      </ThinButton>
                      <div className="fog:text-body-s text-gray-500">Visibility: only you</div>
                    </div>
                    {isInternalRoom && room.type === "public" && (
                      <div className={actionsClassName}>
                        <ThinButton
                          className="min-w-[7rem]"
                          onClick={() => {
                            markRoomAsUnseen(room.id);
                            onClose(room.id);
                          }}
                        >
                          Unfollow
                        </ThinButton>
                        <div className="fog:text-body-s text-gray-500">
                          Stop notifications. Visibility: only you
                        </div>
                      </div>
                    )}
                    {room.status === "archived" && (
                      <div className={actionsClassName}>
                        <ThinButton className="min-w-[7rem]" onClick={onUnarchiveRoom}>
                          Unarchive
                        </ThinButton>
                        <div className="fog:text-body-s text-gray-500">
                          {room.status === "archived"
                            ? "Visibility: team"
                            : "Can be undone. Visibility: team"}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {settingsPane === "General" && room.type === "private" && (
          <>
            <div className="pt-1.5 text-gray-500">Members</div>
            <div className="col-span-1 sm:col-span-3 flex flex-col justify-center gap-y-2 fog:text-caption-l">
              <MembersList
                key={saveCounter}
                roomId={roomId}
                userId={userId}
                workspaceId={workspaceId}
                customerId={room?.customerId}
                onChange={(toAdd, toRemove) => {
                  setMembersToAdd(toAdd);
                  setMembersToRemove(toRemove);
                }}
              />
            </div>
          </>
        )}

        {settingsPane === "Linked issues" && (
          <>
            <div className="col-span-2 sm:col-span-4">
              {(room.tags || [])
                .filter(t => t.meta_type === "issue")
                .map(t => (
                  <span key={t.id} className="grid grid-cols-4">
                    <span className="text-gray-500">Issue</span>
                    <span
                      title={t.meta_entity_name}
                      className={classNames("col-span-2 flex gap-1 justify-between")}
                    >
                      <span className="whitespace-nowrap">{renderTag(t)}</span>
                      <b className="whitespace-normal">{t.meta_entity_name}</b>
                    </span>
                    {!linkedReadOnly &&
                      (tagsToRemove.includes(t.id) ? (
                        <div className="text-right">Will unlik</div>
                      ) : (
                        <div
                          className="fog:text-link font-bold text-right"
                          onClick={() => {
                            setTagsToRemove(x => {
                              x.push(t.id);
                              return Array.from(new Set(x));
                            });
                          }}
                        >
                          Unlink
                        </div>
                      ))}
                  </span>
                ))}
            </div>

            <div className="col-span-2 sm:col-span-4">
              {!hasIssueTrackerIntegrations && (
                <div className="grid grid-cols-4">
                  <div className="text-gray-500">Issue trackers</div>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg col-span-3 text-black flex flex-col gap-6">
                    <div>You don’t have any integrations configured.</div>
                    <div className="flex space-x-3">
                      {integrations.map(i => {
                        return (
                          <div key={`integration-${i}`} className="text-gray-500 w-5">
                            {IntegrationDetails[i].icon}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-gray-500">
                      To link rooms to issues in GitLab, GitHub, Asana, Jira, or similar,{" "}
                      <a
                        className="fog:text-link"
                        href={`/admin/vendor/${vendorId}/workspace/${workspaceId}/settings?add_integration`}
                      >
                        add an integration in workspace settings.
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {hasIssueTrackerIntegrations && (
                <div className="grid grid-cols-4">
                  <div className="text-gray-500">Issue trackers</div>
                  <span className="col-span-3 flex flex-col gap-3">
                    {issueTrackerIntegrations.map(i => {
                      const tag = workspaceTags.find(t => t.name === i.meta_tag);

                      if (tag) {
                        return (
                          <span
                            key={i.id}
                            onClick={() => {
                              if (linkedReadOnly) {
                                return;
                              }

                              if (connectedIntegrationIds.includes(i.project_id)) {
                                const relatedIssueTagIds = (room?.tags || [])
                                  .filter(
                                    t =>
                                      t.meta_type === "issue" &&
                                      t.meta_entity_parent_id === i.project_id
                                  )
                                  .map(t => t.id);

                                if (relatedIssueTagIds) {
                                  if (selectedIntegrationIds.has(i.project_id)) {
                                    setTagsToRemove(x => {
                                      relatedIssueTagIds.forEach(t => x.push(t));
                                      return Array.from(new Set(x));
                                    });
                                    setTagsToAdd(x => {
                                      const q = x.filter(v => !relatedIssueTagIds.includes(v));
                                      return Array.from(new Set(q));
                                    });
                                  } else {
                                    setTagsToAdd(x => {
                                      relatedIssueTagIds
                                        .filter(t => !tagsToRemove.includes(t))
                                        .forEach(t => x.push(t));
                                      return Array.from(new Set(x));
                                    });
                                    setTagsToRemove(x => {
                                      const q = x.filter(v => !relatedIssueTagIds.includes(v));
                                      return Array.from(new Set(q));
                                    });
                                  }
                                }
                              }
                              setSelectedIntegrationIds(s => {
                                s.has(i.project_id) ? s.delete(i.project_id) : s.add(i.project_id);
                                return new Set(s);
                              });
                            }}
                            className="flex items-center gap-1.5 text-blue-500"
                          >
                            <div className={classNames(!!issuesFilter ? "invisible" : "visible")}>
                              {!selectedIntegrationIds.has(i.project_id) && (
                                <Icons.CheckboxOff className="w-4" disabled={linkedReadOnly} />
                              )}
                              {selectedIntegrationIds.has(i.project_id) && (
                                <Icons.CheckboxOn className="w-4" disabled={linkedReadOnly} />
                              )}
                            </div>
                            {renderTag(tag)}
                          </span>
                        );
                      } else {
                        return null;
                      }
                    })}
                    <a
                      className="fog:text-link text-xs"
                      href={`/admin/vendor/${vendorId}/workspace/${workspaceId}/settings?add_integration`}
                    >
                      Add another
                    </a>
                  </span>
                </div>
              )}
            </div>

            <div className={classNames("col-span-2 sm:col-span-4", linkedReadOnly && "hidden")}>
              <div>
                <FilterInput
                  placeholder="Search existing issues"
                  value={issuesFilter}
                  setValue={setIssuesFilter}
                  focusOnMount={true}
                  isLoading={issuesLoading}
                />
              </div>
              <div
                className={classNames(
                  "px-1 bg-slate-100 mt-2 overflow-y-auto fbr-scrollbar",
                  issuesFilter ? "block" : "hidden"
                )}
                style={{ height: "12vh" }}
              >
                <div className="flex flex-col gap-y-2">
                  {issues.length === 0 && (
                    <>
                      {issuesFilter && issuesLoading !== true && (
                        <div className="flex items-center gap-x-2 truncate">No issues found</div>
                      )}
                      {issuesLoading === true && (
                        <div className="flex items-center gap-x-2 truncate">Searching...</div>
                      )}
                    </>
                  )}
                  {issues.map(issue => (
                    <Issue
                      key={issue.id}
                      issue={issue}
                      issueTrackerIntegrations={issueTrackerIntegrations}
                      selectedIssue={selectedIssue}
                      onIssueSelected={async issue => {
                        setSelectedIssue(issue ?? undefined);

                        if (issue?.meta_tag) {
                          setTagsToAdd(x => {
                            x.push(issue.meta_tag);
                            return Array.from(new Set(x));
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {settingsPane === "Linked issues" && formHasChanges && (
        <div className="flex flex-col text-sm mt-4 gap-2">
          <div className="text-base">Pending updates</div>
          {changes.linkToIssue && selectedIssue && (
            <div className="w-full flex justify-between items-center gap-4">
              <div className="flex gap-2 items-center truncate">
                <div className="whitespace-nowrap">• Link to</div>
                <Issue
                  issue={selectedIssue}
                  selectedIssue={undefined}
                  issueTrackerIntegrations={issueTrackerIntegrations}
                  withRadio={false}
                />
              </div>
              <div
                onClick={() => {
                  if (selectedIssue.meta_tag) {
                    setTagsToAdd(x => x.filter(t => t !== selectedIssue.meta_tag));
                  }
                  setSelectedIssue(undefined);
                }}
                className="cursor-pointer text-gray-500 hover:text-brand-red-500"
              >
                <Icons.XClose />
              </div>
            </div>
          )}
          {changes.name && (
            <div className="w-full flex justify-between items-center">
              <div>
                • Rename room from <b>{room?.name}</b> to <b>{roomName}</b>
              </div>
              <div
                onClick={() => {
                  setRoomName(room.name);
                }}
                className="cursor-pointer text-gray-500 hover:text-brand-red-500"
              >
                <Icons.XClose />
              </div>
            </div>
          )}
          {newConnectedIds.map(projectId => {
            const integration = findIntegration(projectId);
            const tag = workspaceTags.find(t => t?.name === integration?.meta_tag);

            return integration && tag ? (
              <div key={projectId} className="w-full flex justify-between items-center">
                <div>
                  • Create a new issue <b>{roomName}</b> in {renderTag(tag)}
                </div>
                <div
                  onClick={() => {
                    setSelectedIntegrationIds(s => {
                      s.delete(projectId);
                      return new Set(s);
                    });
                  }}
                  className="cursor-pointer text-gray-500 hover:text-brand-red-500"
                >
                  <Icons.XClose />
                </div>
              </div>
            ) : null;
          })}
          {tagsToRemove &&
            tagsToRemove.map(t => {
              const tag = (room?.tags || []).find(rt => rt.id === t);
              return tag ? (
                <div key={tag.id} className="w-full flex justify-between items-center">
                  <div>• Unlink {renderTag(tag)}</div>
                  <div
                    onClick={() => {
                      if (tag.meta_type === "issue") {
                        setSelectedIntegrationIds(x => {
                          if (tag.meta_entity_parent_id) {
                            x.add(tag.meta_entity_parent_id);
                          }
                          return new Set(x);
                        });
                      }
                      setTagsToRemove(x => {
                        return x.filter(t => t !== tag.id);
                      });
                    }}
                    className="cursor-pointer text-gray-500 hover:text-brand-red-500"
                  >
                    <Icons.XClose />
                  </div>
                </div>
              ) : null;
            })}
          {changes.roomType && (
            <div className="w-full flex justify-between items-center">
              <div>
                • Change room type from <b>{initialRoomType}</b> to <b>{roomType}</b>
              </div>
              <div
                onClick={() => {
                  setRoomType(initialRoomType);
                }}
                className="cursor-pointer text-gray-500 hover:text-brand-red-500"
              >
                <Icons.XClose />
              </div>
            </div>
          )}
        </div>
      )}

      <div className={classNames("flex items-center mt-8 gap-x-4 justify-between")}>
        <div>
          <div
            className={classNames(
              "width-12",
              "transition-opacity duration-100 ease-in",
              formHasChanges ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <ThickButton loading={updating}>Update</ThickButton>
          </div>
          <div className="fog:text-body-m">
            {updateError && <div className="text-brand-red-500">{updateError}</div>}
          </div>
        </div>
        {debugToggleShowTags && (
          <div className="text-xs flex items-center gap-2">
            {(room?.tags || []).map(t => (
              <div key={t.id}>{t.name}</div>
            ))}
          </div>
        )}
        <div
          onClick={e => {
            e.preventDefault();
            setDebugToggleShowTags(!debugToggleShowTags);
          }}
          className={classNames("width-12 invisible pointer-cursor")}
        >
          <ThickButton>Show tags</ThickButton>
        </div>
      </div>
    </form>
  );
};

const Member: React.FC<{
  room: RoomT;
  variant?: "blue" | "green" | "red";
  onCloseClick?: () => void;
}> = ({ room, variant, onCloseClick }) => {
  if (room.type !== "dialog" || !room.counterpart) {
    return null;
  }
  const { imageUrl, name, type } = room.counterpart;
  return (
    <div
      className={classNames(
        "flex items-center gap-x-2 px-1 py-0.5 rounded-md border fog:text-chat-username-m",
        (!variant || variant === "blue") && "border-blue-200 bg-blue-50",
        variant === "red" && "border-red-200 bg-red-50",
        variant === "green" && "border-green-200 bg-green-50"
      )}
    >
      <Avatar url={imageUrl} name={name} size={25} />
      {name}
      {type === "agent" && <Icons.AgentMark />}
      {onCloseClick && (
        <span className="ml-1 cursor-pointer hover:text-brand-red-500" onClick={onCloseClick}>
          <Icons.XClose className="w-4" />
        </span>
      )}
    </div>
  );
};

const MembersList: React.FC<{
  roomId: string;
  userId: string | undefined;
  workspaceId: string | undefined;
  customerId: string | undefined;
  onChange: (toAdd: string[], toRemove: string[]) => void;
}> = ({ roomId, userId, workspaceId, customerId, onChange }) => {
  const { filteredRoster, setRosterFilter } = useRoster({
    userId,
    workspaceId,
  });

  const [searchValue, setSearchValue] = React.useState<string>();
  const [searchIsVisible, setSearchIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!searchIsVisible) {
      setSearchValue(undefined);
    }
  }, [searchIsVisible]);

  React.useEffect(() => {
    setRosterFilter(searchValue?.trim().toLowerCase());
  }, [searchValue, setRosterFilter]);

  const { rooms: initialRoomMembers } = useRoomMembers({ roomId, userId });

  const [membersToAdd, setMembersToAdd] = useImmer<RoomT[]>([]);
  const [membersToRemove, setMembersToRemove] = useImmer<RoomT[]>([]);

  const roomMembers = React.useMemo(
    () =>
      initialRoomMembers.filter(
        x => !membersToRemove.find(y => x.counterpart?.id === y.counterpart?.id)
      ),
    [initialRoomMembers, membersToRemove]
  );

  const dialogs = React.useMemo(() => {
    return filteredRoster.filter(
      x =>
        (x.agentId !== null || x.customerId === customerId) &&
        x.type === "dialog" &&
        !roomMembers.concat(membersToAdd).find(y => y.counterpart?.id === x.counterpart?.id)
    );
  }, [customerId, membersToAdd, roomMembers, filteredRoster]);

  const toggleMember = React.useCallback(
    (memberRoom: RoomT) => {
      const id = memberRoom.counterpart?.id;
      if (!id) {
        return;
      }
      if (membersToRemove.find(x => x.counterpart?.id === id)) {
        setMembersToRemove(members => members.filter(x => x.counterpart?.id !== id));
      } else if (membersToAdd.find(x => x.counterpart?.id === id)) {
        setMembersToAdd(members => members.filter(x => x.counterpart?.id !== id));
      } else if (roomMembers.find(x => x.counterpart?.id === id)) {
        setMembersToRemove(members => [...members, memberRoom]);
      } else {
        setMembersToAdd(members => [...members, memberRoom]);
      }

      setSearchValue("");
    },
    [roomMembers, membersToRemove, membersToAdd]
  );

  const filterInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    onChange(
      membersToAdd.map(x => x?.counterpart?.id).filter(Boolean) as string[],
      membersToRemove.map(x => x?.counterpart?.id).filter(Boolean) as string[]
    );

    filterInputRef.current?.focus();
  }, [membersToAdd, membersToRemove]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {roomMembers.map(member => (
          <Member
            key={member.id}
            room={member}
            variant="blue"
            onCloseClick={() => toggleMember(member)}
          />
        ))}
        {membersToAdd.map(member => (
          <Member
            key={member.id}
            room={member}
            variant="green"
            onCloseClick={() => toggleMember(member)}
          />
        ))}
        <div
          className="w-8 h-8 flex items-center justify-center rounded-md border border-blue-200 text-blue-500 fog:text-caption-m cursor-pointer"
          onClick={() => setSearchIsVisible(x => !x)}
        >
          {searchIsVisible ? "—" : "+"}
        </div>
      </div>
      {searchIsVisible && (
        <div className="relative z-10">
          <div className="relative z-10 px-2 bg-white">
            <FilterInput
              ref={filterInputRef}
              noBorder={true}
              value={searchValue}
              setValue={setSearchValue}
              focusOnMount={true}
            />
          </div>
          <div className="absolute top-0 pt-11 left-0 right-0 max-h-40 rounded-lg fog:box-shadow-m bg-white overflow-y-auto fbr-scrollbar">
            {dialogs.map(dialog => (
              <div
                key={dialog.id}
                className="flex items-center gap-x-2 py-2 px-4 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  toggleMember(dialog);
                }}
              >
                <Avatar url={dialog.counterpart?.imageUrl} name={dialog.name} size={25} />
                <span>{dialog.counterpart?.name || dialog.name}</span>
                {dialog.counterpart?.type === "agent" && <Icons.AgentMark />}
              </div>
            ))}
          </div>
        </div>
      )}
      {membersToRemove.length > 0 && (
        <>
          <div className="my-2 text-brand-red-500">Members to remove</div>
          <div className="flex flex-wrap gap-2">
            {membersToRemove.map(member => (
              <Member
                key={member.id}
                room={member}
                variant="red"
                onCloseClick={() => toggleMember(member)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
};

const RoomTypeSelector: React.FC<{
  room: EventRoom;
  roomType: RoomType;
  setRoomType: (x: RoomType) => void;
  className?: string;
}> = ({ room, roomType, setRoomType, className = "" }) => {
  const isInternalRoom = isInternal(room.customerName);

  return (
    <>
      <div className="flex items-start text-gray-500">Room type</div>
      <div className={classNames("col-span-1 flex", className)}>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:flex sm:flex-col sm:gap-x-0">
          <div
            className={classNames(
              "flex items-center",
              roomType !== "Discussion" && "cursor-pointer"
            )}
            onClick={() => setRoomType("Discussion")}
          >
            <span className="text-blue-500">
              {roomType === "Discussion" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">Discussion</span>
          </div>
          <div
            className={classNames("flex items-center", roomType !== "Issue" && "cursor-pointer")}
            onClick={() => setRoomType("Issue")}
          >
            <span className="text-blue-500">
              {roomType === "Issue" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">Issue</span>
            <Icons.RoomIssue className="w-4 h-4 text-gray-500 hidden" />
          </div>
          {isInternalRoom && (
            <div
              className={classNames(
                "flex items-center",
                roomType !== "Broadcast" && "cursor-pointer"
              )}
              onClick={() => setRoomType("Broadcast")}
            >
              <span className="text-blue-500">
                {roomType === "Broadcast" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
              </span>
              <span className="pl-2 pr-1">Broadcast</span>
              <Icons.Broadcast className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const IssuePrioritySelector: React.FC<{
  issuePriority: IssuePriority;
  setIssuePriority: (x: IssuePriority) => void;
  className?: string;
}> = ({ issuePriority, setIssuePriority, className = "" }) => {
  return (
    <>
      <div className="flex items-start text-gray-500">Priority</div>
      <div className={classNames("col-span-1 flex", className)}>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:flex sm:flex-col sm:gap-x-0">
          <div
            className={classNames(
              "flex items-center",
              issuePriority !== "High" && "cursor-pointer"
            )}
            onClick={() => setIssuePriority("High")}
          >
            <span className="text-blue-500">
              {issuePriority === "High" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">High</span>
          </div>
          <div
            className={classNames(
              "flex items-center",
              issuePriority !== "Medium" && "cursor-pointer"
            )}
            onClick={() => setIssuePriority("Medium")}
          >
            <span className="text-blue-500">
              {issuePriority === "Medium" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">Medium</span>
          </div>
          <div
            className={classNames("flex items-center", issuePriority !== "Low" && "cursor-pointer")}
            onClick={() => setIssuePriority("Low")}
          >
            <span className="text-blue-500">
              {issuePriority === "Low" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">Low</span>
          </div>
          <div
            className={classNames(
              "flex items-center",
              issuePriority !== undefined && "cursor-pointer"
            )}
            onClick={() => setIssuePriority(undefined)}
          >
            <span className="text-blue-500">
              {issuePriority === undefined ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </span>
            <span className="pl-2 pr-1">None</span>
          </div>
        </div>
      </div>
    </>
  );
};
