import classNames from "classnames";
import {
  type AgentGroup,
  type Integration,
  LocalStorageKeys,
  SafeLocalStorage,
  ThickButton,
  ThinButton,
  useInputWithError,
} from "fogbender-client/src/shared";
import { satisfy } from "fogbender-client/src/shared/types";
import { SelectSearch } from "fogbender-client/src/shared/ui/SelectSearch";
import type {
  APICodeChallengeVerifier,
  APIPagerdutyOauthCode,
} from "fogbender-client/src/shared/z_types";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { getServerUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../../client";
import { useWorkspaceIntegrationsQuery } from "../../useWorkspaceIntegrations";

import { IntegrationUser } from "./Utils";

export const AddPagerDutyIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [newOauthConnection, setNewOauthConnection] = React.useState<
    OauthCodeExchange & { subdomain: string }
  >();
  const userToken = newOauthConnection?.userToken || "";
  const userInfo = newOauthConnection?.userInfo; // to make typescript happy
  const subdomain = newOauthConnection?.subdomain;

  const addIntegrationMutation = useMutation({
    mutationFn: () => {
      return apiServer
        .url(`/api/workspaces/${workspace.id}/integrations/pagerduty/add-integration`)
        .post({
          userToken,
          userInfo,
          subdomain,
        })
        .res();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
    },
  });

  React.useEffect(() => {
    if (closing) {
      onDone();
    }
  }, [closing, onDone]);

  const { data: integrations } = useWorkspaceIntegrationsQuery(workspace.id);

  const ourIntegration = integrations?.find(
    i => i.type === "pagerduty" && i.project_id === subdomain
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <PagerDutyOAuth workspaceId={workspace.id} onSuccess={setNewOauthConnection} />
      </div>

      {ourIntegration && <GroupSync i={ourIntegration} />}

      {ourIntegration ? (
        <div className="mt-6 flex flex-row-reverse">
          <ThinButton
            onClick={() => {
              onDone();
            }}
          >
            OK
          </ThinButton>
        </div>
      ) : (
        <div className="mt-6 flex flex-row-reverse">
          <ThinButton
            disabled={!newOauthConnection}
            loading={addIntegrationMutation.isLoading}
            onClick={() => {
              addIntegrationMutation.mutate();
            }}
          >
            Add integration
          </ThinButton>
        </div>
      )}
    </div>
  );
};

