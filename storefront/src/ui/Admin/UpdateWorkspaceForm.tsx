import classNames from "classnames";
import { LinkButton, ThickButton, useInput } from "fogbender-client/src/shared";
import { SwitchOff, SwitchOn } from "fogbender-client/src/shared/components/Icons";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../config";
import { type Vendor, type Workspace } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";

import { WorkspaceInput } from "./CreateWorkspaceForm";

const InputClassName =
  "w-full bg-gray-100 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose";

export const UpdateWorkspaceForm: React.FC<{
  workspace: Workspace;
  vendor: Vendor;
  nameOk: (x: string) => boolean;
  onClose: () => void;
  onDeleteClick?: () => void;
}> = ({ workspace, vendor, nameOk, onClose, onDeleteClick }) => {
  const updateWorkspaceMutation = useMutation(
    (params: {
      name: string;
      triageName: string;
      description: string;
      agentNameOverride: string;
    }) => {
      const { name, triageName, description, agentNameOverride } = params;
      return fetch(`${getServerUrl()}/api/vendors/${vendor.id}/workspaces/${workspace.id}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name, triageName, description, agentNameOverride }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.workspaces(vendor.id));
          onClose();
        } else {
          const res = await r.json();
          const { error } = res;
          setUpdateWorkspaceError(error);
        }
      },
    }
  );

  const [updateWorkspaceError, setUpdateWorkspaceError] = React.useState<string>();

  const [workspaceName, workspaceNameInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-full",
    placeholder: "Name (e.g. Production)",
    autoFocus: true,
    defaultValue: workspace?.name,
  });

  const [workspaceTriageName, workspaceTriageNameInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-full",
    placeholder: "Default room name (e.g. Triage)",
    defaultValue: workspace?.triage_name || "Triage",
  });

  const [workspaceDescription, workspaceDescriptionInput] = useInput({
    defaultValue: workspace?.description,
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-full",
    placeholder: `Description (e.g. ${vendor.name} production customer support)`,
  });

  const [agentNameOverrideEnabled, setAgentNameOverrideEnabled] = React.useState(false);

  React.useEffect(() => {
    if (workspace?.agent_name_override) {
      setAgentNameOverrideEnabled(true);
    }
  }, [workspace?.agent_name_override]);

  const [
    workspaceAgentNameOverride,
    workspaceAgentNameOverrideInput,
    resetWorkspaceAgentNameOverride,
  ] = useInput({
    defaultValue: workspace?.agent_name_override ?? undefined,
    type: "text",
    className: InputClassName,
    outerDivClassName: "flex-1",
    placeholder: "Name to show users as agent alias (e.g. Support Agent)",
    disabled: agentNameOverrideEnabled === false,
  });

  const workspaceNameOk = workspace
    ? workspace.name === workspaceName.trim() || nameOk(workspaceName.trim())
    : nameOk(workspaceName.trim());

  const workspaceTriageNameOk = workspaceTriageName.trim().length > 0;

  const formOk = React.useMemo(() => {
    if (
      workspaceName.trim().length === 0 ||
      workspaceNameOk === false ||
      workspaceTriageName.trim().length === 0 ||
      workspaceTriageNameOk === false ||
      (agentNameOverrideEnabled && workspaceAgentNameOverride.trim().length === 0)
    ) {
      return false;
    }
    return true;
  }, [
    workspaceName,
    workspaceNameOk,
    workspaceTriageName,
    workspaceTriageNameOk,
    agentNameOverrideEnabled,
    workspaceAgentNameOverride,
  ]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (formOk && !updateWorkspaceMutation.isLoading) {
          updateWorkspaceMutation.mutate({
            name: workspaceName,
            triageName: workspaceTriageName,
            description: workspaceDescription,
            agentNameOverride: workspaceAgentNameOverride,
          });
        }
      }}
      className="flex flex-col gap-6"
    >
      <div className="font-bold font-admin text-4xl mb-2">Update workspace</div>

      <WorkspaceInput
        inputElement={workspaceNameInput}
        error={!workspaceNameOk || !!updateWorkspaceError}
        errorMessage="This name is already taken"
        label={workspaceName.trim().length > 0 ? "Name" : ""}
        className={classNames(
          workspaceName.trim().length > 0 || !workspaceNameOk
            ? "flex-col items-start"
            : "flex-row items-center"
        )}
      />

      <WorkspaceInput
        inputElement={workspaceTriageNameInput}
        error={!workspaceTriageNameOk || !!updateWorkspaceError}
        errorMessage="Can't be blank"
        label={workspaceTriageName.trim().length > 0 ? "Default room name for new customers" : ""}
        className={classNames(
          workspaceTriageName.trim().length > 0 || workspaceTriageNameOk === false
            ? "flex-col items-start"
            : "flex-row items-center"
        )}
      />

      <WorkspaceInput
        inputElement={workspaceDescriptionInput}
        errorMessage={updateWorkspaceError}
        error={!!updateWorkspaceError && !updateWorkspaceMutation.isLoading}
        className={classNames(
          workspaceDescription.trim().length === 0
            ? "flex-row items-center"
            : "flex-col items-start",
          "border border-opacity-0"
        )}
        label={workspaceDescription.trim().length > 0 ? "Description" : ""}
      />

      <div className="flex gap-4 items-center">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            resetWorkspaceAgentNameOverride();
            setAgentNameOverrideEnabled(x => !x);
          }}
        >
          <span className={classNames(agentNameOverrideEnabled && "opacity-50")}>OFF</span>
          {agentNameOverrideEnabled ? (
            <SwitchOn className="w-10" />
          ) : (
            <SwitchOff className="w-10" />
          )}
          <span className={classNames(!agentNameOverrideEnabled && "opacity-50")}>ON</span>
        </div>
        <WorkspaceInput
          inputElement={workspaceAgentNameOverrideInput}
          errorMessage={updateWorkspaceError}
          error={!!updateWorkspaceError && !updateWorkspaceMutation.isLoading}
          className={classNames(
            workspaceAgentNameOverride.trim().length === 0
              ? "flex-row items-center"
              : "flex-col items-start",
            "border border-opacity-0",
            !agentNameOverrideEnabled && "opacity-50"
          )}
          label={
            workspaceAgentNameOverride.trim().length > 0 ? "Agent alias (e.g. Support Agent)" : ""
          }
        />
      </div>

      <div className="flex flex-wrap flex-col justify-between gap-y-4 md:flex-row md:gap-x-4">
        <ThickButton disabled={!formOk} loading={updateWorkspaceMutation.isLoading}>
          Update workspace
        </ThickButton>
        {workspace && onDeleteClick && (
          <LinkButton
            position="end"
            className=" col-start-3 !text-brand-red-500"
            onClick={onDeleteClick}
          >
            Delete workspace
          </LinkButton>
        )}
      </div>
    </form>
  );
};
