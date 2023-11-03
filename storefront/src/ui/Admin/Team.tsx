import classNames from "classnames";
import {
  type Agent,
  type AgentRole,
  Avatar,
  formatTs,
  Icons,
  Modal,
  renderTag,
  ThickButton,
  ThinButton,
  useInput,
  useInputWithError,
} from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Select } from "fogbender-client/src/shared/ui/Select";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { useSelector } from "react-redux";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import UserPlus from "../../assets/userplus.svg";
import { getServerUrl } from "../../config";
import { getQueryParam } from "../../params";
import { type Invite, type Vendor } from "../../redux/adminApi";
import { getAuthenticatedAgentId } from "../../redux/session";
import { apiServer, queryClient, queryKeys } from "../client";
import { DeleteInvitedModal } from "../components/modals/DeleteInvitedModal";
import { DeleteMemberModal } from "../components/modals/DeleteMemberModal";
import { fetchServerApiPost } from "../useServerApi";
import { useVerifiedDomains, type VerifiedDomain } from "../useVerifiedDomains";

import { ScheduleOverview } from "./agent-schedules/ScheduleOverview";
import { Schedules } from "./agent-schedules/Schedules";
import { AgentGroups } from "./AgentGroups";

export const Team: React.FC<{
  vendor: Vendor;
}> = ({ vendor }) => {
  const ourAgentId = useSelector(getAuthenticatedAgentId);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents(vendor.id),
    queryFn: () => apiServer.get(`/api/vendors/${vendor.id}/agents`).json<Agent[]>(),
  });

  const ourAgent = React.useMemo(
    () => agents?.find(a => a.id === ourAgentId),
    [agents, ourAgentId]
  );

  const { data: invites } = useQuery({
    queryKey: queryKeys.invites(vendor.id),
    queryFn: () => apiServer.get(`/api/vendors/${vendor.id}/invites`).json<Invite[]>(),
    enabled: (ourAgent?.role && ["owner", "admin"].includes(ourAgent.role)) === true,
  });

  const invitesAndAgents = React.useMemo(() => {
    if (agents && invites && ourAgent && ["admin", "owner"].includes(ourAgent?.role ?? "")) {
      return [...invites, ...agents];
    } else if (agents) {
      return agents;
    } else {
      return [];
    }
  }, [invites, agents, ourAgent]);

  return (
    <Routes>
      <Route
        path="*"
        element={
          <>
            <TeamTabs vendor={vendor} tab="team" />
            {ourAgent && (
              <>
                <TeamMembers
                  invitesAndAgents={invitesAndAgents}
                  ourAgent={ourAgent}
                  vendor={vendor}
                  agents={agents}
                />
                {["owner", "admin"].includes(ourAgent.role) && (
                  <VerifiedDomains authenticatedAgent={ourAgent} vendor={vendor} />
                )}
              </>
            )}
          </>
        }
      />
      <Route
        path="groups"
        element={
          <>
            <TeamTabs vendor={vendor} tab="groups" />
            {ourAgentId && ourAgent && (
              <AgentGroups vendor={vendor} ourId={ourAgentId} ourRole={ourAgent.role} />
            )}
          </>
        }
      />
      {vendor.agent_scheduling_enabled && (
        <>
          <Route
            path="schedules"
            element={
              <div className="flex flex-col gap-8">
                <TeamTabs vendor={vendor} tab="schedules" />
                {ourAgentId && ourAgent && <Schedules vendor={vendor} ourId={ourAgentId} />}
              </div>
            }
          />
          <Route
            path="schedule-overview"
            element={
              <div className="flex flex-col gap-8">
                <TeamTabs vendor={vendor} tab="schedule-overview" />
                {ourAgentId && ourAgent && <ScheduleOverview />}
              </div>
            }
          />
        </>
      )}
    </Routes>
  );
};

