import { Combobox } from "@headlessui/react";
import classNames from "classnames";
import {
  type Agent,
  type AgentGroup,
  Avatar,
  GroupDefaultIcon,
  Icons,
  Modal,
  ThickButton,
  useClickOutside,
  useInput,
} from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { type Vendor } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";

export const AgentGroups: React.FC<{
  vendor: Vendor;
  ourId: string;
  ourRole: string;
}> = ({ vendor, ourId, ourRole }) => {
  const agentGroupsData = useQuery(queryKeys.agentGroups(vendor.id), () =>
    apiServer.get(`/api/vendors/${vendor.id}/groups`).json<AgentGroup[]>()
  );

  const { data: agentGroups } = agentGroupsData;

  const deleteGroupMutation = useMutation({
    mutationFn: (params: { name: string }) => {
      const { name } = params;
      setDeletingGroupName(name);
      return apiServer.url(`/api/vendors/${vendor.id}/groups/${name}`).delete().text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.agentGroups(vendor.id));
      setDeletingGroupName(undefined);
    },
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents(vendor.id),
    queryFn: () => apiServer.get(`/api/vendors/${vendor.id}/agents`).json<Agent[]>(),
  });

  const [deletingGroupName, setDeletingGroupName] = React.useState<string>();
  const [addNewGroup, setAddNewGroup] = React.useState(false);
  const [editGroup, setEditGroup] = React.useState<string>();

  return (
    <div className="w-full bg-white dark:bg-gray-800 dark:text-white p-4 rounded-xl fog:box-shadow-s flex flex-col pl-8 gap-4">
      {addNewGroup && (
        <Modal
          onClose={() => {
            setAddNewGroup(false);
          }}
        >
          <AddGroupForm
            onClose={() => setAddNewGroup(false)}
            vendor={vendor}
            ourId={ourId}
            agentGroup={undefined}
            agents={agents}
          />
        </Modal>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <ThickButton
          small={true}
          onClick={() => {
            setAddNewGroup(true);
          }}
        >
          Add a group
        </ThickButton>
      </div>
      <div className="w-full flex flex-col">
        <table className="table-fixed w-full">
          <tbody>
            {agentGroups?.map((group, i) => (
              <tr key={i}>
                <td className="border-t py-2">
                  <div className="flex flex-row items-center">
                    <span>
                      <GroupDefaultIcon />
                    </span>
                    <span className="font-semibold pl-2">{group.name}</span>
                  </div>
                </td>
                <td className="border-t py-2">
                  <div className="flex items-center flex-col gap-x-1 overflow-hidden sm:overflow-visible">
                    <div className="flex gap-x-1 truncate">
                      {group.agents.map(x =>
                        x ? (
                          <span
                            key={x.id}
                            title={`${x.name} (${x.email})`}
                            className="flex flex-row"
                          >
                            <Avatar url={x.image_url} name={x.name} size={24} withTitle={false} />
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="text-sm">
                      {group.agents.length} {group.agents.length === 1 ? "member" : "members"}
                    </div>
                  </div>
                </td>
                <td className="border-t py-2">
                  <div className="flex justify-end items-center py-4">
                    <span
                      className="text-gray-500 hover:text-red-500 cursor-pointer"
                      onClick={() => setEditGroup(group.name)}
                    >
                      {editGroup === group.name && (
                        <Modal
                          onClose={() => {
                            setEditGroup("");
                          }}
                        >
                          <AddGroupForm
                            onClose={() => setEditGroup("")}
                            vendor={vendor}
                            ourId={ourId}
                            agentGroup={group}
                            agents={agents}
                          />
                        </Modal>
                      )}
                      <Icons.GearNoFill
                        className={classNames(
                          "w-6 h-6",
                          (ourRole === "agent" || ourRole === "reader" || group.name === "all") &&
                            "hidden"
                        )}
                        strokeWidth="2"
                      />
                    </span>
                    <span
                      title="Remove"
                      className="text-gray-500 hover:text-red-500 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure?") === true) {
                          deleteGroupMutation.mutate({ name: group.name });
                        }
                      }}
                    >
                      {group.name !== "all" &&
                        (deleteGroupMutation.isLoading && deletingGroupName === group.name ? (
                          <Icons.Spinner className="w-5 ml-6" />
                        ) : (
                          <Icons.Trash
                            className={classNames(
                              "w-5 ml-6",
                              (ourRole === "agent" || ourRole === "reader") && "hidden"
                            )}
                          />
                        ))}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const InputClassName =
  "w-full bg-gray-100 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose rounded-lg";

export const AddGroupForm: React.FC<{
  onClose: () => void;
  vendor: Vendor;
  ourId: string;
  agentGroup: AgentGroup | undefined;
  agents: Agent[] | undefined;
}> = ({ onClose, vendor, ourId, agentGroup, agents }) => {
  const [addGroupName, addGroupNameInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-full",
    placeholder: "Group name",
    autoFocus: true,
    defaultValue: agentGroup ? agentGroup.name : undefined,
    disabled: agentGroup?.name !== undefined,
  });
  const [showAgents, setShowAgents] = React.useState(false);
  const [agentsSearchValue, setAgentsSearchValue] = React.useState<string>();
  const [membersToAdd, setMembersToAdd] = React.useState<Set<string>>(new Set([]));
  const [membersToRemove, setMembersToRemove] = React.useState<Set<string>>(new Set([]));

  const [myAgent, checkedAgents, uncheckedAgents, selectedAgents] = React.useMemo(() => {
    const allAgents = ([...(agents as Agent[])] || [])
      .filter(x => x.role === "owner" || x.role === "admin" || x.role === "agent")
      .filter(
        x => !agentsSearchValue || x.name.toLowerCase().includes(agentsSearchValue.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const allSelectedAgents = ([...(agents as Agent[])] || [])
      .filter(x => x.role === "owner" || x.role === "admin" || x.role === "agent")
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      allAgents.filter(x => x.id === ourId),
      allAgents
        .filter(x => x.id !== ourId)
        .filter(x => agentGroup?.agents.map(m => m.id).includes(x.id)),
      allAgents
        .filter(x => x.id !== ourId)
        .filter(x => !agentGroup?.agents.map(m => m.id).includes(x.id)),
      allSelectedAgents.filter(
        x =>
          (agentGroup?.agents.map(m => m.id).includes(x.id) ||
            Array.from(membersToAdd)
              .map(m => m)
              .includes(x.id)) &&
          !Array.from(membersToRemove)
            .map(m => m)
            .includes(x.id)
      ),
    ];
  }, [agents, agentsSearchValue, ourId, agentGroup?.agents, membersToAdd, membersToRemove]);

  const agentsToShow = React.useMemo(
    () => myAgent.concat(checkedAgents).concat(uncheckedAgents),
    [myAgent, checkedAgents, uncheckedAgents]
  );

  const addGroupMutation = useMutation({
    mutationFn: (params: { name: string }) => {
      const { name } = params;
      return apiServer
        .url(`/api/vendors/${vendor.id}/groups`)
        .post({
          name,
        })
        .text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.agentGroups(vendor.id));
    },
  });

  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useClickOutside(menuRef, () => setShowAgents(false), !showAgents);

  React.useEffect(() => {
    if (showAgents) {
      inputRef.current?.focus();
    } else {
      setMembersToAdd(new Set());
      setMembersToRemove(new Set());
    }
  }, [showAgents]);

  const updateGroupMutation = useMutation({
    mutationFn: (params: { name: string; membersToAdd: string[]; membersToRemove: string[] }) => {
      const { name, membersToAdd, membersToRemove } = params;
      return apiServer
        .url(`/api/vendors/${vendor.id}/groups/${name}`)
        .post({
          name,
          membersToAdd,
          membersToRemove,
        })
        .text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.agentGroups(vendor.id));
      setShowAgents(false);
      onClose();
    },
  });
  const isNewGroup = agentGroup === undefined && !!addGroupName;
  const groupName = agentGroup ? agentGroup.name : undefined;
  return (
    <form
      className="flex flex-col gap-2.5 sm:gap-6 overflow-auto"
      onSubmit={e => {
        e.preventDefault();
        if (!updateGroupMutation.isLoading || !addGroupMutation.isLoading) {
          if (isNewGroup && groupName) {
            addGroupMutation.mutate({ name: groupName });
          }
          if (isNewGroup && addGroupName) {
            addGroupMutation.mutate({ name: addGroupName });
          }
          if (!addGroupName && groupName) {
            updateGroupMutation.mutate({
              name: groupName,
              membersToAdd: Array.from(membersToAdd),
              membersToRemove: Array.from(membersToRemove),
            });
          }
          if (addGroupName) {
            updateGroupMutation.mutate({
              name: addGroupName,
              membersToAdd: Array.from(membersToAdd),
              membersToRemove: Array.from(membersToRemove),
            });
          }
        }
      }}
    >
      <div className="font-bold font-admin text-3xl sm:text-4xl mb-2">
        {agentGroup ? "Edit Group" : "Add a Group"}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="w-full flex flex-col items-start bg-gray-100 dark:bg-black rounded-lg h-14">
          {addGroupName && <div className="text-xs text-gray-500 px-3">Group name</div>}

          <div className="w-full flex content-between">{addGroupNameInput}</div>
        </div>
      </div>
      <div className="flex w-full">
        {agents && (
          <div ref={menuRef} className="w-full relative">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col w-full border-r pr-4">
                <div className="flex flex-row text-sm justify-between">
                  <div className="flex place-items-start">Agents</div>
                  <div
                    className="flex place-items-start cursor-pointer text-blue-700 hover:text-red-500"
                    onClick={() => {
                      agentsToShow.map(x => {
                        if (agentGroup?.agents.map(m => m.id).includes(x.id)) {
                          if (membersToRemove.has(x.id)) {
                            setMembersToRemove(s => {
                              s.delete(x.id);
                              return new Set(s);
                            });
                          }
                        } else {
                          setMembersToAdd(s => {
                            s.add(x.id);
                            return new Set(s);
                          });
                        }
                      });
                    }}
                  >
                    Add all
                  </div>
                </div>
                <Combobox multiple={true} value={[]}>
                  <div className="mt-2">
                    <div className="flex bg-gray-100 dark:bg-black items-center rounded-t-xl px-2">
                      <Combobox.Label className="w-4 text-gray-500 cursor-pointer">
                        {agentsSearchValue ? (
                          <Icons.XCircleFilled />
                        ) : (
                          <Icons.Search className="w-4 h-4" />
                        )}
                      </Combobox.Label>
                      <Combobox.Input
                        ref={inputRef}
                        className={
                          "flex-1 px-2 py-3 bg-transparent outline-none text-black dark:text-white placeholder-gray-500 text-base sm:text-sm pl-2"
                        }
                        placeholder="Search agents..."
                        onChange={evt => {
                          setAgentsSearchValue(evt.target.value);
                        }}
                      />
                    </div>
                  </div>
                  <Combobox.Options
                    static={true}
                    onFocus={() => {
                      inputRef.current?.focus();
                    }}
                    className="bg-white dark:bg-black focus:outline-none"
                  >
                    {!!agentsToShow.length && (
                      <div className="max-h-72 my-2 overflow-y-auto fbr-scrollbar">
                        {agentsToShow.map(x => {
                          return (
                            <Combobox.Option
                              key={x.id}
                              value={x}
                              className='data-[headlessui-state~="active"]:bg-gray-200 data-[headlessui-state~="selected"]:bg-gray-200 dark:data-[headlessui-state~="active"]:bg-gray-600 dark:data-[headlessui-state~="selected"]:bg-gray-600'
                            >
                              <div
                                key={x.id}
                                className="flex items-center gap-x-2 p-2 hover:bg-gray-200 hover:dark:bg-gray-600 cursor-pointer"
                                onClick={() => {
                                  if (agentGroup?.agents.map(m => m.id).includes(x.id)) {
                                    if (membersToRemove.has(x.id)) {
                                      setMembersToRemove(s => {
                                        s.delete(x.id);
                                        return new Set(s);
                                      });
                                    } else {
                                      setMembersToRemove(s => {
                                        s.add(x.id);
                                        return new Set(s);
                                      });
                                    }
                                  } else {
                                    if (membersToAdd.has(x.id)) {
                                      setMembersToAdd(s => {
                                        s.delete(x.id);
                                        return new Set(s);
                                      });
                                    } else {
                                      setMembersToAdd(s => {
                                        s.add(x.id);
                                        return new Set(s);
                                      });
                                    }
                                  }
                                }}
                              >
                                <span className="text-blue-700">
                                  {(agentGroup?.agents.map(m => m.id).includes(x.id) &&
                                    !membersToRemove.has(x.id)) ||
                                  membersToAdd.has(x.id) ? (
                                    <Icons.CheckboxOn />
                                  ) : (
                                    <Icons.CheckboxOff />
                                  )}
                                </span>
                                <Avatar url={x.image_url} name={x.name} size={25} />
                                <div className="flex truncate gap-x-1 text-xs flex-col">
                                  <span className="flex-1 truncate font-semibold">{x.name}</span>
                                  <span className="flex-1 truncate text-gray-500">{x.email}</span>
                                </div>
                              </div>
                            </Combobox.Option>
                          );
                        })}
                      </div>
                    )}
                    {(((membersToAdd.size > 0 || membersToRemove.size > 0) &&
                      (addGroupName || groupName)) ||
                      (groupName &&
                        groupName !== addGroupName &&
                        addGroupName &&
                        addGroupName.trim().length > 0)) && (
                      <div className="px-2 pt-2 border-gray-200">
                        <ThickButton
                          loading={updateGroupMutation.isLoading || addGroupMutation.isLoading}
                          small={true}
                        >
                          {isNewGroup ? "Add group" : "Update"}
                        </ThickButton>
                      </div>
                    )}
                  </Combobox.Options>
                </Combobox>
              </div>
              <div className="flex w-full">
                <div className="flex flex-col w-full h-auto">
                  <div className="flex flex-row text-sm justify-between">
                    <div className="flex place-items-start">
                      {selectedAgents.length ? `Group members (${selectedAgents.length})` : ""}
                    </div>
                    <div
                      className="flex cursor-pointer text-blue-700 hover:text-red-500"
                      onClick={() => {
                        selectedAgents.map(x => {
                          if (agentGroup?.agents.map(m => m.id).includes(x.id)) {
                            setMembersToRemove(s => {
                              s.add(x.id);
                              return new Set(s);
                            });
                          } else {
                            setMembersToAdd(s => {
                              s.delete(x.id);
                              return new Set(s);
                            });
                          }
                        });
                      }}
                    >
                      {selectedAgents.length ? "Remove all" : ""}
                    </div>
                  </div>
                  {!!selectedAgents.length ? (
                    <div className="max-h-80 my-2 overflow-y-auto fbr-scrollbar">
                      {selectedAgents.map(x => {
                        return (
                          <div key={x.id} className="flex items-center py-2 justify-between">
                            <div className="flex items-center gap-x-1">
                              <Avatar url={x.image_url} name={x.name} size={25} />
                              <div className="flex flex-col text-xs gap-x-1">
                                <span className="flex-1 font-semibold">{x.name}</span>
                                <span className="flex-1 text-gray-500 break-all">{x.email}</span>
                              </div>
                            </div>
                            <div
                              className="text-gray-500 hover:text-red-500 pr-3 cursor-pointer"
                              onClick={() => {
                                if (agentGroup?.agents.map(m => m.id).includes(x.id)) {
                                  if (membersToRemove.has(x.id)) {
                                    setMembersToRemove(s => {
                                      s.delete(x.id);
                                      return new Set(s);
                                    });
                                  } else {
                                    setMembersToRemove(s => {
                                      s.add(x.id);
                                      return new Set(s);
                                    });
                                  }
                                } else {
                                  if (membersToAdd.has(x.id)) {
                                    setMembersToAdd(s => {
                                      s.delete(x.id);
                                      return new Set(s);
                                    });
                                  } else {
                                    setMembersToAdd(s => {
                                      s.add(x.id);
                                      return new Set(s);
                                    });
                                  }
                                }
                              }}
                            >
                              <Icons.Trash />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="invisible sm:visible h-full flex justify-self-start text-s">
                      <span className="self-center text-gray-500">
                        <Icons.ArrowLeft />
                      </span>
                      <span className="self-center pl-2">Add group members</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};