export const ShowPagerDutyIntegration: React.FC<{
  i: Integration;
  onUpdated: () => void;
  onDeleted: () => void;
}> = ({ i, onDeleted, onUpdated }) => {
  const [newOauthConnection, setNewOauthConnection] = React.useState<
    OauthCodeExchange & { subdomain: string }
  >();

  const existingOauthUser = i.userInfo;

  const deleteIntegrationMutation = useMutation({
    mutationFn: () =>
      apiServer.url(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`).post().res(),
    onSuccess: () => {
      onDeleted();
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: () =>
      apiServer
        .url(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`)
        .post(newOauthConnection)
        .json(),
    onSuccess: () => {
      onUpdated();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div>{existingOauthUser ? "Current user:" : "Change user:"}</div>
        <PagerDutyOAuth
          userInfo={existingOauthUser}
          workspaceId={i.workspace_id}
          onSuccess={setNewOauthConnection}
        />
      </div>

      <div className="flex justify-end">
        <ThinButton
          loading={updateApiKeyMutation.isLoading}
          className="h-6 w-24 text-center"
          onClick={() => {
            if (newOauthConnection?.subdomain !== i.project_id) {
              console.error(`Subdomain must be the same (${newOauthConnection?.subdomain})`);
            } else {
              newOauthConnection && updateApiKeyMutation.mutate();
            }
          }}
          disabled={newOauthConnection === undefined}
        >
          Update
        </ThinButton>
      </div>

      <GroupSync i={i} />

      <div className="flex justify-end mt-24">
        <ThinButton
          loading={deleteIntegrationMutation.isLoading}
          className="h-6 w-24 text-center"
          onClick={() => {
            if (window.confirm("Are you sure?") === true) {
              deleteIntegrationMutation.mutate();
            }
          }}
        >
          Delete
        </ThinButton>
      </div>
    </div>
  );
};

type OauthCodeExchange = {
  userInfo: {
    email: string;
    pictureUrl: string;
    username: string;
  };
  userToken: string;
};

const PagerDutyOAuth: React.FC<{
  userInfo?: Integration["userInfo"];
  workspaceId: string;
  onSuccess: (data: OauthCodeExchange & { subdomain: string }) => void;
}> = props => {
  const { workspaceId, userInfo, onSuccess } = props;

  const codeChallengeData = useQuery(
    "PagerDuty secret",
    () => apiServer.get("/api/verifier").json<APICodeChallengeVerifier>(),
    {
      enabled: false,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const [codeChallenge, setCodeChallenge] = React.useState<APICodeChallengeVerifier>();

  React.useEffect(() => {
    return () => {
      setCodeChallenge(undefined);
    };
  }, []);

  React.useEffect(() => {
    if (codeChallengeData.status === "success") {
      const { data: cc } = codeChallengeData;
      setCodeChallenge(cc);
    } else if (!codeChallenge) {
      codeChallengeData.refetch();
    }
  }, [codeChallengeData.status]);

  const oauthMutation = useMutation({
    mutationFn: (params: { verifierEncoded: string; code: string; subdomain: string }) => {
      const { code, verifierEncoded } = params;
      return apiServer
        .url(`/api/workspaces/${workspaceId}/integrations/pagerduty/oauth-code`)
        .post(
          satisfy<APIPagerdutyOauthCode>({
            code,
            verifierEncoded,
          })
        )
        .json<OauthCodeExchange>();
    },
    onSuccess: (x, params) => {
      const { subdomain } = params;
      onSuccess({ ...x, subdomain });
    },
  });

  const userInfo0 = oauthMutation.data?.userInfo || userInfo;

  return (
    <div
      className={classNames(
        "flex-1 flex flex-col gap-y-2 sm:flex-row sm:items-center sm:gap-y-0 sm:gap-x-2",
        userInfo0 ? "justify-between" : "justify-end"
      )}
    >
      <div className="flex-1">
        <IntegrationUser userInfo={userInfo0} />
      </div>
      <div>
        <ThinButton
          onClick={() => {
            if (!codeChallenge) {
              return;
            }

            const key = "cb" + Math.random().toString();
            const queryParams = new URLSearchParams();
            queryParams.append("state", key);
            queryParams.append("codeChallenge", codeChallenge.codeChallenge);
            const url = new URL(getServerUrl());
            url.pathname = "/oauth/pagerduty-auth";
            url.search = queryParams.toString();
            const popup = window.open(url.toString(), "_blank");
            // we are going to leak event handlers here, but it's ok
            window.addEventListener("message", event => {
              if (event.origin !== getServerUrl()) {
                return;
              }
              if (popup === event.source) {
                const params = new URLSearchParams(event.data);
                const error = params.get("error_description") || params.get("error");
                const code = params.get("code");
                const subdomain = params.get("subdomain");
                if (error) {
                  console.error(error, event.data);
                  // TODO: setResult(error);
                } else if (key === params.get("state")) {
                  if (code && subdomain) {
                    oauthMutation.mutate({
                      code,
                      subdomain,
                      verifierEncoded: codeChallenge.verifierEncoded,
                    });
                  }
                }
              }
            });
          }}
        >
          {oauthMutation.data || userInfo ? "Change User" : "Connect"}
        </ThinButton>
      </div>
    </div>
  );
};

const emptyArray = [] as const;

const GroupSync = ({ i }: { i: Integration }) => {
  const syncAgentGroup = i.agent_group;

  const vendorId = SafeLocalStorage.getItem(LocalStorageKeys.DesignatedVendorId);

  const agentGroupsData = useQuery({
    queryKey: queryKeys.agentGroups(vendorId || "N/A"),
    queryFn: async () => {
      const agentGroups = await apiServer
        .get(`/api/vendors/${vendorId}/groups`)
        .json<AgentGroup[]>();
      return agentGroups.filter(x => x.name !== "all") || emptyArray;
    },
    enabled: !!vendorId,
  });

  const { data: eligibleGroups = emptyArray } = agentGroupsData;

  const [groupSearch, setGroupSearch] = React.useState<string>();
  const [selectedGroup, setSelectedGroup] = React.useState<(typeof groupOptions)[number]>();

  const groupOptions = React.useMemo(() => {
    let groups = (eligibleGroups || []).map(g => {
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
          .includes(groupSearch.toLowerCase().replace(/s+/g, ""))
      );
    }

    return groups;
  }, [groupSearch, eligibleGroups]);

  const [newGroup, newGroupInput, resetNewGroup] = useInputWithError({
    className: "!h-12 border-0",
    title: "Add an agent group",
    onEnter: () => {
      if (newGroup && newGroupOk) {
        addGroupMutation.mutate({ name: newGroup });
      }
    },
    defaultValue: eligibleGroups.length === 0 && !syncAgentGroup ? "oncall" : undefined,
  });

  const newGroupOk = newGroup.trim().length > 0;

  const addGroupMutation = useMutation({
    mutationFn: (params: { name: string }) => {
      const { name } = params;
      return apiServer
        .url(`/api/vendors/${vendorId}/groups`)
        .post({
          name,
        })
        .text();
    },
    onSuccess: () => {
      if (vendorId) {
        queryClient.invalidateQueries(queryKeys.agentGroups(vendorId));
      }
      resetNewGroup();
    },
  });

  const syncGroupMutation = useMutation({
    mutationFn: (params: { groupName: string; scheduleId: string; scheduleName: string }) => {
      const { groupName, scheduleId, scheduleName } = params;
      return apiServer
        .url(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/sync-group`)
        .post({
          groupName,
          scheduleId,
          scheduleName,
        })
        .text();
    },
    onSuccess: () => {
      if (vendorId) {
        queryClient.invalidateQueries(queryKeys.integrations(i.workspace_id));
      }
      resetNewGroup();
    },
  });

  const unsyncGroupMutation = useMutation({
    mutationFn: (params: { name: string }) => {
      const { name } = params;
      return apiServer
        .url(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/unsync-group`)
        .post({
          groupName: name,
        })
        .text();
    },
    onSuccess: () => {
      if (vendorId) {
        queryClient.invalidateQueries(queryKeys.integrations(i.workspace_id));
      }
      resetNewGroup();
    },
  });

  const pagerDutySchedulesData = useQuery({
    queryKey: queryKeys.pagerDurySchedules(i.workspace_id, i.project_id),
    queryFn: () =>
      apiServer
        .url(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/list-schedules`)
        .post()
        .json<{ id: string; name: string }[]>(),
    enabled: !!vendorId,
  });

  const { data: pagerDutySchedules } = pagerDutySchedulesData;

  const [scheduleSearch, setScheduleSearch] = React.useState<string>();
  const [selectedSchedule, setSelectedSchedule] =
    React.useState<(typeof scheduleOptions)[number]>();

  const scheduleOptions = React.useMemo(() => {
    let schedules = (pagerDutySchedules || []).map(s => {
      return {
        name: `${s.name} (${s.id})`,
        id: s.id,
        option: (
          <span>
            {s.name} ({s.id})
          </span>
        ),
      };
    });

    if (scheduleSearch?.length) {
      schedules = schedules.filter(x =>
        x.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(scheduleSearch.toLowerCase().replace(/s+/g, ""))
      );
    }

    return schedules;
  }, [scheduleSearch, pagerDutySchedules]);

  return (
    <>
      {syncAgentGroup ? (
        <div className="w-full flex items-center gap-2">
          <div>
            <p>
              This integraton is configured to sync the list of on-call PagerDuty users from{" "}
              schedule <span className="font-semibold">{i.schedule_name}</span> in{" "}
              <span className="font-semibold">{i.project_id}</span> with agent group{" "}
              <span className="font-semibold">{syncAgentGroup}</span>.
            </p>
          </div>
          <ThickButton
            loading={unsyncGroupMutation.isLoading}
            className={classNames(
              "h-12",
              "transition-opacity duration-100 ease-in",
              syncAgentGroup ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            disabled={!syncAgentGroup}
            onClick={() => {
              unsyncGroupMutation.mutate({ name: syncAgentGroup });
            }}
          >
            Unsync
          </ThickButton>
        </div>
      ) : eligibleGroups?.length > 0 ? (
        <div>
          To sync the list of on-call PagerDuty users from a specific schedule with an agent group
          in Fogbender, select your schedule and group below. Note that for an existing group,
          membership will be overwritten by this integration.
        </div>
      ) : (
        <div>
          To sync the list of on-call PagerDuty users with an agent group in Fogbender, create an
          agent group below.
        </div>
      )}

      {!syncAgentGroup && (
        <div className="w-full flex items-center gap-2">
          <div className="grow">{newGroupInput}</div>
          <ThickButton
            loading={addGroupMutation.isLoading}
            className={classNames(
              "h-12",
              "transition-opacity duration-100 ease-in",
              newGroup ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            disabled={!newGroupOk}
            onClick={() => {
              addGroupMutation.mutate({ name: newGroup });
            }}
          >
            Add
          </ThickButton>
        </div>
      )}

      {!syncAgentGroup && eligibleGroups?.length > 0 && (
        <>
          <div className="w-full flex gap-2 h-12">
            <div className="w-full flex items-center p-px rounded-md border">
              <SelectSearch
                selectedOption={selectedSchedule}
                searchInputValue={scheduleSearch}
                setSearchInputValue={setScheduleSearch}
                options={scheduleOptions}
                optionsClassName="w-max max-w-xs"
                wrapperClassName="w-full"
                searchInputPlaceholder="Search PagerDuty schedules"
                onClearInput={() => {
                  setSelectedSchedule(undefined);
                  setScheduleSearch("");
                }}
                onChange={option => {
                  if (option) {
                    setScheduleSearch(option.name);
                    setSelectedSchedule(option);
                  }
                }}
                displayValue={option => option?.name}
                searchInputTitle={selectedSchedule?.name}
              />
            </div>
            <ThickButton
              loading={addGroupMutation.isLoading}
              className="h-12 invisible cursor-default"
            >
              Add
            </ThickButton>
          </div>
          <div className="w-full flex gap-2">
            <div className="w-full flex items-center p-px rounded-md border">
              <SelectSearch
                selectedOption={selectedGroup}
                searchInputValue={groupSearch}
                setSearchInputValue={setGroupSearch}
                options={groupOptions}
                optionsClassName="w-max max-w-xs"
                wrapperClassName="w-full"
                searchInputPlaceholder="Search Fogbender agent groups"
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
            <ThickButton
              loading={syncGroupMutation.isLoading}
              className={classNames(
                "h-12",
                "transition-opacity duration-100 ease-in",
                selectedGroup ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              disabled={!selectedGroup || !selectedSchedule}
              onClick={() => {
                if (selectedGroup && selectedSchedule) {
                  syncGroupMutation.mutate({
                    groupName: selectedGroup.name,
                    scheduleId: selectedSchedule.id,
                    scheduleName: selectedSchedule.name,
                  });
                }
              }}
            >
              Sync
            </ThickButton>
          </div>
        </>
      )}
    </>
  );
};
