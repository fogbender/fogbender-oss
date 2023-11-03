import classNames from "classnames";
import {
  type EventIssue,
  type Integration as IntegrationT,
  invariant,
  type Message,
  type MessageCreate,
  type Room,
  type RoomUpdate,
  useIssues,
  useRosterActions,
  useSharedRoster,
  useWs,
} from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";

import {
  IconAsana,
  IconGitlab,
  IconJira,
  IconLinear,
  IconOutlineGithub,
  IconOutlineHeight,
  IconOutlineTrello,
} from "../components/IntegrationIcons";
import { FilterInput, RadioIcon, ThickButton, ThinButton } from "../components/lib";
import { useTxtAreaWithError } from "../components/useTxtAreaWithError";
import { MessageView } from "../messages/MessageView";
import { Select } from "../ui/Select";
import { formatCustomerName } from "../utils/format";

const PossibleModes = ["New room", "Create new external issue", "Link to existing external issue"];
type PossibleModesTuple = typeof PossibleModes;
type FileIssueMode = PossibleModesTuple[number];

export const FileIssue: React.FC<{
  room: Room | undefined;
  fromRoomId?: string;
  helpdeskId?: string;
  workspaceId?: string;
  vendorId?: string;
  selection: Message[];
  isInternal: boolean;
  messagesByTarget: { [targetId: string]: Message[] };
  messageCreateMany: (messages: MessageCreate[]) => void;
  onComplete: () => void;
  issueTrackerIntegrations?: IntegrationT[];
}> = ({
  room,
  helpdeskId,
  workspaceId,
  vendorId,
  selection,
  isInternal,
  messagesByTarget,
  onComplete,
  issueTrackerIntegrations = [],
}) => {
  const { roomById } = useSharedRoster();
  const { forwardToIssue, createIssueWithForward, createRoom } = useRosterActions({
    helpdeskId,
    workspaceId,
  });

  const [fileIssueModes, setFileIssueModes] = React.useState<FileIssueMode[]>(PossibleModes);
  const [fileIssueMode, setFileIssueMode] = React.useState<FileIssueMode>("New room");

  const [roomNameError, setRoomNameError] = React.useState<string | React.ReactNode>();
  const {
    txtAreaValue: roomNameValue,
    fieldElement: roomNameInput,
    setValue: setRoomNameValue,
  } = useTxtAreaWithError({
    title: "Room / issue title",
    autoFocus: true,
    error: roomNameError,
  });
  React.useEffect(() => {
    setRoomNameError(undefined);
  }, [roomNameValue]);

  const [issuePriority, setIssuePriority] = React.useState<
    ":priority:low" | ":priority:medium" | ":priority:high"
  >(":priority:low");

  const isInternalAdminRoom =
    isInternal &&
    room?.tags?.some(
      t0 => t0.meta_type === "issue" && room?.tags?.some(t1 => t1.name === `${t0.name}:admin`)
    );

  const linkNewRoom = true;

  const { issues, issuesFilter, setIssuesFilter, issuesLoading } = useIssues({ workspaceId });
  const [selectedIssue, setSelectedIssue] = React.useState<EventIssue>();
  const [createNewRoom, setCreateNewRoom] = React.useState<boolean>(true);

  const onIssueSelected = React.useCallback(
    (issue: EventIssue | undefined) => {
      if (issue) {
        setRoomNameValue(issue.title);
      } else {
        if (selectedIssue?.title === roomNameValue) {
          setRoomNameValue("");
        }
      }

      setSelectedIssue(issue ?? undefined);
    },
    [roomNameValue, selectedIssue?.title, setRoomNameValue]
  );

  const fileIssueButtonTitle =
    fileIssueMode === "New room"
      ? "Create room"
      : fileIssueMode === "Create new external issue"
      ? createNewRoom
        ? "Create room and issue"
        : "Link issue"
      : createNewRoom
      ? "Create a new room and link to issue"
      : "Link issue";

  const hasIssueTrackerIntegrations = issueTrackerIntegrations.length > 0;

  const forwardSelectionToNewRoom = async () => {
    if (!helpdeskId) {
      return false;
    }

    let success = false;
    const linkRoomId = selection[0]?.roomId;
    const linkStartMessageId = selection[0]?.id;
    const linkEndMessageId = selection.slice(-1)[0]?.id;
    const forward = { linkRoomId, linkStartMessageId, linkEndMessageId };
    const meta = [];

    meta.push(issuePriority);

    const x = await createRoom({
      ...forward,
      name: roomNameValue.trim(),
      helpdeskId,
      type: "public",
      meta,
    });

    if (x && x.msgType === "Error.Fatal") {
      if (
        "code" in x &&
        x.code === 409 &&
        "data" in x &&
        x.data?.name &&
        x.data.name[0] === "has already been taken"
      ) {
        if (selectedIssue) {
          setRoomNameError(
            <>
              <b>
                {selectedIssue.title} #{selectedIssue.number}
              </b>{" "}
              is already connected
            </>
          );
        } else {
          setRoomNameError("This name is already taken");
        }
      }
    } else {
      success = true;
    }

    return success;
  };

  const forwardSelectionToNewRoomAndConnectToExistingIssue = async () => {
    if (!helpdeskId) {
      return false;
    }

    let success = false;
    const linkRoomId = selection[0]?.roomId;
    const linkStartMessageId = selection[0]?.id;
    const linkEndMessageId = selection.slice(-1)[0]?.id;
    const forward = { linkRoomId, linkStartMessageId, linkEndMessageId };
    const meta = [];
    const integration = issueTrackerIntegrations.find(
      iti => iti.id === selectedIssue?.integrationId
    );

    if (integration && selectedIssue) {
      let createRoomOk = true;

      meta.push(issuePriority);
      meta.push(selectedIssue.meta_tag);
      meta.push(":status:open");

      const x = await createRoom({
        ...forward,
        name: roomNameValue.trim(),
        helpdeskId,
        type: "public",
        meta,
      });

      if (x && x.msgType === "Error.Fatal") {
        if (
          "code" in x &&
          x.code === 409 &&
          "data" in x &&
          x.data?.name &&
          x.data.name[0] === "has already been taken"
        ) {
          setRoomNameError(
            <>
              <b>
                {selectedIssue.title} #{selectedIssue.number}
              </b>{" "}
              is already connected
            </>
          );
        }

        createRoomOk = false;
      } else if ((x && x.msgType !== "Room.Ok") || !x) {
        console.error(x);
        createRoomOk = false;
      }

      if (createRoomOk) {
        const x = await forwardToIssue({
          ...forward,
          integrationProjectId: integration.project_id,
          issueId: selectedIssue.id,
          issueTitle: selectedIssue.title,
        });

        console.assert(x !== null && x.msgType === "Integration.Ok");

        if (x && x.msgType === "Integration.Ok") {
          success = true;
        }
      }
    }

    return success;
  };

  const forwardSelectionToNewRoomAndConnectToNewIssue = async () => {
    if (!helpdeskId) {
      return false;
    }

    let success = false;
    const linkRoomId = selection[0]?.roomId;
    const linkStartMessageId = selection[0]?.id;
    const linkEndMessageId = selection.slice(-1)[0]?.id;
    const forward = { linkRoomId, linkStartMessageId, linkEndMessageId };
    const meta = [];
    const integration = issueTrackerIntegrations.find(iti => iti.id === selectedIntegration?.id);

    if (integration) {
      const res0 = await createIssueWithForward({
        ...forward,
        integrationProjectId: integration.project_id,
        title: roomNameValue.trim(),
      });

      if (res0) {
        console.assert(res0 !== null && res0.msgType === "Integration.Ok");

        if (res0.msgType === "Integration.Ok") {
          const { issueTag } = res0;

          if (issueTag) {
            meta.push(issueTag);
          }
        }
      }

      if (!isInternal) {
        meta.push(issuePriority);
        meta.push(":status:open");

        const res1 = await createRoom({
          ...forward,
          name: roomNameValue.trim(),
          helpdeskId,
          type: "public",
          meta,
        });

        if (res1 && res1.msgType === "Error.Fatal") {
          if (
            "code" in res1 &&
            res1.code === 409 &&
            "data" in res1 &&
            res1.data?.name &&
            res1.data.name[0] === "has already been taken"
          ) {
            setRoomNameError("This name is already taken");
          }
        } else {
          success = true;
        }
      } else {
        success = true;
      }
    }

    return success;
  };

  const connectSelectionToExistingIssue = async () => {
    let success = false;

    if (selectedIssue) {
      const x = await serverCall<RoomUpdate>({
        msgType: "Room.Update",
        roomId,
        tagsToAdd: [selectedIssue.meta_tag, ":issue", ":status:open"],
        tagsToRemove: [":status:closed", ":discussion", ":feature", ":bug"],
      });

      if (x && x.msgType === "Room.Ok") {
        const linkRoomId = selection[0]?.roomId;
        const linkStartMessageId = selection[0]?.id;
        const linkEndMessageId = selection.slice(-1)[0]?.id;
        const forward = { linkRoomId, linkStartMessageId, linkEndMessageId };
        const integration = issueTrackerIntegrations.find(
          iti => iti.id === selectedIssue?.integrationId
        );

        if (integration) {
          const x = await forwardToIssue({
            ...forward,
            integrationProjectId: integration.project_id,
            issueId: selectedIssue.id,
            issueTitle: selectedIssue.title,
          });

          console.assert(x !== null && x.msgType === "Integration.Ok");

          if (x && x.msgType === "Integration.Ok") {
            success = true;
          }
        }
      }
    }

    return success;
  };

  const connectSelectionToNewIssue = async () => {
    if (!helpdeskId) {
      return false;
    }

    let success = false;
    const linkRoomId = selection[0]?.roomId;
    const linkStartMessageId = selection[0]?.id;
    const linkEndMessageId = selection.slice(-1)[0]?.id;
    const forward = { linkRoomId, linkStartMessageId, linkEndMessageId };
    const tagsToAdd = [":status:open", ":issue", issuePriority];
    const integration = issueTrackerIntegrations.find(iti => iti.id === selectedIntegration?.id);

    if (integration) {
      const res0 = await createIssueWithForward({
        ...forward,
        integrationProjectId: integration.project_id,
        title: roomNameValue.trim(),
      });

      if (res0) {
        console.assert(res0 !== null && res0.msgType === "Integration.Ok");

        if (res0.msgType === "Integration.Ok") {
          const { issueTag } = res0;

          if (issueTag) {
            tagsToAdd.push(issueTag);

            const x = await serverCall<RoomUpdate>({
              msgType: "Room.Update",
              roomId,
              tagsToAdd,
              tagsToRemove: [":status:closed", ":discussion", ":feature", ":bug"],
            });

            if (x && x.msgType === "Room.Ok") {
              success = true;
            }
          }
        }
      }
    }

    return success;
  };

  const { serverCall } = useWs();

  const roomId = selection[0]?.roomId;
  const startMessageId = selection[0]?.id;
  const endMessageId = selection.slice(-1)[0]?.id;

  const [titleSuggestion, setTitleSuggestion] = React.useState<string>();

  const {
    refetch: reSummarize,
    isLoading: nameOptionsLoading,
    isRefetching: nameOptionsRefetching,
  } = useQuery(
    ["messages slice summary", roomId, startMessageId, endMessageId],
    async () => {
      const roomId = selection[0]?.roomId;
      const startMessageId = selection[0]?.id;
      const endMessageId = selection.slice(-1)[0]?.id;

      if (roomId && startMessageId && endMessageId) {
        const res = await serverCall({
          msgType: "Ai.Summarize",
          roomId,
          startMessageId,
          endMessageId,
          maxWords: 8,
        });
        invariant(res.msgType === "Ai.Ok", "Expected Ai.Ok", () => {
          console.error("Invariant failed in Ai.Ok", roomId, res);
        });
        const options = res.response;

        if (options[0]) {
          setTitleSuggestion(options[0]);
          setRoomNameValue(options[0]);
        }

        return res.response;
      }
      return;
    },
    {
      staleTime: Infinity,
    }
  );

  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async () => {
    let success = false;

    setSubmitting(true);

    switch (fileIssueMode) {
      case "New room":
        success = await forwardSelectionToNewRoom();
        break;
      case "Link to existing external issue":
        if (createNewRoom) {
          success = await forwardSelectionToNewRoomAndConnectToExistingIssue();
        } else {
          success = await connectSelectionToExistingIssue();
        }
        break;
      case "Create new external issue":
        if (createNewRoom) {
          success = await forwardSelectionToNewRoomAndConnectToNewIssue();
        } else {
          success = await connectSelectionToNewIssue();
        }
        break;
      default:
        break;
    }

    setSubmitting(false);

    if (success) {
      onComplete();
    }
  };

  const goodToGo =
    fileIssueMode === "New room" || fileIssueMode === "Create new external issue"
      ? roomNameValue.length !== 0
      : selectedIssue && hasIssueTrackerIntegrations;

  const integrationOptions = issueTrackerIntegrations.map(i => ({
    id: i.id,
    option: (
      <span className="flex items-center gap-1.5">
        <span className="fog:text-body-m">{integrationIcon(i.type)}</span>
        <span className="fog:text-body-m">{i.project_name}</span>
      </span>
    ),
  }));

  const [selectedIntegration, setSelectedIntegration] =
    React.useState<(typeof integrationOptions)[number]>();

  React.useEffect(() => {
    if (isInternalAdminRoom) {
      setFileIssueModes(["New room"]);
    }
  }, [isInternalAdminRoom]);

  const modeTitle = (mode: FileIssueMode) => {
    switch (mode) {
      case "Create new external issue":
        if (room?.isTriage) {
          return (
            <span className="flex flex-col items-center">
              <span>New room +</span>
              <span>new external issue</span>
            </span>
          );
        } else {
          return (
            <span className="flex flex-col items-center">
              <span>This or new room +</span>
              <span>new external issue</span>
            </span>
          );
        }

      case "Link to existing external issue":
        if (room?.isTriage) {
          return (
            <span className="flex flex-col items-center">
              <span>New room +</span>
              <span>existing external issue</span>
            </span>
          );
        } else {
          return (
            <span className="flex flex-col items-center">
              <span>This or new room +</span>
              <span>existing external issue</span>
            </span>
          );
        }

      case "New room":
        return "New room only";

      default:
        return mode;
    }
  };

  return (
    <div className="flex flex-col h-full sm:h-auto">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-col">
          <div className="fog:text-header3">{room?.name}</div>
          <div>
            <span className="fog:text-caption-l">{formatCustomerName(room?.customerName)}</span>
            <span className="fog:text-body-m text-gray-500">
              {selection.length === 1
                ? ` 1 message selected`
                : ` ${selection.length} messages selected`}{" "}
            </span>
          </div>
        </div>
      </div>
      <div className="relative w-full overflow-y-auto fbr-scrollbar mb-4 pl-4 max-h-32">
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
            sourceMessages={messagesByTarget[msg.id] || []}
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
      <div className="pt-6 border-t border-gray-300 bg-white">
        <div className="fog:text-header3 self-start pb-6">File conversation in...</div>
        {fileIssueModes.length > 1 && (
          <div className="flex flex-wrap justify-center sm:justify-start items-center border-b -mx-8 px-6 mb-6">
            {fileIssueModes.map(mode => (
              <div
                key={mode}
                className={classNames(
                  "py-3 px-6 border-b-5 whitespace-nowrap fog:text-body-m rounded-t",
                  mode === fileIssueMode
                    ? "border-brand-orange-500 bg-blue-50"
                    : "border-transparent text-blue-700 hover:text-brand-red-500 cursor-pointer"
                )}
                onClick={() => {
                  setFileIssueMode(mode);
                  if (room?.isTriage) {
                    setCreateNewRoom(true);
                  }
                  if (mode === "Create new external issue") {
                    setSelectedIntegration(integrationOptions[0]);
                  }
                }}
              >
                {modeTitle(mode)}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-y-4 mb-4 fog:text-body-m sm:w-[556px]">
          {fileIssueMode === "New room" && (
            <div>
              Create a new {!isInternal && "customer-facing"} room in Fogbender to continue the
              conversation with the team from{" "}
              <span className="font-medium">{formatCustomerName(room?.customerName)}</span>.
            </div>
          )}
          {fileIssueMode === "Create new external issue" && (
            <div>
              Create a new ticket in an external issue tracker and link it with this or new
              {!isInternal && " customer-facing"} room in Fogbender
            </div>
          )}
          {fileIssueMode === "Link to existing external issue" && (
            <div>
              Link this conversation with a new or existing ticket in an external issue tracker
            </div>
          )}
        </div>

        <div className="flex flex-col gap-y-4">
          {(fileIssueMode === "New room" ||
            (fileIssueMode === "Create new external issue" && hasIssueTrackerIntegrations)) && (
            <div className="flex flex-col">
              <div>{roomNameInput}</div>
              <ThinButton
                onClick={() => reSummarize()}
                className="max-w-min mt-4 place-self-end"
                loading={nameOptionsLoading || nameOptionsRefetching}
              >
                {titleSuggestion ? "Suggest a different title" : "Suggest a title"}
              </ThinButton>
            </div>
          )}
          {["Link to existing external issue", "Create new external issue"].includes(
            fileIssueMode
          ) && (
            <div className="border-gray-300 fog:text-body-m">
              <div
                className={classNames(
                  "flex items-center gap-x-5",
                  !hasIssueTrackerIntegrations ? "text-gray-500" : "cursor-pointer"
                )}
              >
                <span
                  className={classNames(
                    "w-full flex justify-between",
                    !hasIssueTrackerIntegrations && "hidden"
                  )}
                >
                  <span className="flex flex-col gap-3 flex-1">
                    {hasIssueTrackerIntegrations && (
                      <span className={"flex flex-col gap-3"}>
                        {fileIssueMode === "Create new external issue" && (
                          <div className="my-4">
                            <Select
                              onChange={setSelectedIntegration}
                              options={integrationOptions}
                              selectedOption={selectedIntegration}
                            />
                          </div>
                        )}
                        {fileIssueMode === "Link to existing external issue" &&
                          linkNewRoom &&
                          hasIssueTrackerIntegrations && (
                            <div className="mb-4">
                              <div className="bg-gray-100 flex-none rounded-lg px-2">
                                <FilterInput
                                  placeholder="Search existing issues across all connected issue trackers"
                                  value={issuesFilter}
                                  setValue={setIssuesFilter}
                                  focusOnMount={true}
                                  isLoading={issuesLoading}
                                  noBorder={true}
                                />
                              </div>
                              {issues.length > 0 && (
                                <div
                                  className="mt-2 overflow-y-auto fbr-scrollbar"
                                  style={{ height: "138px" }}
                                >
                                  <div className="flex flex-col gap-y-2">
                                    {issues.length === 0 && (
                                      <>
                                        {issuesFilter && issuesLoading !== true && (
                                          <div className="flex items-center gap-x-2 truncate">
                                            No issues found
                                          </div>
                                        )}
                                        {issuesLoading === true && (
                                          <div className="flex items-center gap-x-2 truncate">
                                            Searching...
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {issues
                                      .filter(
                                        x =>
                                          x.meta_tag !==
                                          room?.tags?.find(z => z.name === x.meta_tag)?.name
                                      )
                                      .map(issue => (
                                        <Issue
                                          key={issue.id}
                                          issue={issue}
                                          issueTrackerIntegrations={issueTrackerIntegrations}
                                          selectedIssue={selectedIssue}
                                          onIssueSelected={onIssueSelected}
                                        />
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </span>
                    )}
                    {hasIssueTrackerIntegrations && !room?.isTriage && (
                      <div className="space-y-2 border-t pt-4">
                        <div className="text-gray-500">Link external issue</div>
                        <div
                          className="flex items-center gap-x-2 bg-white cursor-pointer"
                          onClick={() => {
                            setCreateNewRoom(true);
                          }}
                        >
                          <span>
                            <RadioIcon className="w-4" on={createNewRoom} />
                          </span>
                          <span className="font-normal">To new room</span>
                        </div>
                        <div
                          className="flex items-center gap-x-2 bg-white cursor-pointer"
                          onClick={() => {
                            setCreateNewRoom(false);
                          }}
                        >
                          <span>
                            <RadioIcon className="w-4" on={!createNewRoom} />
                          </span>
                          <span className="font-normal">To this room</span>
                        </div>
                      </div>
                    )}
                  </span>
                </span>
                {!hasIssueTrackerIntegrations && (
                  <div className="text-black flex w-[556px] py-3 px-4 bg-gray-100 rounded-lg flex-col gap-4">
                    <div>You don’t have any integrations configured</div>
                    <div className="text-gray-500">
                      <span className="flex flex-row pb-2 gap-2">
                        <IconGitlab className="w-5 h-5" />
                        <IconOutlineGithub className="w-5 h-5" />
                        <IconJira className="w-5 h-5" />
                        <IconOutlineTrello className="w-5 h-5" />
                        <IconAsana className="w-5 h-5" />
                      </span>
                      To link rooms to issues in GitLab, GitHub, Asana, Jira, or similar,{" "}
                      <a
                        className="fog:text-link no-underline"
                        href={`/admin/vendor/${vendorId}/workspace/${workspaceId}/settings/integrations?add_integration`}
                      >
                        add an integration in workspace settings
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {(createNewRoom || fileIssueMode === "New room") && (
        <div className="flex fog:text-body-m items-center sm:gap-x-24 my-4">
          <div className="text-gray-500">Priority</div>
          <div className="flex flex-row gap-x-4 items-center">
            <div
              className="flex items-center gap-x-2 pl-2 cursor-pointer"
              onClick={() => setIssuePriority(":priority:low")}
            >
              <RadioIcon on={issuePriority === ":priority:low"} className="w-4" />
              <span>Low</span>
            </div>
            <div
              className="flex items-center gap-x-2 cursor-pointer"
              onClick={() => setIssuePriority(":priority:medium")}
            >
              <RadioIcon on={issuePriority === ":priority:medium"} className="w-4" />
              <span>Medium</span>
            </div>
            <div
              className="flex items-center gap-x-2 cursor-pointer"
              onClick={() => setIssuePriority(":priority:high")}
            >
              <RadioIcon on={issuePriority === ":priority:high"} className="w-4" />
              <span>High</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center mt-4 gap-x-4">
        <ThickButton disabled={!goodToGo} onClick={onSubmit} loading={submitting}>
          {fileIssueButtonTitle}
        </ThickButton>
      </div>
    </div>
  );
};

export const Issue: React.FC<{
  issueTrackerIntegrations: IntegrationT[];
  issue: EventIssue;
  selectedIssue: EventIssue | undefined;
  onIssueSelected?: (x: EventIssue | undefined) => void;
  withRadio?: boolean;
  withIntegration?: boolean;
}> = ({ issueTrackerIntegrations, issue, selectedIssue, onIssueSelected, withRadio = true }) => {
  const integration = issueTrackerIntegrations.find(iti => iti.id === issue.integrationId);

  return (
    <div
      className="flex flex-row justify-between items-center gap-x-2 truncate cursor-pointer"
      onClick={() =>
        onIssueSelected &&
        (selectedIssue?.id === issue.id ? onIssueSelected(undefined) : onIssueSelected(issue))
      }
    >
      <div className="flex gap-x-2 items-center">
        {withRadio && (
          <div>
            <RadioIcon className="w-4" on={selectedIssue?.id === issue.id} />
          </div>
        )}
        <div className="flex truncate w-24 sm:w-96 fog:text-body-m">{issue.title}</div>
      </div>
      <div className="flex flex-row justify-end">
        <span className="text-gray-500">{integrationIcon(issue.type)}</span>
        <span className="fog:text-body-s px-2 text-gray-500">{integration?.project_name}</span>
      </div>
    </div>
  );
};
const integrationIcon = (type: string) => {
  if (type === "gitlab") {
    return <IconGitlab className="w-4 h-4" />;
  } else if (type === "github") {
    return <IconOutlineGithub className="w-4 h-4" stroke="currentColor" />;
  } else if (type === "asana") {
    return <IconAsana className="w-4 h-4" />;
  } else if (type === "jira") {
    return <IconJira className="w-4 h-4" />;
  } else if (type === "linear") {
    return <IconLinear className="w-4 h-4" />;
  } else if (type === "height") {
    return <IconOutlineHeight className="w-4 h-4" stroke="currentColor" />;
  } else if (type === "trello") {
    return <IconOutlineTrello className="w-4 h-4" stroke="currentColor" />;
  } else {
    return null;
  }
};
