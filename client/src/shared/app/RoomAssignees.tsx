import { Combobox } from "@headlessui/react";
import classNames from "classnames";
import { EventAgentGroup, useAgentGroups, useWsCalls } from "fogbender-proto";
import React from "react";

import { Icons, XCircleFilled } from "../components/Icons";
import { Avatar, ThickButton, ThinButton } from "../components/lib";
import { Agent } from "../types";
import { useClickOutside } from "../utils/useClickOutside";

export const RoomAssignees: React.FC<{
  ourId?: string;
  roomId: string;
  roomTags: string[];
  agents?: Agent[];
  readOnly?: boolean;
  vendorId: string;
}> = ({ ourId, roomId, roomTags, agents, readOnly = false, vendorId }) => {
  const { groups } = useAgentGroups({ vendorId });

  const { updateRoom } = useWsCalls();

  const myAssignTag = ourId ? `:assignee:${ourId}` : undefined;
  const assignedToMe = React.useMemo(() => {
    return roomTags.some(x => x === myAssignTag);
  }, [roomTags, myAssignTag]);

  const [tagsToAdd, setTagsToAdd] = React.useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = React.useState<string[]>([]);

  const assignees = React.useMemo(() => {
    const assigneeTags = roomTags.filter(x => x.startsWith(":assignee:"));
    return assigneeTags
      .map(tag => (agents || []).find(agent => tag === `:assignee:${agent.id}`))
      .filter((x): x is Agent => x !== undefined);
  }, [agents, roomTags]);

  const assignedGroups = React.useMemo(() => {
    const assignedGroupsTags = roomTags.filter(x => x.startsWith(":assignee:group:"));
    return assignedGroupsTags
      .map(tag => (groups || []).find(group => tag === `:assignee:group:${group.name}`))
      .filter((x): x is EventAgentGroup => x !== undefined);
  }, [groups, roomTags]);

  const [showOptions, setShowOptions] = React.useState(false);
  const [inputSearchValue, setInputSearchValue] = React.useState<string>();

  const onUpdate = React.useCallback(async () => {
    await updateRoom({
      roomId,
      tagsToAdd,
      tagsToRemove,
    });
    setInputSearchValue(undefined);
    setTagsToAdd([]);
    setTagsToRemove([]);
    setShowOptions(false);
  }, [updateRoom, roomId, tagsToAdd, tagsToRemove]);

  const onMyUpdate = React.useCallback(async () => {
    if (!myAssignTag) {
      return;
    }
    await updateRoom({
      roomId,
      tagsToAdd: assignedToMe ? [] : [myAssignTag],
      tagsToRemove: assignedToMe ? [myAssignTag] : [],
    });
    setInputSearchValue(undefined);
    setTagsToAdd([]);
    setTagsToRemove([]);
    setShowOptions(false);
  }, [myAssignTag, updateRoom, roomId, assignedToMe]);

  const [myAgent, checkedAgents, uncheckedAgents] = React.useMemo(() => {
    const allAgents = (agents || [])
      .filter(x => x.role === "owner" || x.role === "admin" || x.role === "agent")
      .filter(
        x => !inputSearchValue || x.name.toLowerCase().includes(inputSearchValue.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const myAgents: Agent[] = [];
    const checkedAgents: Agent[] = [];
    const uncheckedAgents: Agent[] = [];

    allAgents.forEach(agent => {
      if (agent.id === ourId) {
        myAgents.push(agent);
      } else if (assignees.includes(agent)) {
        checkedAgents.push(agent);
      } else {
        uncheckedAgents.push(agent);
      }
    });

    return [myAgents, checkedAgents, uncheckedAgents] as const;
  }, [assignees, agents, inputSearchValue, ourId]);

  const agentsToShow = React.useMemo(
    () => myAgent.concat(checkedAgents).concat(uncheckedAgents),
    [myAgent, checkedAgents, uncheckedAgents]
  );

  const [checkedGroups, uncheckedGroups] = React.useMemo(() => {
    const checkedGroups: EventAgentGroup[] = [];
    const unCheckedGroups: EventAgentGroup[] = [];
    groups.forEach(group =>
      assignedGroups.includes(group) ? checkedGroups.push(group) : unCheckedGroups.push(group)
    );
    return [checkedGroups, unCheckedGroups] as const;
  }, [assignedGroups, groups]);

  const groupsToShow = React.useMemo(
    () => [...checkedGroups, ...uncheckedGroups],
    [checkedGroups, uncheckedGroups]
  );

  const canAssign = myAgent.length > 0;
  const toggleAgent = React.useCallback(
    (agent: Agent) => {
      const agentTag = `:assignee:${agent.id}`;
      if (tagsToRemove.includes(agentTag)) {
        setTagsToRemove(tags => tags.filter(x => x !== agentTag));
      } else if (tagsToAdd.includes(agentTag)) {
        setTagsToAdd(tags => tags.filter(x => x !== agentTag));
      } else if (assignees.includes(agent)) {
        setTagsToRemove(tags => tags.concat(agentTag));
      } else {
        setTagsToAdd(tags => tags.concat(agentTag));
      }
    },
    [tagsToAdd, tagsToRemove, assignees]
  );

  const toggleGroup = React.useCallback(
    (group: EventAgentGroup) => {
      const groupTag = `:assignee:group:${group.name}`;

      if (tagsToRemove.includes(groupTag)) {
        setTagsToRemove(tags => tags.filter(x => x !== groupTag));
      } else if (tagsToAdd.includes(groupTag)) {
        setTagsToAdd(tags => tags.filter(x => x !== groupTag));
      } else if (assignedGroups.includes(group)) {
        setTagsToRemove(tags => tags.concat(groupTag));
      } else {
        setTagsToAdd(tags => tags.concat(groupTag));
      }
    },
    [tagsToAdd, tagsToRemove, assignedGroups]
  );

  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useClickOutside(menuRef, () => setShowOptions(false), !showOptions);

  React.useEffect(() => {
    if (showOptions) {
      inputRef.current?.focus();
    }
  }, [showOptions]);

  const assigneesAndGroupsLength = assignees.length + assignedGroups.length;

  return (
    <div ref={menuRef} className="relative">
      <span
        className={classNames("flex items-center gap-x-1", canAssign && "cursor-pointer")}
        onClick={readOnly === false && canAssign ? () => setShowOptions(x => !x) : undefined}
      >
        <span className="fog:text-chat-username-s">
          {assigneesAndGroupsLength === 0
            ? "Unassigned"
            : assigneesAndGroupsLength === 1
            ? "Assignee"
            : "Assignees"}
        </span>
        <div className="flex items-center gap-x-1 truncate">
          {assignees.map(x => (
            <Avatar key={x.id} url={x.image_url} name={x.name} size={24} />
          ))}
          {assignedGroups.map(x => (
            <span key={x.name} title={`${x.name} (${x.agents.length})`}>
              <Avatar
                key={x.name}
                url={undefined}
                name={x.name}
                size={24}
                avatarType="group"
                withTitle={false}
              />
            </span>
          ))}
          {!assigneesAndGroupsLength && canAssign && !readOnly && (
            <span>
              <Icons.InvitedUserIcon className="w-6 h-6" />
            </span>
          )}
        </div>
      </span>
      {showOptions && (
        <div
          className={classNames(
            "z-20 absolute top-6 rounded-md right-0 max-w-80 py-2 bg-white fog:box-shadow-m",
            ((agentsToShow.length && !assignees.length) ||
              (groupsToShow.length && !assignedGroups.length)) &&
              "mt-1"
          )}
        >
          <Combobox multiple={true} value={[]}>
            <div className="-mt-2 px-2">
              <div
                className={classNames(
                  "flex items-center",
                  (agentsToShow.length || groupsToShow.length) && "border-b"
                )}
              >
                <Combobox.Label className="w-4 text-gray-500 cursor-pointer">
                  {inputSearchValue ? <XCircleFilled /> : <Icons.Search />}
                </Combobox.Label>
                <Combobox.Input
                  ref={inputRef}
                  className={
                    "flex-1 px-2 py-3 bg-transparent outline-none text-black placeholder-gray-500 text-base sm:text-sm"
                  }
                  placeholder="Search agents / groups"
                  onChange={evt => {
                    setInputSearchValue(evt.target.value);
                  }}
                />
                <ThinButton onClick={onMyUpdate} className="text-2xs" small={true}>
                  {assignedToMe ? "Unassign me" : "Assign to me"}
                </ThinButton>
              </div>
            </div>
            <Combobox.Options
              static={true}
              onFocus={() => {
                inputRef.current?.focus();
              }}
              className="bg-white focus:outline-none"
            >
              {(!!agentsToShow.length || !!groupsToShow.length) && (
                <div className="max-h-32 my-2 overflow-y-auto fbr-scrollbar">
                  {agentsToShow.map((x, i) => (
                    <AgentOption
                      key={`a-${i}`}
                      x={x}
                      tagsToAdd={tagsToAdd}
                      tagsToRemove={tagsToRemove}
                      assignees={assignees}
                      toggleAgent={toggleAgent}
                    />
                  ))}
                  {groupsToShow.map((x, i) => (
                    <GroupOption
                      key={`g-${i}`}
                      x={x}
                      tagsToAdd={tagsToAdd}
                      tagsToRemove={tagsToRemove}
                      assignedGroups={assignedGroups}
                      toggleGroup={toggleGroup}
                    />
                  ))}
                </div>
              )}
              {(tagsToAdd.length > 0 || tagsToRemove.length > 0) && (
                <div className="px-2 pt-2 border-t border-gray-200">
                  <ThickButton small={true} onClick={onUpdate}>
                    Apply
                  </ThickButton>
                </div>
              )}
            </Combobox.Options>
          </Combobox>
        </div>
      )}
    </div>
  );
};

const AgentOption = ({
  x,
  tagsToAdd,
  tagsToRemove,
  assignees,
  toggleAgent,
}: {
  x: Agent;
  tagsToAdd: string[];
  tagsToRemove: string[];
  assignees: Agent[];
  toggleAgent: (x: Agent) => void;
}) => {
  return (
    <Combobox.Option
      value={x}
      className='data-[headlessui-state~="active"]:bg-gray-200 data-[headlessui-state~="selected"]:bg-gray-200'
    >
      <div
        className="flex items-center gap-x-2 p-2 hover:bg-gray-200 cursor-pointer"
        onClick={() => toggleAgent(x)}
      >
        <span className="text-blue-700">
          {(assignees.includes(x) && !tagsToRemove.includes(`:assignee:${x.id}`)) ||
          tagsToAdd.includes(`:assignee:${x.id}`) ? (
            <Icons.CheckboxOn />
          ) : (
            <Icons.CheckboxOff />
          )}
        </span>
        <Avatar url={x.image_url} name={x.name} size={25} />
        <div className="flex items-center truncate gap-x-1">
          <span className="flex-1 truncate">{x.name}</span>
          <Icons.AgentMark />
        </div>
      </div>
    </Combobox.Option>
  );
};

const GroupOption = ({
  x,
  tagsToAdd,
  tagsToRemove,
  assignedGroups,
  toggleGroup,
}: {
  x: EventAgentGroup;
  tagsToAdd: string[];
  tagsToRemove: string[];
  assignedGroups: EventAgentGroup[];
  toggleGroup: (x: EventAgentGroup) => void;
}) => {
  return (
    <Combobox.Option
      value={x}
      className='data-[headlessui-state~="active"]:bg-gray-200 data-[headlessui-state~="selected"]:bg-gray-200'
    >
      <div
        className="flex items-center gap-x-2 p-2 hover:bg-gray-200 cursor-pointer"
        onClick={() => toggleGroup(x)}
      >
        <span className="text-blue-700">
          {(assignedGroups.includes(x) && !tagsToRemove.includes(`:assignee:group:${x.name}`)) ||
          tagsToAdd.includes(`:assignee:group:${x.name}`) ? (
            <Icons.CheckboxOn />
          ) : (
            <Icons.CheckboxOff />
          )}
        </span>
        <Avatar url={undefined} name={x.name} size={25} avatarType="group" />
        <div className="flex items-center truncate gap-x-1 justify-between w-full">
          <span>
            <span className="flex-1 truncate">{x.name}</span> ({x.agents.length})
          </span>
          <span>group</span>
        </div>
      </div>
    </Combobox.Option>
  );
};
