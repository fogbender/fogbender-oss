import {
  type AgentGroup,
  type FeatureOptions,
  GroupDefaultIcon,
  ThickButton,
  ThinButton,
} from "fogbender-client/src/shared";
import { SelectSearch } from "fogbender-client/src/shared/ui/SelectSearch";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { Link } from "react-router-dom";

import { apiServer, queryKeys } from "../client";

export const DefaultGroupAssignments = ({
  vendorId,
  workspaceId,
}: {
  vendorId: string;
  workspaceId: string;
}) => {
  const agentGroupsData = useQuery({
    queryKey: queryKeys.agentGroups(vendorId || "N/A"),
    queryFn: () => apiServer.get(`/api/vendors/${vendorId}/groups`).json<AgentGroup[]>(),
    enabled: !!vendorId,
  });

  const { data: agentGroups } = agentGroupsData;

  const [groupSearch, setGroupSearch] = React.useState<string>();
  const [selectedGroup, setSelectedGroup] = React.useState<(typeof groupOptions)[number]>();

  const groupOptions = React.useMemo(() => {
    let groups = (agentGroups || []).map(g => {
      return {
        name: g.name,
        option: (
          <span>
            {g.name} ({g.agents.length})
          </span>
        ),
      };
    });

    if (groupSearch?.length) {
      groups = groups.filter(x =>
        x.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(groupSearch.toLowerCase().replace(/\s+/g, ""))
      );
    }

    return groups;
  }, [groupSearch, agentGroups]);

  const featureOptionsData = useQuery({
    queryKey: queryKeys.featureOptions(workspaceId),
    queryFn: () =>
      apiServer.get(`/api/workspaces/${workspaceId}/feature_options`).json<FeatureOptions>(),
  });

  const { data: featureOptions } = featureOptionsData;

  const setDefaultGroupAssignmentMutation = useMutation({
    mutationFn: (params: { groupName: string | null }) => {
      const { groupName } = params;
      return apiServer
        .url(`/api/workspaces/${workspaceId}/feature_options`)
        .post({
          featureOptions: {
            default_group_assignment: groupName,
          },
        })
        .text();
    },
    onSettled: () => {
      featureOptionsData.refetch();
      setSelectedGroup(undefined);
      setGroupSearch(undefined);
      setResetting(false);
    },
  });

  const [resetting, setResetting] = React.useState(false);

  return (
    <div className="flex flex-col gap-3 py-4 px-5 rounded-xl fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white">
      <div className="flex gap-3">
        <span className="flex flex-col">
          <span className="flex flex-col place-self-end">
            <GroupDefaultIcon size={40} />
          </span>
        </span>
        <span className="flex flex-col gap-3">
          <div>
            <div className="flex-1 font-admin mt-1 text-3xl self-center">
              Default group assignment
            </div>
            <div className="mt-8 mb-2 w-96 flex flex-col gap-3">
              <p>
                Normally, messages posted to unassigned rooms trigger notifications to all agents.
              </p>
              <p>To notify a particular group of agents instead, select a group below.</p>
              <p>
                {" "}
                You can create agent groups and update members under{" "}
                <Link className="" to={"/admin/-/team"}>
                  Team settings
                </Link>
                .
              </p>
              {featureOptions?.default_group_assignment && (
                <div className="flex items-center justify-between">
                  <span>
                    Your current default group is{" "}
                    <span className="font-semibold">{featureOptions.default_group_assignment}</span>
                    .
                  </span>
                  <ThinButton
                    small={true}
                    loading={resetting && setDefaultGroupAssignmentMutation.isLoading}
                    onClick={() => {
                      setResetting(true);
                      setDefaultGroupAssignmentMutation.mutate({ groupName: null });
                    }}
                  >
                    Reset
                  </ThinButton>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 mr-20">
            <div className="w-full flex items-center p-px rounded-md border">
              <SelectSearch
                selectedOption={selectedGroup}
                searchInputValue={groupSearch}
                setSearchInputValue={setGroupSearch}
                options={groupOptions}
                optionsClassName="w-max max-w-xs"
                wrapperClassName="w-full"
                searchInputPlaceholder="Search agent groups"
                onClearInput={() => {
                  setSelectedGroup(undefined);
                  setGroupSearch(undefined);
                }}
                onChange={option => {
                  if (option) {
                    setGroupSearch(option.name);
                    setSelectedGroup(option);
                  }
                }}
                displayValue={option => option?.name}
                searchInputTitle={selectedGroup?.name}
              />
            </div>

            <div>
              Please see{" "}
              <a href="/blog/using-groups-to-configure-oncall-agents" target="_blank">
                documentation
              </a>{" "}
              for more details.
            </div>

            <ThickButton
              small={true}
              className="mt-3 max-w-min"
              loading={selectedGroup && setDefaultGroupAssignmentMutation.isLoading}
              disabled={!selectedGroup}
              onClick={() => {
                if (selectedGroup) {
                  setDefaultGroupAssignmentMutation.mutate({ groupName: selectedGroup.name });
                }
              }}
            >
              Apply
            </ThickButton>
          </div>
        </span>
      </div>
    </div>
  );
};
