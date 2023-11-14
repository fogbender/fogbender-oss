import classNames from "classnames";
import {
  type Author,
  calculateCounterpart,
  type EventRoom,
  type Helpdesk,
  type IntegrationCloseIssue,
  type IntegrationReopenIssue,
  MetaTypes,
  type RoomUpdate,
  type SearchRoster,
  type ServerCall,
  type Tag,
  useWs,
  type VisitorVerifyCode,
  type VisitorVerifyEmail,
} from "fogbender-proto";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { Link } from "react-router-dom";

import { Icons } from "../components/Icons";
import { IntegrationDetails } from "../components/IntegrationDetails";
import { Avatar, ThinButton } from "../components/lib";
import { Modal } from "../components/Modal";
import type { Agent } from "../types";
import { queryKeys } from "../utils/client";
import {
  formatCustomerName,
  formatRoomName,
  isExternalHelpdesk,
  isInternalHelpdesk,
  renderTag,
} from "../utils/format";

import { RoomAssignees } from "./RoomAssignees";
import { RoomMenu } from "./RoomMenu";
import { type RoomMode } from "./RoomMode";

export const FontAwesomeCrown = ({ className = "" }: { className?: string }) => (
  <svg className={"h-6 " + className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
    <path
      fill="currentColor"
      d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"
    />
  </svg>
);

export type RoomHeaderProps = {
  room: EventRoom;
  roomId: string;
  paneId: string;
  helpdesk?: Helpdesk;
  ourId?: string;
  isAgent: boolean | undefined;
  myAuthor: Author;
  agents?: Agent[];
  singleRoomMode: boolean;
  isActive: boolean;
  isLayoutPinned: boolean;
  isExpanded: boolean;
  isDraggable?: boolean;
  onClose: (id: string) => void;
  onCloseOtherRooms: (id?: string) => void;
  onOpenSearch?: (id: string) => void;
  onOpenCustomerInfo?: (id: string) => void;
  onSettings?: (id: string) => void;
  onUnseen?: () => void;
  onSetRoomPin?: (roomId: string | undefined, pinned: boolean) => void;
  onGoFullScreen?: () => void;
  showIssueInfo?: Tag | undefined;
  onShowIssueInfo?: (tag: Tag) => void;
  mode: RoomMode;
  rosterVisible?: boolean;
  customerDetailsPath?: string;
  workspaceId?: string;
  vendorId?: string;
};

const shouldShowTag = (tag: Tag) => {
  const [, tagType] = tag.name.split(":");

  return tag.name.startsWith(":") === false ||
    (tag.meta_type !== undefined && MetaTypes.includes(tag.meta_type) === true) ||
    ["priority", "status"].includes(tagType)
    ? true
    : false;
};

export const RoomHeader: React.FC<RoomHeaderProps> = props => {
  const {
    room,
    roomId,
    paneId,
    helpdesk,
    ourId,
    isAgent,
    myAuthor,
    agents,
    singleRoomMode,
    isActive,
    isLayoutPinned,
    isDraggable,
    onClose,
    onSetRoomPin,
    onSettings,
    showIssueInfo,
    onShowIssueInfo,
    mode,
    customerDetailsPath,
    workspaceId,
    vendorId,
  } = props;
  const counterpart = room && calculateCounterpart(room, ourId);
  const tags = React.useMemo(
    () =>
      (room?.tags || [])
        .slice()
        .filter(t => shouldShowTag(t))
        .sort((a, b) => {
          if (a.meta_type === "status" && b.meta_type !== "issue") {
            return -1;
          }

          if (a.meta_type === "issue") {
            return -1;
          }

          return 1;
        }),
    [room?.tags]
  );

  const issueTags = React.useMemo(() => tags.filter(t => t.meta_type === "issue"), [tags]);

  const isInternal = isInternalHelpdesk(room?.customerName);
  const isExternal = isExternalHelpdesk(room?.customerName);

  const publicRoomSubtitle =
    room && helpdesk
      ? `Public to everyone at ${room.customerName} and ${helpdesk?.vendorName}`
      : undefined;

  const privateRoomSubtitle =
    room && helpdesk ? `Private between you and ${helpdesk?.vendorName}` : undefined;

  const dialogSubtitle =
    counterpart && helpdesk ? `Private between you and ${counterpart.name}` : undefined;

  const priority = React.useMemo(() => {
    const t = room?.tags?.find(t => t.name.startsWith(":priority"));

    if (t) {
      const [, , priorityType] = t.name.split(":");
      return (
        <span
          className={classNames(
            "bg-blue-50 text-gray-500 font-semibold px-1 rounded text-xs flex items-center gap-1",
            "dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          <span>Priority:</span>
          <span className="uppercase">{priorityType}</span>
        </span>
      );
    }

    return null;
  }, [room?.tags]);

  const [showDetails, setShowDetails] = React.useState(false);

  const { serverCall } = useWs();

  const hasLinkedIssues = room?.tags?.find(t => t.meta_type === "issue") !== undefined;
  const isIssueClosed = room?.tags?.find(t => t.name === ":status:closed") !== undefined;
  const isIssueOpen = room?.tags?.find(t => t.name === ":status:open") !== undefined;

  const updateRoomTags = async (
    roomId: string,
    tagNamesToAdd: string[],
    tagNamesToRemove: string[],
    onDone?: () => void
  ) => {
    setUpdatingTagsRoomIds(s => {
      s.add(roomId);
      return new Set(s);
    });
    await serverCall<RoomUpdate>({
      msgType: "Room.Update",
      roomId,
      tagsToAdd: tagNamesToAdd,
      tagsToRemove: tagNamesToRemove,
    }).then(() => {
      roomsByTagsData.refetch();
      setTimeout(() => {
        setUpdatingTagsRoomIds(s => {
          s.delete(roomId);
          return new Set(s);
        });
        setRoomIdsToClose(s => {
          s.delete(roomId);
          return new Set(s);
        });
        if (onDone) {
          onDone();
        }
      }, 1000);
    });
  };

  const closeIssueButton = () => {
    return (
      <ThinButton
        loading={updatingTagsRoomIds.has(roomId)}
        className="max-w-min"
        onClick={() => {
          if (hasLinkedIssues) {
            setShowCloseIssueModal(true);
          } else {
            updateRoomTags(roomId, [":status:closed"], [":status:open"]);
          }
        }}
      >
        Close issue
      </ThinButton>
    );
  };

  const reopenIssueButton = () => {
    return (
      <ThinButton
        loading={updatingTagsRoomIds.has(roomId)}
        className="max-w-min"
        onClick={() => {
          if (hasLinkedIssues) {
            setShowReopenIssueModal(true);
          } else {
            updateRoomTags(roomId, [":status:open"], [":status:closed"]);
          }
        }}
      >
        Reopen issue
      </ThinButton>
    );
  };

  const issueStatusButton = () => {
    if (room.isTriage || room.type === "dialog") {
      return null;
    }

    const showIfInternal = !isInternal || (isInternal && hasLinkedIssues);

    if (isIssueClosed) {
      return reopenIssueButton();
    } else if (isAgent && (isIssueOpen || !room.isTriage || showIfInternal || isExternal)) {
      return closeIssueButton();
    } else {
      return null;
    }
  };

  const [showCloseIssueModal, setShowCloseIssueModal] = React.useState(false);

  const [closingIssueIds, setClosingIssueIds] = React.useState<Set<string>>(new Set([]));
  const [reopeningIssueIds, setReopeningIssueIds] = React.useState<Set<string>>(new Set([]));

  const issueKey = (t: Tag) => `${t.workspace_id}-${t.meta_entity_parent_id}-${t.meta_entity_id}`;

  const closeIssueMutation = useMutation(
    (params: {
      workspaceId: string;
      integrationProjectId: string;
      issueId: string;
      key: string;
    }) => {
      const { workspaceId, integrationProjectId, issueId } = params;

      return serverCall<IntegrationCloseIssue>({
        msgType: "Integration.CloseIssue",
        workspaceId,
        integrationProjectId,
        issueId,
        roomId,
      });
    },
    {
      onSuccess: async (_r, params) => {
        const { key } = params;

        setClosingIssueIds(s => {
          s.delete(key);
          return new Set(s);
        });
      },
    }
  );

  const roomsByTagsData = useQuery(
    queryKeys.roomsByTagNames(
      workspaceId,
      issueTags.map(t => t.name)
    ),
    async () => {
      if (workspaceId && issueTags) {
        const res = await serverCall<SearchRoster>({
          msgType: "Search.Roster",
          tagNames: issueTags.map(t => t.name),
          workspaceId,
        });
        if (res.msgType === "Search.Ok" && res.items.length > 0) {
          return res.items;
        }
      }
      return;
    },
    {
      enabled: issueTags.length > 0,
    }
  );

  const { data: roomsByTags } = roomsByTagsData;

  const [updatingTagsRoomIds, setUpdatingTagsRoomIds] = React.useState<Set<string>>(new Set([]));

  const [showReopenIssueModal, setShowReopenIssueModal] = React.useState(false);

  const reopenIssueMutation = useMutation(
    (params: {
      workspaceId: string;
      integrationProjectId: string;
      issueId: string;
      key: string;
    }) => {
      const { workspaceId, integrationProjectId, issueId } = params;

      return serverCall<IntegrationReopenIssue>({
        msgType: "Integration.ReopenIssue",
        workspaceId,
        integrationProjectId,
        issueId,
        roomId,
      });
    },
    {
      onSuccess: async (_r, params) => {
        const { key } = params;

        setReopeningIssueIds(s => {
          s.delete(key);
          return new Set(s);
        });

        roomsByTagsData.refetch();
      },
    }
  );

  const [issueTagIdsToReopen, setIssueTagIdsToReopen] = React.useState<Set<string>>(new Set([]));
  const [roomIdsToReopen, setRoomIdsToReopen] = React.useState<Set<string>>(new Set([]));
  const [issueTagIdsToClose, setIssueTagIdsToClose] = React.useState<Set<string>>(new Set([]));
  const [roomIdsToClose, setRoomIdsToClose] = React.useState<Set<string>>(new Set([]));

  const getIntegrationName = (t: Tag) => {
    const isKnown =
      t.meta_entity_type && Object.keys(IntegrationDetails).includes(t.meta_entity_type);

    const name =
      isKnown &&
      t.meta_entity_type &&
      IntegrationDetails[t.meta_entity_type as keyof typeof IntegrationDetails].name;

    return name;
  };

  const [closeAll, setCloseAll] = React.useState(false);
  const [reopenAll, setReopenAll] = React.useState(false);

  const [closingSelected, setClosingSelected] = React.useState(false);
  React.useEffect(() => {
    if (closingSelected) {
      if (roomIdsToClose.size === 0 && issueTagIdsToClose.size === 0) {
        setClosingSelected(false);
        setCloseAll(false);
        setShowCloseIssueModal(false);
      }
    }
  }, [roomIdsToClose, issueTagIdsToClose]);

  const [reopeningSelected, setReopeningSelected] = React.useState(false);
  React.useEffect(() => {
    if (reopeningSelected) {
      setReopeningSelected(false);
      setReopenAll(false);
      setShowReopenIssueModal(false);
    }
  }, [roomIdsToReopen, issueTagIdsToReopen]);

  React.useEffect(() => {
    if (showIssueInfo) {
      const tag = issueTags.find(t => t.id === showIssueInfo.id);

      if (tag && onShowIssueInfo) {
        onShowIssueInfo(tag);
      }
    }
  }, [issueTags, showIssueInfo, onShowIssueInfo]);

  const roomName = formatRoomName(room, isAgent === true, counterpart?.name);

  return (
    <>
      <div
        className={classNames(
          "px-2.5 border-b border-gray-300 select-none",
          "dark:border-gray-500 dark:text-white"
        )}
      >
        {showReopenIssueModal && (
          <Modal
            onClose={() => {
              setShowReopenIssueModal(false);
            }}
          >
            <div className="flex items-center gap-2 text-xl">
              {room && roomName && room.createdTs && (
                <span className="font-medium">{roomName}</span>
              )}
              <span>({formatCustomerName(room?.customerName)})</span>
            </div>
            {
              <>
                <div className="mt-4 flex flex-col gap-2">
                  {issueTags.filter(t => t.meta_state === "closed").length !== 0 && (
                    <>
                      <div className="mt-4 font-medium text-lg">Reopen linked issues?</div>
                      <div>
                        <ul className="p-2 text-sm max-h-32 overflow-y-auto fbr-scrollbar border space-y-2">
                          {issueTags
                            .filter(t => t.meta_state === "closed")
                            .map(t => {
                              const integrationName = getIntegrationName(t);
                              return (
                                <li
                                  key={t.id}
                                  className="px-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    setIssueTagIdsToReopen(s => {
                                      if (s.has(t.id)) {
                                        s.delete(t.id);
                                      } else {
                                        s.add(t.id);
                                      }
                                      return new Set(s);
                                    });
                                  }}
                                >
                                  {issueTagIdsToReopen.has(t.id) ? (
                                    <Icons.CheckboxOn className="w-4" />
                                  ) : (
                                    <Icons.CheckboxOff className="w-4" />
                                  )}
                                  <span>Reopen</span>
                                  <span
                                    onClick={e => {
                                      if (onShowIssueInfo) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onShowIssueInfo(t);
                                      }
                                    }}
                                  >
                                    {renderTag(t)}
                                  </span>
                                  in {integrationName}
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    </>
                  )}

                  {(
                    roomsByTags?.filter(r => r?.tags?.find(t => t?.name === ":status:closed")) || []
                  ).length > 0 && (
                    <>
                      <div className="mt-4 font-medium text-lg">Reopen linked rooms?</div>
                      <div>
                        <ul className="p-2 text-sm max-h-32 overflow-y-auto fbr-scrollbar border space-y-2">
                          {(
                            roomsByTags?.filter(r =>
                              r?.tags?.find(t => t?.name === ":status:closed")
                            ) || []
                          ).length > 1 && (
                            <li
                              key={"All"}
                              className="px-2 flex gap-1.5 items-center cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setReopenAll(x => {
                                  const reopenAll = !x;
                                  if (reopenAll) {
                                    setRoomIdsToReopen(
                                      new Set(
                                        Array.from(
                                          roomsByTags
                                            ?.filter(r =>
                                              r?.tags?.some(t => t.name === ":status:closed")
                                            )
                                            .map(r => r.id) || []
                                        )
                                      )
                                    );
                                  } else {
                                    setRoomIdsToReopen(new Set([]));
                                  }

                                  return reopenAll;
                                });
                              }}
                            >
                              <div className="flex gap-2 items-center">
                                <div>
                                  {reopenAll ? (
                                    <Icons.CheckboxOn className="w-4" />
                                  ) : (
                                    <Icons.CheckboxOff className="w-4" />
                                  )}
                                </div>
                                <div>All</div>
                              </div>
                            </li>
                          )}
                          {roomsByTags
                            ?.filter(r => r?.tags?.find(t => t.name === ":status:closed"))
                            .map(r => {
                              const tags = r?.tags?.filter(t => t.meta_type === "issue");
                              return (
                                <li
                                  key={r.id}
                                  className="px-2 flex gap-2 items-center cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    setReopenAll(false);
                                    setRoomIdsToReopen(s => {
                                      if (s.has(r.id)) {
                                        s.delete(r.id);
                                      } else {
                                        s.add(r.id);
                                      }
                                      return new Set(s);
                                    });
                                  }}
                                >
                                  <div className="flex">
                                    {roomIdsToReopen.has(r.id) ? (
                                      <Icons.CheckboxOn className="w-4" />
                                    ) : (
                                      <Icons.CheckboxOff className="w-4" />
                                    )}
                                  </div>
                                  <div>
                                    <span>Reopen</span>{" "}
                                    {r.id === roomId && (
                                      <span className="whitespace-nowrap self-center text-white text-xs bg-green-500 rounded-lg px-1">
                                        This&nbsp;one
                                      </span>
                                    )}{" "}
                                    <span className="font-medium">{r.name}</span>{" "}
                                    <span className="inline-flex items-center gap-1.5">
                                      {tags?.map(t => {
                                        return (
                                          <span
                                            key={t.id}
                                            onClick={e => {
                                              if (onShowIssueInfo) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onShowIssueInfo(t);
                                              }
                                            }}
                                          >
                                            {renderTag(t)}
                                          </span>
                                        );
                                      })}
                                    </span>{" "}
                                    <span>in</span>{" "}
                                    <span className="font-medium">
                                      {formatCustomerName(r.customerName)}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex mt-10 justify-end">
                  <ThinButton
                    loading={updatingTagsRoomIds.size > 0 || reopeningIssueIds.size > 0}
                    disabled={roomIdsToReopen.size === 0 && issueTagIdsToReopen.size === 0}
                    onClick={() => {
                      setReopeningSelected(true);

                      Array.from(roomIdsToReopen).forEach(rId => {
                        updateRoomTags(rId, [":status:open"], [":status:closed"], () => {
                          setRoomIdsToReopen(s => {
                            s.delete(rId);
                            return new Set(s);
                          });
                        });
                      });

                      const issuesToReopen = tags.filter(t => issueTagIdsToReopen.has(t.id));

                      if (issuesToReopen.length > 0) {
                        issuesToReopen.map(t => {
                          if (t.meta_entity_id && t.meta_entity_parent_id && t.workspace_id) {
                            const key = issueKey(t);
                            setReopeningIssueIds(s => {
                              s.add(key);
                              return new Set(s);
                            });
                            reopenIssueMutation.mutate({
                              workspaceId: t.workspace_id,
                              integrationProjectId: t.meta_entity_parent_id,
                              issueId: t.meta_entity_id,
                              key,
                            });
                          }
                        });
                      }
                    }}
                  >
                    Reopen selected
                  </ThinButton>
                </div>
              </>
            }
          </Modal>
        )}
        {showCloseIssueModal && (
          <Modal
            onClose={() => {
              setShowCloseIssueModal(false);
            }}
          >
            <div className="mt-4 text-xl">
              Close <span className="font-medium">{roomName}</span> (
              {formatCustomerName(room?.customerName)})
            </div>
            <div className="mt-8 text-center border-b border-gray-200 leading-[0px] sm:leading-[0px] md:leading-[0px] lg:leading-[0px] w-full">
              <span className="bg-white px-3 font-[100] uppercase tracking-widest md:px-8">
                Recommended workflow
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 w-full">
              <div className="flex gap-4">
                <div className="self-start">1.</div>
                <div className="flex flex-col w-full">
                  <div className="font-medium">Close linked external issues</div>
                  <div className="mt-2 flex flex-col gap-2">
                    {issueTags.map(t => {
                      const integrationName = getIntegrationName(t);

                      return (
                        <div key={t.id} className="flex justify-between items-center gap-2">
                          <span className="flex items-center gap-2">
                            {renderTag(t)} {t.meta_entity_name}
                            <span className="font-semibold text-white bg-gray-400 px-1 rounded text-xs">
                              {t.meta_state}
                            </span>
                          </span>
                          <ThinButton
                            onClick={() => {
                              const key = issueKey(t);
                              if (t.workspace_id && t.meta_entity_parent_id && t.meta_entity_id) {
                                if (t.meta_state === "open") {
                                  setClosingIssueIds(s => {
                                    s.add(key);
                                    return new Set(s);
                                  });
                                  closeIssueMutation.mutate({
                                    workspaceId: t.workspace_id,
                                    integrationProjectId: t.meta_entity_parent_id,
                                    issueId: t.meta_entity_id,
                                    key,
                                  });
                                } else if (t.meta_state === "closed") {
                                  setReopeningIssueIds(s => {
                                    s.add(key);
                                    return new Set(s);
                                  });
                                  reopenIssueMutation.mutate({
                                    workspaceId: t.workspace_id,
                                    integrationProjectId: t.meta_entity_parent_id,
                                    issueId: t.meta_entity_id,
                                    key,
                                  });
                                }
                              }
                            }}
                            loading={
                              t.meta_state === "open"
                                ? closingIssueIds.has(issueKey(t)) && closeIssueMutation.isLoading
                                : reopeningIssueIds.has(issueKey(t)) &&
                                  reopenIssueMutation.isLoading
                            }
                          >
                            {t.meta_state === "closed" ? (
                              <span>
                                Reopen
                                {integrationName && <span> in {integrationName}</span>}
                              </span>
                            ) : (
                              <span>
                                Close
                                {integrationName && <span> in {integrationName}</span>}
                              </span>
                            )}
                          </ThinButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="self-start">2.</div>
                <div className="flex flex-col w-full">
                  <div className="font-medium">Notify customers</div>

                  <div className="mt-2">
                    Post a message in each related customer-facing room with an update. You can{" "}
                    <a
                      href="/blog/how-to-notify-several-customer-teams-at-the-same-time"
                      className="font-medium fog:text-link"
                      rel="noopener"
                      target="_blank"
                    >
                      also send an update to multiple customers at once
                    </a>
                    .
                  </div>

                  <div>
                    {issueTags.map(t => {
                      return (
                        <div key={t.id} className="flex flex-col gap-2 mt-2">
                          <div>
                            The following customers are waiting on{" "}
                            <span
                              onClick={e => {
                                if (onShowIssueInfo) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onShowIssueInfo(t);
                                }
                              }}
                            >
                              {renderTag(t)}
                            </span>
                            :
                          </div>

                          <ul className="p-2 text-sm max-h-32 overflow-y-auto fbr-scrollbar border">
                            {roomsByTags
                              ?.filter(r => r?.tags?.find(t0 => t0.id === t.id))
                              .filter(r => r?.tags?.find(t0 => t0.name === ":status:open"))
                              .filter(r => !isInternalHelpdesk(r.customerName))
                              .map(r => {
                                return (
                                  <li key={r.id} className="flex gap-1.5 items-center">
                                    {formatCustomerName(r.customerName)}
                                    {r.id === roomId && (
                                      <span className="whitespace-nowrap self-center text-white text-xs bg-green-500 rounded-lg px-1">
                                        This&nbsp;one
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="self-start">3.</div>
                <div className="flex flex-col w-full">
                  <div>As each customer team confirms the fix, close the corresponding room.</div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center border-b border-gray-200 leading-[0px] sm:leading-[0px] md:leading-[0px] lg:leading-[0px] w-full">
              <span className="bg-white px-3 font-[100] uppercase tracking-widest md:px-8">
                Alternatively
              </span>
            </div>

            {
              <>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  {issueTags.filter(t => t.meta_state === "open").length > 0 && (
                    <div>
                      <div>Close external issues:</div>
                      <ul className="p-2 max-h-32 overflow-y-auto fbr-scrollbar border space-y-2">
                        {issueTags
                          .filter(t => t.meta_state === "open")
                          .map(t => {
                            const integrationName = getIntegrationName(t);
                            return (
                              <li
                                key={t.id}
                                className="px-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  setIssueTagIdsToClose(s => {
                                    if (s.has(t.id)) {
                                      s.delete(t.id);
                                    } else {
                                      s.add(t.id);
                                    }
                                    return new Set(s);
                                  });
                                }}
                              >
                                {issueTagIdsToClose.has(t.id) ? (
                                  <Icons.CheckboxOn className="w-4" />
                                ) : (
                                  <Icons.CheckboxOff className="w-4" />
                                )}
                                <span>Close</span>
                                <span
                                  onClick={e => {
                                    if (onShowIssueInfo) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onShowIssueInfo(t);
                                    }
                                  }}
                                >
                                  {renderTag(t)}
                                </span>
                                in {integrationName}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}

                  {(roomsByTags?.filter(r => r?.tags?.find(t => t.name === ":status:open")) || [])
                    .length > 0 && (
                    <div>
                      <div>Close related rooms in Fogbender:</div>
                      <ul className="p-2 max-h-32 overflow-y-auto fbr-scrollbar border space-y-2">
                        {(
                          roomsByTags?.filter(r => r?.tags?.find(t => t.name === ":status:open")) ||
                          []
                        ).length > 1 && (
                          <li
                            key={"All"}
                            className="px-2 flex gap-1.5 items-center cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setCloseAll(x => {
                                const closeAll = !x;
                                if (closeAll) {
                                  setRoomIdsToClose(
                                    new Set(
                                      Array.from(
                                        roomsByTags
                                          ?.filter(r =>
                                            r?.tags?.some(t => t.name === ":status:open")
                                          )
                                          .map(r => r.id) || []
                                      )
                                    )
                                  );
                                } else {
                                  setRoomIdsToClose(new Set([]));
                                }

                                return closeAll;
                              });
                            }}
                          >
                            <div className="flex gap-2 items-center">
                              <div>
                                {closeAll ? (
                                  <Icons.CheckboxOn className="w-4" />
                                ) : (
                                  <Icons.CheckboxOff className="w-4" />
                                )}
                              </div>
                              <div>All</div>
                            </div>
                          </li>
                        )}
                        {roomsByTags
                          ?.filter(r => r?.tags?.find(t => t.name === ":status:open"))
                          .map(r => {
                            const tags = r?.tags?.filter(t => t.meta_type === "issue");
                            return (
                              <li
                                key={r.id}
                                className="px-2 flex gap-2 items-center cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  setCloseAll(false);
                                  setRoomIdsToClose(s => {
                                    if (s.has(r.id)) {
                                      s.delete(r.id);
                                    } else {
                                      s.add(r.id);
                                    }
                                    return new Set(s);
                                  });
                                }}
                              >
                                <div className="flex">
                                  {roomIdsToClose.has(r.id) ? (
                                    <Icons.CheckboxOn className="w-4" />
                                  ) : (
                                    <Icons.CheckboxOff className="w-4" />
                                  )}
                                </div>
                                <div>
                                  <span>Close</span>{" "}
                                  {r.id === roomId && (
                                    <span className="whitespace-nowrap self-center text-white text-xs bg-green-500 rounded-lg px-1">
                                      This&nbsp;one
                                    </span>
                                  )}{" "}
                                  <span className="font-medium">{r.name}</span>{" "}
                                  <span className="inline-flex items-center gap-1.5">
                                    {tags?.map(t => {
                                      return (
                                        <span
                                          key={t.id}
                                          onClick={e => {
                                            if (onShowIssueInfo) {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              onShowIssueInfo(t);
                                            }
                                          }}
                                        >
                                          {renderTag(t)}
                                        </span>
                                      );
                                    })}
                                  </span>{" "}
                                  <span>in</span>{" "}
                                  <span className="font-medium">
                                    {formatCustomerName(r.customerName)}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex mt-10 justify-end">
                  <ThinButton
                    loading={updatingTagsRoomIds.size > 0 || closingIssueIds.size > 0}
                    disabled={roomIdsToClose.size === 0 && issueTagIdsToClose.size === 0}
                    onClick={() => {
                      setClosingSelected(true);

                      Array.from(roomIdsToClose).forEach(rId => {
                        updateRoomTags(rId, [":status:closed"], [":status:open"], () => {
                          setRoomIdsToClose(s => {
                            s.delete(rId);
                            return new Set(s);
                          });

                          if (issueTagIdsToClose.size === 0 && roomIdsToClose.size === 0) {
                            setShowCloseIssueModal(false);
                          }
                        });
                      });

                      const issuesToClose = tags.filter(t => issueTagIdsToClose.has(t.id));

                      if (issuesToClose.length > 0) {
                        issuesToClose.map(t => {
                          if (t.meta_entity_id && t.meta_entity_parent_id && t.workspace_id) {
                            const key = issueKey(t);
                            setClosingIssueIds(s => {
                              s.add(key);
                              return new Set(s);
                            });
                            closeIssueMutation.mutate({
                              workspaceId: t.workspace_id,
                              integrationProjectId: t.meta_entity_parent_id,
                              issueId: t.meta_entity_id,
                              key,
                            });
                          }
                        });
                      }
                    }}
                  >
                    Close selected
                  </ThinButton>
                </div>
              </>
            }
          </Modal>
        )}
        <div
          className={classNames(
            "layout-drag flex items-center justify-end -mx-4 px-4 fog:text-header3 select-text",
            !singleRoomMode && isActive
              ? isInternal
                ? "bg-green-500 dark:bg-green-950 text-white"
                : "bg-black text-white"
              : "",
            singleRoomMode && "hidden sm:flex",
            isDraggable && "cursor-move"
          )}
        >
          <RoomNameLine {...props} roomName={roomName} />
          <RoomMenu {...props} />
          <span
            className={classNames(
              "layout-nodrag hidden sm:block cursor-pointer",
              !singleRoomMode && isActive
                ? "text-white hover:text-brand-red-500 dark:text-gray-400 dark:hover:text-brand-red-500"
                : "text-gray-500 hover:text-brand-red-500"
            )}
            onClick={e => {
              e.stopPropagation();
              if (isLayoutPinned) {
                onSetRoomPin?.(paneId, false);
              } else {
                onClose(paneId);
              }
            }}
          >
            {isLayoutPinned ? (
              <Icons.Pin className="w-6" solidColor="currentColor" />
            ) : (
              <Icons.XCircle />
            )}
          </span>
        </div>
        <div className="relative fog:text-body-m select-text flex flex-col gap-y-1">
          <div className="flex items-center gap-x-2">
            {isAgent && room && mode === "Room" && (
              <div className="flex">
                <div
                  className={classNames(
                    "group flex items-center gap-x-0.5 my-1 p-1 rounded fog:text-body-s truncate cursor-pointer",
                    isInternal ? "bg-green-50 text-green-500" : "bg-blue-50 text-blue-500",
                    "dark:bg-black"
                  )}
                  onClick={() => setShowDetails(x => !x)}
                >
                  <span
                    className={classNames(
                      "group-hover:text-brand-red-500 transform transition",
                      showDetails && "rotate-90"
                    )}
                  >
                    <Icons.ChevronRight />
                  </span>
                  <span className="group-hover:text-brand-red-500 font-semibold truncate">
                    {formatCustomerName(room.customerName)}
                  </span>
                </div>
              </div>
            )}
            {isAgent && mode === "Room" && (
              <div
                className={classNames(
                  "flex-1 inline-flex items-center overflow-x-auto fbr-no-scrollbar",
                  showDetails && "invisible pointer-events-none",
                  tags.length > 0 && "min-w-16"
                )}
              >
                {!room.isTriage &&
                  tags.map(tag => {
                    return (
                      <span
                        key={tag.id}
                        className={classNames(
                          "h-6 inline-flex items-center mr-2 px-2.5 rounded border border-blue-200 bg-blue-50 dark:border-black dark:bg-black dark:text-gray-600 fog:text-body-s whitespace-nowrap"
                        )}
                        onClick={e => {
                          if (onShowIssueInfo) {
                            e.preventDefault();
                            e.stopPropagation();
                            onShowIssueInfo(tag);
                          }
                        }}
                      >
                        {renderTag(tag, { asLink: true })}
                      </span>
                    );
                  })}
                {!showDetails && issueStatusButton()}
              </div>
            )}
            {vendorId &&
              isAgent &&
              (room.type === "public" || room.type === "private") &&
              mode === "Room" && (
                <RoomAssignees
                  ourId={ourId}
                  roomId={roomId}
                  roomTags={room.tags?.map(x => x.name) || []}
                  agents={agents}
                  vendorId={vendorId}
                />
              )}
            {!isAgent && room.type === "public" && (
              <div className="inline-flex flex-wrap py-1 gap-2">
                {priority}
                {publicRoomSubtitle}
              </div>
            )}
            {!isAgent && room.type === "private" && (
              <div className="inline-flex flex-wrap py-1 gap-2">
                {priority}
                {privateRoomSubtitle}
              </div>
            )}
            {!isAgent && room.type === "dialog" && (
              <div className="inline-flex py-1 gap-2">{dialogSubtitle}</div>
            )}
            {!isAgent && <span className="inline-flex py-1 invisible">.</span>}
          </div>
          {showDetails && (
            <div className="max-h-32 flex flex-col gap-y-2 mb-2 overflow-y-auto fbr-scrollbar">
              <>
                {tags.length > 0 && (
                  <div className="-mb-2">
                    {!room.isTriage &&
                      tags.map(tag => {
                        return (
                          <span
                            key={tag.id}
                            className="h-6 inline-flex items-center mr-2 mb-2 px-2.5 rounded border border-blue-200 bg-blue-50 dark:border-black dark:bg-black dark:text-gray-600 fog:text-body-s whitespace-nowrap"
                            onClick={e => {
                              if (onShowIssueInfo) {
                                e.preventDefault();
                                e.stopPropagation();
                                onShowIssueInfo(tag);
                              }
                            }}
                          >
                            {renderTag(tag, { asLink: true })}
                          </span>
                        );
                      })}
                  </div>
                )}
                {issueStatusButton()}
              </>
              {room && (
                <div className="flex gap-1.5 items-center">
                  {room.type === "dialog" && <div>1-1 with</div>}
                  <div className="font-medium">{roomName}</div>
                  {counterpart?.email && !counterpart?.email.startsWith(":") && (
                    <div>
                      <a href={`mailto:${counterpart.email}`} className="fog:text-link">
                        {counterpart.email}
                      </a>
                    </div>
                  )}
                  {isAgent && onSettings && (
                    <div className="fog:text-caption-m flex gap-2 items-center">
                      {room.type !== "dialog" && (
                        <div
                          className="fog:text-link fog:text-caption-m"
                          onClick={() => onSettings(roomId)}
                        >
                          Room settings
                        </div>
                      )}
                      {customerDetailsPath && (
                        <div className="fog:text-link fog:text-caption-m">
                          <Link
                            to={customerDetailsPath}
                            className="fog:text-caption-m fog:text-link no-underline cursor-pointer"
                          >
                            Customer details
                          </Link>
                        </div>
                      )}
                      {room.isTriage && (
                        <a
                          className="fog:text-link fog:text-caption-m no-underline"
                          href="/blog/what-are-customer-triage-rooms"
                          rel="noopener"
                          target="_blank"
                        >
                          What’s Triage?
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {myAuthor.userType === "visitor-unverified" && <EmailVerification serverCall={serverCall} />}
    </>
  );
};

const EmailVerification = ({ serverCall }: { serverCall: ServerCall }) => {
  const [error, setError] = React.useState<string | React.ReactNode>();
  const [mode, setMode] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const { client, widgetId } = useWs();

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();

        if (mode === "email") {
          const email = (document.getElementById("emailToVerify") as HTMLInputElement)?.value;

          if (email) {
            setLoading(true);
            const res = await serverCall<VisitorVerifyEmail>({
              msgType: "Visitor.VerifyEmail",
              email,
            });
            setLoading(false);

            if (res.msgType === "Visitor.Err") {
              if (res.code === 429) {
                setError("Too many attempts: please try again in a bit");
              } else if (res.code === 400) {
                setError("This does not look like a valid email address, please try again:");
              }
            } else if (res.msgType === "Visitor.Ok") {
              setError(undefined);
              setMode("code");
              setEmail(email);
            }
          }
        } else if (mode === "code") {
          const code = (document.getElementById("codeToVerify") as HTMLInputElement)?.value;

          if (code) {
            setLoading(true);
            const res = await serverCall<VisitorVerifyCode>({
              msgType: "Visitor.VerifyCode",
              emailCode: code,
            });
            setLoading(false);

            if (res.msgType === "Visitor.Err") {
              if (res.code === 404) {
                setError(
                  <>
                    <span>Hm, the code didn’t work. Try again? </span>
                    <span className="text-black">Please enter your email below:</span>
                  </>
                );
                setMode("email");
              }
            } else if (res.msgType === "Visitor.Ok") {
              setError(undefined);
              setMode("code");
              if (client && client.setVisitorInfo) {
                const { token, userId } = res;

                if (widgetId && token && userId) {
                  client.setVisitorInfo({ token, widgetId, userId }, true);
                }
              }
            }
          }
        }
      }}
    >
      <div className="bg-gray-200 flex flex-col mt-2 mx-2 p-2 gap-2 rounded-lg text-sm">
        <span className="font-medium">
          {mode === "email" &&
            (error ? (
              <span className="text-brand-red-500">{error}</span>
            ) : (
              <span>To hear back from us if you step away, enter your email address: </span>
            ))}

          {mode === "code" && (
            <span>
              We just emailed your one-time code to{" "}
              <span className="font-medium text-gray-500">{email}</span>:{" "}
            </span>
          )}
        </span>
        <div className="flex gap-2">
          {mode === "email" && (
            <input
              data-1p-ignore={true}
              autoFocus={true}
              title="Please enter a valid email address"
              id="emailToVerify"
              className="flex-grow border-1 rounded-md bg-yellow-50 px-2 leading-loose text-gray-800"
              type="email"
              placeholder="name@example.com"
            />
          )}
          {mode === "code" && (
            <input
              data-1p-ignore={true}
              id="codeToVerify"
              className="flex-grow border-1 rounded-md bg-yellow-50 px-2 leading-loose text-gray-800"
              type="text"
              autoFocus={true}
              placeholder="Paste the code here"
            />
          )}
          <ThinButton className="w-24">
            {loading ? (
              <Icons.Spinner className="w-3 text-blue-500" />
            ) : (
              <>
                {mode === "email" && <span>Go</span>}
                {mode === "code" && <span>Verify</span>}
              </>
            )}
          </ThinButton>
          {mode === "code" && (
            <ThinButton className="w-24" onClick={() => setMode("email")}>
              Try again
            </ThinButton>
          )}
        </div>
      </div>
    </form>
  );
};

export const RoomNameLine: React.FC<
  Partial<RoomHeaderProps> & {
    unreadBadge?: React.ReactNode;
    mode: RoomMode;
    roomName: string;
  }
> = ({ room, paneId, onClose, mode, unreadBadge, rosterVisible, ourId, roomName }) => {
  const counterpart = room && calculateCounterpart(room, ourId);
  const isEmail = room?.tags?.some(t => t.name === ":email") || false;
  const isExternal = isExternalHelpdesk(room?.customerName);
  const isBug = room?.tags?.some(t => t.name === ":bug") || false;
  const isFeature = (room?.tags?.some(t => t.name === ":feature") && isBug !== true) || false;
  const isDiscussion = room?.tags?.some(t => t.name === ":discussion") || false;
  const isBroadcast =
    isInternalHelpdesk(room?.customerName) && room?.tags?.some(t => t.name === ":triage");

  return (
    <>
      <div
        className={classNames(
          "layout-nodrag mr-2 flex items-center cursor-pointer",
          rosterVisible ? "hidden" : "sm:hidden"
        )}
        onClick={() => {
          if (room && onClose && paneId) {
            onClose(paneId);
          }
        }}
      >
        <Icons.ArrowBack />
      </div>
      {unreadBadge ? (
        <div className="relative flex pr-2">{unreadBadge}</div>
      ) : (
        <span className="flex items-center">
          {" "}
          {room?.type === "dialog" && (
            <span className="pr-1.5">
              <Avatar url={counterpart?.imageUrl} name={counterpart?.name} size={32} />
            </span>
          )}
          {room?.type === "private" && isEmail === false && isExternal === false && (
            <span className="flex pr-1.5">
              <span className="py-0.5 px-1.5 rounded-xl bg-gray-800 text-white fog:text-caption-s">
                Private
              </span>
            </span>
          )}
          {room?.type === "private" && isEmail === true && (
            <span className="pr-1.5">
              <Icons.RoomExternalLarge className="w-6 h-6" />
            </span>
          )}
          {mode === "Search" ? (
            <div className="pr-1.5">
              <Icons.Search className="w-6 h-6" />
            </div>
          ) : mode === "Customer" ? (
            <div className="pr-1.5">
              <FontAwesomeCrown className="text-yellow-400" />
            </div>
          ) : room?.isTriage ? (
            <div className="pr-1.5 hidden">
              <Icons.RoomTriageLarge className="w-6 h-6" />
            </div>
          ) : isBug ? (
            <div className="pr-1.5 hidden">
              <Icons.RoomBugLarge className="w-6 h-6" />
            </div>
          ) : isFeature ? (
            <div className="pr-1.5 hidden">
              <Icons.RoomFeatureLarge className="w-6 h-6" />
            </div>
          ) : isBroadcast ? (
            <div className="pr-1.5">
              <Icons.Broadcast />
            </div>
          ) : room?.type === "public" &&
            !isInternalHelpdesk(room?.customerName) &&
            !isDiscussion ? (
            <div className="pr-1.5 hidden">
              <Icons.RoomIssueLarge className="w-6 h-6" />
            </div>
          ) : null}
        </span>
      )}
      <span className="flex-1 leading-relaxed truncate" title={counterpart?.name || roomName}>
        {mode === "Search" && (
          <>
            <span>Search: </span>{" "}
          </>
        )}
        {["Room", "Search"].includes(mode) &&
          (counterpart?.name || roomName || <span className="invisible">...</span>)}
        {mode === "Customer" && room && room.customerName}
      </span>
    </>
  );
};
