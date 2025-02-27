import classNames from "classnames";
import {
  Icons,
  ThinButton,
  isInternalHelpdesk,
  type Customer,
  type Integration,
} from "fogbender-client/src/shared";
import { SelectSearch } from "fogbender-client/src/shared/ui/SelectSearch";
import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getServerUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
// import { FontAwesomeHashtag } from "../../../shared/font-awesome/Hashtag";
import { CgHashtag as Hashtag } from "react-icons/cg";
import { FontAwesomeLock } from "../../../shared/font-awesome/Lock";
import { apiServer, queryClient, queryKeys } from "../../client";
import { fetchServerApiPost, filterOutResponse } from "../../useServerApi";

import {
  IntegrationUser,
  operationStatusMutation0,
  operationStatusQuery,
  readOnlyItem,
} from "./Utils";

export const AddSlackIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [newOauthConnection, setNewOauthConnection] = React.useState<OauthCodeExchange>();
  const userToken = newOauthConnection?.userToken || "";
  const userInfo = newOauthConnection?.userInfo; // to make typescript happy

  const checkAccessQuery = useQuery({
    queryKey: ["slack_user_token", workspace.id],
    queryFn: async () => {
      const url = `/api/workspaces/${workspace.id}/integrations/slack/check-access`;

      return await apiServer
        .url(url)
        .post(newOauthConnection)
        .json<{ team: { id: string; name: string; url: string } }>();
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: !!userToken,
  });

  const createChannelQuery = useQuery({
    queryKey: ["create_channel", workspace.id],
    queryFn: async () => {
      const url = `/api/workspaces/${workspace.id}/integrations/slack/create-channel`;

      return await apiServer.url(url).post(newOauthConnection).json<{ channel: { id: string } }>();
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: checkAccessQuery.isSuccess,
  });

  const inviteToChannelQuery = useQuery({
    queryKey: ["invite_to_channel", workspace.id],
    queryFn: async () => {
      if (createChannelQuery.data && userInfo) {
        const url = `/api/workspaces/${workspace.id}/integrations/slack/invite-to-channel`;
        const {
          channel: { id: channelId },
        } = createChannelQuery.data;
        const userId = userInfo.userId;

        return await apiServer
          .url(url)
          .post({ ...newOauthConnection, channelId, userId })
          .json();
      }

      return;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: createChannelQuery.isSuccess,
  });

  const addIntegrationQuery = useQuery({
    queryKey: ["add_slack_integration", workspace.id],
    queryFn: async () => {
      if (checkAccessQuery.data && createChannelQuery.data && userInfo) {
        const url = `/api/workspaces/${workspace.id}/integrations/slack/add-integration`;
        const {
          team: { id: projectId, name: projectName, url: projectUrl },
        } = checkAccessQuery.data;
        const {
          channel: { id: channelId },
        } = createChannelQuery.data;

        const res = await apiServer
          .url(url)
          .post({ ...newOauthConnection, projectId, projectName, projectUrl, channelId })
          .res();

        onDone();

        return res;
      } else {
        return;
      }
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: inviteToChannelQuery.isSuccess,
  });

  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  const teamAnchor = checkAccessQuery.data ? (
    <a
      href={checkAccessQuery?.data.team.url}
      className="fog:text-link"
      title={checkAccessQuery?.data.team.name}
      target="_blank"
      rel="noopener"
    >
      {checkAccessQuery.data.team.name}
    </a>
  ) : null;

  const creatingText = () => (
    <span className="flex gap-1">
      Creating{" "}
      <b className="flex items-center gap-px">
        <Hashtag size={18} />
        fogbender
      </b>{" "}
      channel
    </span>
  );

  const invitingText = () => (
    <span>
      Adding <b>{userInfo?.username}</b> to channel
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start flex items-center gap-4">
        <SlackOauth workspaceId={workspace.id} onSuccess={setNewOauthConnection} />
      </div>

      {teamAnchor && readOnlyItem("Slack workspace:", teamAnchor)}

      {operationStatusQuery("Checking access", checkAccessQuery)}
      {operationStatusQuery(creatingText(), createChannelQuery)}
      {operationStatusQuery(invitingText(), inviteToChannelQuery)}
      {operationStatusQuery("Adding integration", addIntegrationQuery)}
    </div>
  );
};

type SharedChannel = {
  id: string;
  name: string;
  num_members: number;
  is_private: boolean;
  connected_team_names: string[];
  context_team_id: string;
};

type SlackChannel = SharedChannel;

export const ShowSlackIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const linkedChannelInfoQuery = useQuery({
    queryKey: ["linked_channel_info", i.id],
    queryFn: async () => {
      const url = `/api/workspaces/${i.workspace_id}/integrations/${i.id}/linked-channel-info`;

      return await apiServer.url(url).post(newOauthConnection).json<{ channel: SlackChannel }>();
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: !!i,
  });

  const linkedChannel = linkedChannelInfoQuery?.data?.channel;

  const updateApiKeyMutation = useMutation({
    mutationFn: (params: { newOauthConnection: OauthCodeExchange }) => {
      const { newOauthConnection } = params;
      return fetch(
        `${getServerUrl()}/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify(newOauthConnection),
        }
      );
    },
    onSuccess: async (r, params) => {
      if (r.status === 204) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sharedChannels(i.workspace_id) });
      } else {
        console.error(`Couldn't update api key ${params}`);
      }
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async () => {
      const url = `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`;
      return await apiServer.url(url).post().res();
    },
    onSuccess: () => {
      onDeleted();
    },
  });

  // TODO: we expect this value to be always set after all users migrate, so let's remove this check in July 2022
  const existingOauthUser = i.userInfo;

  const [newOauthConnection, setNewOauthConnection] = React.useState<OauthCodeExchange>();

  /* --- shared channels --- */

  // const { data: channels, status: channelsStatus } = useQuery<SharedChannel[]>(
  const { data: channels } = useQuery<SharedChannel[]>({
    queryKey: queryKeys.sharedChannels(i.workspace_id),
    queryFn: async () =>
      fetch(
        `${getServerUrl()}/api/workspaces/${i.workspace_id}/integrations/${
          i.id
        }/list-shared-channels`,
        {
          credentials: "include",
          method: "POST",
        }
      ).then(res => res.status === 200 && res.json()),
    enabled: i.workspace_id !== undefined,
  });

  const [sharedChannelSearch, setSharedChannelSearch] = React.useState<string>();

  const [selectedChannel, setSelectedChannel] =
    React.useState<(typeof sharedChannelsOptions)[number]>();

  const sharedChannelsOptions = React.useMemo(() => {
    let sharedChannels = (channels || []).map(channel => {
      return {
        channelId: channel.id,
        channelName: channel.name,
        option: <Channel channel={channel} withTeam={true} />,
      };
    });

    if (sharedChannelSearch?.length) {
      sharedChannels = sharedChannels.filter(channel =>
        channel.channelName
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(sharedChannelSearch.toLowerCase().replace(/\s+/g, ""))
      );
    }
    return sharedChannels;
  }, [sharedChannelSearch, channels]);

  const { data: allCustomers } = useQuery<Customer[]>({
    queryKey: queryKeys.customers(i.workspace_id),
    queryFn: async () =>
      fetch(`${getServerUrl()}/api/workspaces/${i.workspace_id}/customers`, {
        credentials: "include",
      }).then(res => res.status === 200 && res.json()),
    enabled: i.workspace_id !== undefined,
  });

  const [customersSearch, setCustomersSearch] = React.useState<string>();

  const customersOptions = React.useMemo(() => {
    let customers = (allCustomers || [])
      .filter(customer => !isInternalHelpdesk(customer.name))
      .map(customer => {
        return {
          helpdeskId: customer.helpdeskId,
          option: `${customer.name} (${customer.externalUid})`,
        };
      });

    if (customersSearch?.length) {
      customers = customers.filter(customer =>
        customer.option
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(customersSearch.toLowerCase().replace(/\s+/g, ""))
      );
    }
    return customers;
  }, [allCustomers, customersSearch]);

  const [selectedCustomer, setSelectedCustomer] =
    React.useState<(typeof customersOptions)[number]>();

  const [channelHelpdeskAssociation, setChannelHelpdeskAssociation] = React.useState<{
    channelId?: string;
    helpdeskId?: string;
  }>();

  const [associationInProgress, setAssociationInProgress] = React.useState(false);

  const associateMutation = useMutation({
    mutationFn: async (params: { sharedChannelId: string; helpdeskId: string | null }) => {
      setAssociationInProgress(true);
      const { sharedChannelId, helpdeskId } = params;
      return fetch(
        `${getServerUrl()}/api/workspaces/${i.workspace_id}/integrations/${
          i.id
        }/associate-shared-channel-with-helpdesk`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ sharedChannelId, helpdeskId }),
        }
      );
    },
    onSuccess: async (r, params) => {
      if (r.status === 204) {
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations(i.workspace_id) });
      } else {
        console.error(`Couldn't associate ${params}`);
      }

      setChannelHelpdeskAssociation(undefined);

      setSharedChannelSearch(undefined);
      setSelectedChannel(undefined);

      setCustomersSearch(undefined);
      setSelectedCustomer(undefined);

      setAssociationInProgress(false);
    },
  });

  const channelIdToChannel = (channelId: string) =>
    (channels || []).find(channel => channel.id === channelId);

  const helpdeskIdToCustomerName = (helpdeskId: string) =>
    (allCustomers || []).find(customer => customer.helpdeskId === helpdeskId)?.name;

  const helpdeskIdToCustomerId = (helpdeskId: string) =>
    (allCustomers || []).find(customer => customer.helpdeskId === helpdeskId)?.externalUid;

  const createAssociationDisabled =
    (!!channelHelpdeskAssociation?.channelId && !!channelHelpdeskAssociation?.helpdeskId) === false;

  return (
    <div className="flex flex-col gap-8">
      <table className="table table-sm">
        <tbody>
          <TableRow item={"Workspace"} value={i.project_name} />
          <TableRow
            item={"Workspace URL"}
            value={
              <a className="fog:text-link" target="_blank" rel="noopener" href={i.project_url}>
                {i.project_url}
              </a>
            }
          />
          <TableRow
            item={existingOauthUser ? "Authenticated user" : "Connect new user"}
            value={
              <SlackOauth
                userInfo={existingOauthUser}
                workspaceId={i.workspace_id}
                onSuccess={setNewOauthConnection}
              />
            }
          />
          <TableRow
            item={"Connected channel"}
            value={linkedChannel && <Channel channel={linkedChannel} />}
          />
        </tbody>
      </table>
      <div className="ml-2 flex flex-col gap-4">
        {newOauthConnection && (
          <ThinButton
            className="h-6 w-48 text-center"
            onClick={() => {
              newOauthConnection && updateApiKeyMutation.mutate({ newOauthConnection });
            }}
            loading={updateApiKeyMutation.isPending}
            disabled={newOauthConnection === undefined}
          >
            Update integration
          </ThinButton>
        )}
        <ThinButton
          className="h-6 w-48 text-center"
          onClick={() => {
            if (
              window.confirm(
                "Warning: This will remove all shared channel-customer mappings. Are you sure?"
              ) === true
            ) {
              deleteIntegrationMutation.mutate();
            }
          }}
        >
          Delete integration
        </ThinButton>
      </div>
      <div className="w-full flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-4 bg-gray-100 dark:bg-brand-dark-bg p-2 rounded-lg">
            <div className="text-center border-b border-gray-500">
              Active shared channel-customer associations
            </div>
            <div className="flex flex-col gap-2 text-sm overflow-auto relative">
              <table className="table-fixed w-full">
                <thead>
                  <tr className="text-left">
                    <th>Channel</th>
                    <th>Connected teams</th>
                    <th>Customer</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {(i.shared_channel_helpdesk_associations || []).map(
                    ({ shared_channel_id, helpdesk_id }, i) => {
                      const channel = channelIdToChannel(shared_channel_id);
                      const customerName = helpdeskIdToCustomerName(helpdesk_id);
                      const customerId = helpdeskIdToCustomerId(helpdesk_id);

                      return (
                        <tr key={i}>
                          <td>
                            {channel?.name ? (
                              <Channel channel={channel} />
                            ) : (
                              <span>
                                <Icons.Spinner className="w-4 text-blue-500" />
                              </span>
                            )}
                          </td>
                          <td>
                            {channel?.connected_team_names ? (
                              <span>{channel?.connected_team_names.join(", ")}</span>
                            ) : (
                              <span>
                                <Icons.Spinner className="w-4 text-blue-500" />
                              </span>
                            )}
                          </td>
                          <td>
                            {customerName} ({customerId})
                          </td>
                          <td>
                            <span
                              className="cursor-pointer text-gray-500 hover:text-brand-red-500"
                              onClick={() => {
                                if (channel?.id) {
                                  associateMutation.mutate({
                                    sharedChannelId: channel?.id,
                                    helpdeskId: null,
                                  });
                                }
                              }}
                            >
                              <Icons.XClose className="w-4" />
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-center border-b border-gray-500">Create a new association</div>
            <div className="flex items-center justify-between gap-1">
              <SelectSearch
                selectedOption={selectedChannel}
                searchInputValue={sharedChannelSearch}
                setSearchInputValue={setSharedChannelSearch}
                options={sharedChannelsOptions}
                optionsClassName="w-max max-w-xs"
                wrapperClassName="w-48 rounded-md"
                searchInputPlaceholder="Search channels"
                onClearInput={() => {
                  setChannelHelpdeskAssociation(x => ({ ...x, channelId: undefined }));
                  setSelectedChannel(undefined);
                  setSharedChannelSearch(undefined);
                }}
                onChange={option => {
                  if (option) {
                    setChannelHelpdeskAssociation(x => {
                      return { ...x, channelId: option.channelId };
                    });
                    setSharedChannelSearch(option.channelName);
                    setSelectedChannel(option);
                  }
                }}
                displayValue={option => option?.channelName}
                searchInputTitle={selectedChannel?.channelName}
              />
              <SelectSearch
                selectedOption={selectedCustomer}
                searchInputValue={customersSearch}
                setSearchInputValue={setCustomersSearch}
                options={customersOptions}
                optionsClassName="w-max max-w-xs"
                wrapperClassName="w-48 rounded-md"
                searchInputPlaceholder="Search customers"
                onClearInput={() => {
                  setChannelHelpdeskAssociation(x => ({ ...x, helpdeskId: undefined }));
                  setSelectedCustomer(undefined);
                  setCustomersSearch(undefined);
                }}
                onChange={option => {
                  if (option) {
                    setCustomersSearch(option.option);
                    setSelectedCustomer(option);
                    setChannelHelpdeskAssociation(x => {
                      return { ...x, helpdeskId: option.helpdeskId };
                    });
                  }
                }}
                displayValue={option => option?.option}
                searchInputTitle={selectedCustomer?.option}
              />
              <ThinButton
                className={classNames(
                  "self-center h-6 w-24 text-center",
                  createAssociationDisabled && "text-gray-300"
                )}
                onClick={() => {
                  if (channelHelpdeskAssociation) {
                    const { channelId, helpdeskId } = channelHelpdeskAssociation;

                    if (channelId && helpdeskId) {
                      associateMutation.mutate({
                        sharedChannelId: channelId,
                        helpdeskId,
                      });
                    }
                  }
                }}
                loading={associationInProgress}
                disabled={createAssociationDisabled}
              >
                Create
              </ThinButton>
            </div>
          </div>
        </div>
      </div>
      <div>{operationStatusMutation0("Deleting", deleteIntegrationMutation)}</div>
    </div>
  );
};

const TableRow = ({ item, value }: { item: React.ReactNode; value: React.ReactNode }) => {
  return (
    <tr>
      <td>{item}</td>
      <td className="font-semibold">{value}</td>
    </tr>
  );
};

type OauthCodeExchange = {
  userInfo: {
    email: string;
    pictureUrl: string;
    userId: string;
    username: string;
  };
  userToken: string;
};

const SlackOauth: React.FC<{
  userInfo?: Integration["userInfo"];
  workspaceId: string;
  onSuccess: (data: OauthCodeExchange) => void;
}> = props => {
  const { workspaceId, userInfo } = props;
  const oauthMutation = useMutation({
    mutationFn: async (code: string) => {
      return fetchServerApiPost<OauthCodeExchange>(
        `/api/workspaces/${workspaceId}/integrations/slack/oauth-code`,
        {
          code,
        }
      ).then(filterOutResponse);
    },
    onSuccess: x => {
      props.onSuccess(x);
    },
  });

  const userInfo0 = oauthMutation.data?.userInfo || userInfo;

  return (
    <div
      className={classNames(
        "flex-1 flex items-center gap-4",
        userInfo0 ? "justify-between" : "justify-end"
      )}
    >
      <IntegrationUser userInfo={userInfo0} />
      <ThinButton
        className="h-11 w-36 text-center"
        onClick={() => {
          const key = "cb" + Math.random().toString();
          const queryParams = new URLSearchParams();
          queryParams.append("state", key);
          const url = new URL(getServerUrl());
          url.pathname = "/oauth/slack-auth";
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
              if (error) {
                console.error(error, event.data);
                // TODO: setResult(error);
              } else if (key === params.get("state")) {
                const code = params.get("code");
                if (code) {
                  oauthMutation.mutate(code);
                }
              }
            }
          });
        }}
      >
        {oauthMutation.data || userInfo ? "Change User" : "Connect"}
      </ThinButton>
    </div>
  );
};

const Channel = ({ channel, withTeam }: { channel: SlackChannel; withTeam?: boolean }) => {
  return (
    <a
      className="fog:text-link"
      href={`https://slack.com/app_redirect?team=${channel.context_team_id}&channel=${channel.id}`}
      target="_blank"
      rel="noopener"
    >
      <div className="flex items-center gap-px">
        {channel.is_private ? (
          <span>
            <FontAwesomeLock className="fa-fw self-center" />
          </span>
        ) : (
          <span>
            <Hashtag size={18} />
          </span>
        )}
        <span>
          <span className="font-semibold">{channel.name}</span>
          {withTeam && <span> / {channel.connected_team_names.join(", ")}</span>}
        </span>
      </div>
    </a>
  );
};