const TeamTabs: React.FC<{
  tab: "team" | "groups" | "schedules" | "schedule-overview";
  vendor: Vendor;
}> = ({ tab, vendor }) => {
  const isSecondaryTab = ["groups", "schedules", "schedule-overview"].includes(tab);

  const tabs = [
    { name: "team", to: tab === "team" ? "." : ".." },
    { name: "groups", to: tab === "groups" ? "." : isSecondaryTab ? "../groups" : "groups" },
  ];

  if (vendor.agent_scheduling_enabled) {
    tabs.push(
      {
        name: "schedules",
        to: tab === "schedules" ? "." : isSecondaryTab ? "../schedules" : "schedules",
      },
      {
        name: "schedule-overview",
        to:
          tab === "schedule-overview"
            ? "."
            : isSecondaryTab
            ? "../schedule-overview"
            : "schedule-overview",
      }
    );
  }

  return (
    <div className="w-full bg-white rounded-xl fog:box-shadow-s flex flex-col gap-4">
      <div className="w-full md:w-auto flex flex-wrap">
        {tabs.map(t => {
          const tabTitle = t.name.substring(0, 1).toUpperCase() + t.name.substring(1);
          return (
            <Link key={t.name} to={t.to} className="flex-1 md:flex-none no-underline">
              <div
                className={classNames(
                  "flex-1 md:flex-none fog:text-header3 justify-center leading-5 ml-4 px-6 py-2 text-center whitespace-nowrap cursor-pointer",
                  tab === t.name
                    ? "rounded-t-md border-brand-orange-500 border-b-5 text-black"
                    : "text-blue-700 hover:text-red-500"
                )}
              >
                {tabTitle}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const TeamMembers: React.FC<{
  invitesAndAgents: (Agent | Invite)[];
  ourAgent: Agent | undefined;
  vendor: Vendor;
  agents: Agent[] | undefined;
}> = props => {
  const location = useLocation();
  const isInviteModalOpen = getQueryParam(location.search, "openInviteModal") || false;
  const { invitesAndAgents, ourAgent, vendor, agents } = props;
  const ourAgentId = useSelector(getAuthenticatedAgentId);
  const [sendNewInvite, setSendNewInvite] = React.useState(isInviteModalOpen === "true");
  const [inviteToDelete, setInviteToDelete] = React.useState<Invite>();
  const [agentToDelete, setAgentToDelete] = React.useState<Agent>();
  const navigate = useNavigate();
  const renderEmailOrTag = (agent: Agent) => {
    if (agent.role === "app") {
      const appTag = agent.tags.find(t => t.name === agent.email);
      if (appTag !== undefined) {
        return renderTag(appTag);
      } else {
        return agent.email;
      }
    } else {
      return agent.email;
    }
  };

  React.useEffect(() => {
    const isOpen = getQueryParam(location.search, "openInviteModal") || false;
    setSendNewInvite(isOpen === "true");
  }, [location]);

  return (
    <div className="w-full bg-white p-4 rounded-xl fog:box-shadow-s flex flex-col gap-4 pl-8">
      {sendNewInvite && (
        <Modal
          onClose={() => {
            setSendNewInvite(false);
            navigate(location.pathname, { replace: true });
          }}
        >
          <SendInviteForm vendorId={vendor.id} onClose={() => setSendNewInvite(false)} />
        </Modal>
      )}
      <div className="w-full flex flex-col gap-2 overflow-auto">
        <div className="flex justify-between items-center">
          <ThickButton
            className="h-12"
            onClick={() => {
              setSendNewInvite(true);
            }}
          >
            Invite teammate
          </ThickButton>
        </div>
        <div className="min-h-[22rem]">
          <table className="table-auto w-full my-2 border-separate border-spacing-y-2">
            <tbody>
              {invitesAndAgents?.map((member, i) => (
                <tr key={i}>
                  <td className="border-t whitespace-nowrap lg:whitespace-normal">
                    <div className="flex gap-3">
                      <div className="flex justify-center mt-4">
                        {isInvite(member) ? (
                          <Avatar
                            url={UserPlus}
                            imageSize={14}
                            className="w-4"
                            bgClassName="bg-gray-200"
                          />
                        ) : (
                          <Avatar size={35} url={member.image_url} name={member.name} />
                        )}
                      </div>

                      <div className="flex flex-col self-center min-w-max mt-4 pr-2">
                        <div className="gap-1">
                          {isInvite(member) ? (
                            <span>Invited by {member.from_agent.name}</span>
                          ) : (
                            <span>{member.name}</span>
                          )}
                        </div>
                        {!isInvite(member) && (
                          <div className="text-gray-500 text-xs">
                            Joined at {formatTs(new Date(member.inserted_at).getTime() * 1000)}
                          </div>
                        )}
                        {isInvite(member) && (
                          <div className="text-gray-500 text-xs">
                            At {formatTs(new Date(member.inserted_at).getTime() * 1000)}
                          </div>
                        )}
                        {!isInvite(member) && ourAgentId === member.id && (
                          <div className="w-full text-left">
                            <span className="whitespace-nowrap self-center text-white text-xs bg-green-500 rounded-lg py-0.5 px-1">
                              It&rsquo;s you!
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="border-t">
                    {isInvite(member) ? (
                      <span>{member.email}</span>
                    ) : (
                      <span>{renderEmailOrTag(member)}</span>
                    )}
                  </td>
                  <td className="border-t">
                    {member.role === "app" ? (
                      <div>Application</div>
                    ) : (
                      <ChangeRoleButton member={member} ourAgent={ourAgent} vendor={vendor} />
                    )}
                  </td>
                  <td className="border-t">
                    <span
                      title="Remove"
                      className="text-gray-500 hover:text-red-500 cursor-pointer flex items-center justify-end"
                      onClick={e => {
                        e.stopPropagation();

                        if (isInvite(member)) {
                          setInviteToDelete(member);
                        } else {
                          setAgentToDelete(member);
                        }
                      }}
                    >
                      <Icons.Trash className="w-5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {agentToDelete && (
        <DeleteMemberModal
          agents={agents}
          isOpen={true}
          onClose={() => {
            if (agentToDelete.id === ourAgentId) {
              navigate("/admin");
            }
            setAgentToDelete(undefined);
          }}
          agent={agentToDelete}
          vendor={vendor}
        />
      )}
      {inviteToDelete && (
        <DeleteInvitedModal
          isOpen={true}
          onClose={() => setInviteToDelete(undefined)}
          invite={inviteToDelete}
          vendorId={vendor.id}
        />
      )}
    </div>
  );
};

const ChangeRoleButton: React.FC<{
  member: Agent | Invite;
  ourAgent: Agent | undefined;
  vendor: Vendor;
}> = props => {
  const { member, ourAgent, vendor } = props;
  const [newRole, setNewRole] = React.useState<AgentRole>();

  const closeModal = React.useCallback(() => {
    setNewRole(undefined);
  }, []);

  const options = isInvite(member) ? nonOwnerRoleOptions : roleOptions;

  const selectedOption = options.find(o => o.id === member.role);

  return (
    <>
      {ourAgent !== undefined && newRole !== undefined && (
        <Modal onClose={closeModal}>
          <UpdateRoleModal
            member={member}
            newRole={newRole}
            vendor={vendor}
            onClose={closeModal}
            ourRole={ourAgent.role}
          />
        </Modal>
      )}
      <Select
        onChange={({ id }) => setNewRole(id)}
        options={options}
        selectedOption={selectedOption}
        title="Role"
      />
    </>
  );
};

const InputClassName =
  "w-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose";

const SendInviteForm: React.FC<{
  vendorId: string;
  onClose: () => void;
}> = ({ vendorId, onClose }) => {
  const [inviteEmail, inviteEmailInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-full",
    placeholder: "Email",
    autoFocus: true,
  });

  const inviteEmailOk = React.useMemo(() => {
    if (inviteEmail.trim().length === 0) {
      return undefined;
    } else {
      return true;
    }
  }, [inviteEmail]);

  const formOk = inviteEmailOk === true;

  const [selectedRoleOption, setSelectedRoleOption] = React.useState(agentRoleOption);
  const memberRole = selectedRoleOption?.id;

  const sendInviteRes = useMutation<
    void,
    | {
        code: "permission" | "invalid_email";
        minimum_role?: string;
        current_role?: string;
      }
    | Error
  >(
    async () => {
      const res = await fetchServerApiPost<Response>("/api/invites", {
        email: inviteEmail,
        vendor_id: vendorId,
        role: memberRole,
      });
      if (res.status !== 204) {
        const { error } = await res.json();
        throw error;
      }
    },
    {
      onSuccess: () => {
        onClose();
      },
      onSettled: () => {
        queryClient.invalidateQueries(["invites", vendorId]);
        // invalidate the cache for invites send to self just in case if user invites self
        queryClient.invalidateQueries("vendor_invites");
      },
    }
  );
  const renderInviteError = React.useCallback(() => {
    if (sendInviteRes.error === null || !("code" in sendInviteRes.error)) {
      return (
        <div className="self-center text-brand-red-500">
          {sendInviteRes.error !== null && (
            <span>
              Sorry, this shouldn't have happened! Please ping us in{" "}
              <a href={`/admin/vendor/${vendorId}/support`} target="_blank" rel="noopener">
                Fogbender support
              </a>
            </span>
          )}
        </div>
      );
    }
    if (sendInviteRes?.error.code === "permission") {
      return (
        <div className="self-center text-brand-red-500">
          Only admins and owners can invite teammates (your current role is{" "}
          <span className="font-semibold capitalize">{sendInviteRes.error.current_role}</span>).
        </div>
      );
    } else {
      return (
        <div className="self-center text-brand-red-500">
          {sendInviteRes.error.code === "invalid_email"
            ? "Invalid email"
            : sendInviteRes?.error.code}
        </div>
      );
    }
  }, [sendInviteRes, vendorId]);

  return (
    <form
      className="flex flex-col gap-2.5 sm:gap-6"
      onSubmit={e => {
        e.preventDefault();
        formOk === true && sendInviteRes.mutate();
      }}
    >
      <div className="font-bold font-admin text-3xl sm:text-4xl mb-2">Invite members</div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div
          className={classNames(
            "w-full flex bg-gray-100 rounded-lg h-14",
            inviteEmail.length === 0 ? "flex-row items-center" : "flex-col items-start",
            "border",
            sendInviteRes.error ? "border-red-500" : "border-opacity-0"
          )}
        >
          {inviteEmail && <div className="text-xs text-gray-500 px-3">Email</div>}

          <div className="w-full flex content-between">{inviteEmailInput}</div>
        </div>
        <div className="w-full sm:w-1/2">
          <Select
            options={nonOwnerRoleOptions}
            selectedOption={selectedRoleOption}
            onChange={setSelectedRoleOption}
            variant="large"
          />
        </div>
      </div>
      <ThickButton disabled={!formOk} loading={sendInviteRes.isLoading}>
        Send invitation
      </ThickButton>
      {renderInviteError()}
    </form>
  );
};

const UpdateRoleModal: React.FC<{
  vendor: Vendor;
  onClose: () => void;
  member: Agent | Invite;
  newRole: AgentRole;
  ourRole: AgentRole;
}> = ({ vendor, onClose, member, newRole, ourRole }) => {
  const [error, setError] = React.useState<string>();
  const changeRoleMutation = useMutation(
    () => {
      const url = isInvite(member)
        ? `/api/invites/${member.invite_id}`
        : `/api/vendors/${vendor.id}/agents/${member.id}`;

      return fetch(`${getServerUrl()}${url}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.invites(vendor.id));
          queryClient.invalidateQueries(queryKeys.agents(vendor.id));
          queryClient.invalidateQueries(queryKeys.billing(vendor.id));
          onClose();
        } else {
          const res = await r.json();
          const { error } = res;
          setError(error);
        }
      },
    }
  );

  const handledErrors = [
    "Assign another owner first",
    "Agents cannot assign roles",
    "Readers cannot assign roles",
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="font-bold font-admin text-4xl mb-2">
        Update {isInvite(member) && "invited"} role
      </div>

      <div>
        Update {isInvite(member) ? member.email : member.name}&rsquo;s role in {vendor.name} from{" "}
        <span className="font-semibold capitalize">{member.role}</span> to{" "}
        <span className="font-semibold capitalize">{newRole}</span>?
      </div>

      {error && error === "Assign another owner first" && (
        <div className="text-brand-red-500">You must assign another owner first.</div>
      )}

      {error &&
        (error === "Agents cannot assign roles" || error === "Readers cannot assign roles") && (
          <div className="text-brand-red-500">
            Only admins and owners can assign roles (your current role is{" "}
            <span className="font-semibold capitalize">{ourRole}</span>).
          </div>
        )}

      {error && !handledErrors.includes(error) && <div className="text-brand-red-500">{error}</div>}

      {error === undefined ? (
        <ThickButton
          onClick={() => changeRoleMutation.mutate()}
          loading={changeRoleMutation.isLoading}
        >
          Update to <span className="capitalize font-semibold">{newRole}</span>
        </ThickButton>
      ) : (
        <ThickButton onClick={onClose}>OK</ThickButton>
      )}
    </div>
  );
};

const VerifiedDomains: React.FC<{
  authenticatedAgent: Agent;
  vendor: Vendor;
}> = ({ authenticatedAgent, vendor }) => {
  const [, domain] = authenticatedAgent.email.split("@");

  const { data: verifiedDomains0 } = useVerifiedDomains(vendor.id);

  const verifiedDomains = React.useMemo(() => verifiedDomains0 || [], [verifiedDomains0]);

  const { data: isGeneric } = useQuery<boolean>(
    queryKeys.isGenericDomain(domain),
    () =>
      fetch(`${getServerUrl()}/api/is_generic/${domain}`, {
        credentials: "include",
      }).then(res => res.json()),
    {
      enabled: !!domain,
      staleTime: Infinity,
    }
  );

  const addVerifiedDomainMutation = useMutation(
    (params: { vendorId: string; domain: string; skipDnsProof?: boolean }) => {
      const { vendorId, domain, skipDnsProof = false } = params;

      const url = `/api/vendors/${vendorId}/verified_domains`;

      return fetch(`${getServerUrl()}${url}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ domain, skipDnsProof }),
      });
    },
    {
      onSuccess: async (r, params) => {
        const { vendorId } = params;

        if (r.status === 200) {
          queryClient.invalidateQueries(queryKeys.verifiedDomains(vendorId));
        } else {
          const res = await r.json();
          const { error } = res;
          console.error(`${error}`);
        }
      },
    }
  );

  const verifyDomainMutation = useMutation(
    (params: { vendorId: string; domain: string }) => {
      const { vendorId, domain } = params;

      const url = `/api/vendors/${vendorId}/verified_domains/${domain}`;

      return fetch(`${getServerUrl()}${url}`, {
        method: "POST",
        credentials: "include",
      });
    },
    {
      onSuccess: async (r, params) => {
        const { vendorId } = params;

        if (r.status === 200) {
          queryClient.invalidateQueries(queryKeys.verifiedDomains(vendorId));
        } else {
          const res = await r.json();
          const { error } = res;
          console.error(`${error}`);
        }
      },
    }
  );

  const deleteDomainMutation = useMutation(
    (params: { vendorId: string; domain: string }) => {
      const { vendorId, domain } = params;

      const url = `/api/vendors/${vendorId}/verified_domains/${domain}`;

      return fetch(`${getServerUrl()}${url}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: async (r, params) => {
        const { vendorId } = params;

        if (r.status === 200) {
          queryClient.invalidateQueries(queryKeys.verifiedDomains(vendorId));
        } else {
          const res = await r.json();
          const { error } = res;
          console.error(`${error}`);
        }
      },
    }
  );

  const [differentDomain, differentDomainInput, resetDifferentDomain] = useInputWithError({
    className: "!h-12 border-0",
    title: "Add another domain",
    onEnter: () => {
      if (differentDomain && differentDomainOK) {
        addVerifiedDomainMutation.mutate({ vendorId: vendor.id, domain: differentDomain });
        resetDifferentDomain();
      }
    },
  });

  const differentDomainOK = differentDomain.trim().length > 0;

  const verifiedFragments = React.useMemo(() => {
    const fragments = [];
    const f = (d: VerifiedDomain) => <span className="fog:text-link">{d.domain}</span>;
    const domains = verifiedDomains.filter(d => d.verified);

    if (domains.length === 1) {
      fragments.push(f(domains[0]));
    } else if (domains.length === 2) {
      fragments.push(f(domains[0]));
      fragments.push(" or ");
      fragments.push(f(domains[1]));
    } else if (domains.length > 2) {
      for (let x = 0; x < domains.length - 1; x++) {
        fragments.push(f(domains[x]));
        fragments.push(", ");
      }

      fragments.push(" or ");
      fragments.push(f(domains[domains.length - 1]));
    }

    return fragments.map((f, i) => <span key={i}>{f}</span>);
  }, [verifiedDomains]);

  /*
    The plan:

    - An owner can enable auto-joining accounts with owner's email domain (no DNS proof necessary)

    - Owners/agents can enable auto-joining accounts with emails on any domain with DNS proof
  */

  return isGeneric !== false ? null : (
    <div className="w-full bg-white p-4 overflow-auto fog:box-shadow-s rounded-xl flex flex-col gap-4">
      <div className="fog:text-header3">Auto-join configuration</div>
      <div className="flex flex-col gap-2">
        {verifiedDomains.some(d => d.verified) && (
          <span>
            Colleagues with {verifiedFragments} email addresses can automatically join this
            Fogbender team as Readers.
          </span>
        )}
        {authenticatedAgent.role === "owner" && verifiedDomains.every(d => d.domain !== domain) && (
          <div className="flex flex-col gap-2">
            <div>
              Allow anyone with a <span className="fog:text-link">{domain}</span> email address
              access to this team as Reader?
            </div>

            <ThickButton
              className="h-10 max-w-min"
              onClick={() => {
                addVerifiedDomainMutation.mutate({
                  vendorId: vendor.id,
                  domain,
                  skipDnsProof: true,
                });
              }}
            >
              Allow
            </ThickButton>
          </div>
        )}
      </div>
      {verifiedDomains.length > 0 && (
        <div className="flex">
          <table className="table-auto border-collapse flex-1 border-spacing-y-2 border-spacing-x-2 mx-2">
            <thead>
              <tr className="border-b">
                <th className="w-48 text-left py-3">Domain</th>
                <th className="text-left py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {verifiedDomains.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="py-3 align-text-top">{d.domain}</td>
                  {d.verified && (
                    <td className="py-3">
                      <div className="flex justify-between">
                        <div className="flex gap-2 text-green-500">
                          <Icons.Check />
                          <span className="font-medium">Verified</span>
                        </div>
                        <span
                          title="Delete"
                          className="text-gray-500 hover:text-red-500 cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure?") === true) {
                              deleteDomainMutation.mutate({
                                vendorId: vendor.id,
                                domain: d.domain,
                              });
                            }
                          }}
                        >
                          <Icons.Trash className="w-5" />
                        </span>
                      </div>
                    </td>
                  )}
                  {!d.verified && (
                    <td className="py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <div className="flex items-center w-32">
                            <div className="flex gap-2">
                              <Icons.Question className="w-5 text-gray-400" />
                              <span className="font-medium">Not verified</span>
                            </div>
                          </div>
                          <span
                            title="Delete"
                            className="text-gray-500 hover:text-red-500 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure?") === true) {
                                deleteDomainMutation.mutate({
                                  vendorId: vendor.id,
                                  domain: d.domain,
                                });
                              }
                            }}
                          >
                            <Icons.Trash className="w-5" />
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg bg-gray-100 px-3 py-2">
                          <span className="font-medium">TXT Record value</span>
                          <div className="flex-1 sm:flex gap-2 items-center">
                            <div className="flex-1 bg-white text-sm sm:px-3 py-1 break-all rounded border border-gray-300">
                              {d.verification_code}
                            </div>
                            <div className="mr-4" title="Copy code">
                              <ClipboardCopy className="inline-block" text={d.verification_code}>
                                <Icons.Clipboard />
                              </ClipboardCopy>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-4 items-center">
                            <ThinButton
                              onClick={() =>
                                verifyDomainMutation.mutate({
                                  vendorId: vendor.id,
                                  domain: d.domain,
                                })
                              }
                              loading={verifyDomainMutation.isLoading}
                            >
                              Verify
                            </ThinButton>
                            <a
                              className="fog:text-link no-underline"
                              href="/blog/how-to-verify-domain-ownership"
                              target="_blank"
                              rel="noopener"
                            >
                              Verification instructions
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-48">{differentDomainInput}</div>
        <ThickButton
          className={classNames(
            "h-12",
            "transition-opacity duration-100 ease-in",
            differentDomain ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          disabled={!differentDomainOK}
          onClick={() => {
            addVerifiedDomainMutation.mutate({ vendorId: vendor.id, domain: differentDomain });
            resetDifferentDomain();
          }}
        >
          Add
        </ThickButton>
      </div>
    </div>
  );
};

function isInvite(member: Agent | Invite): member is Invite {
  return "invite_id" in member && member.invite_id !== undefined;
}

const agentRoleOption = { id: "agent" as AgentRole, option: "Agent" };

const roleOptions: { id: AgentRole; option: string }[] = [
  { id: "owner", option: "Owner" },
  { id: "admin", option: "Admin" },
  agentRoleOption,
  { id: "reader", option: "Reader" },
];

const nonOwnerRoleOptions = roleOptions.filter(o => o.id !== "owner");
