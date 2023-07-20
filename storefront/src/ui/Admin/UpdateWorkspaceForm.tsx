import classNames from "classnames";
import { LinkButton, ThickButton, useInput } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../config";
import { Vendor, Workspace } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";

const InputClassName =
  "w-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose";

export const UpdateWorkspaceForm: React.FC<{
  workspace: Workspace;
  vendor: Vendor;
  nameOk: (x: string) => boolean;
  onClose: () => void;
  onDeleteClick?: () => void;
}> = ({ workspace, vendor, nameOk, onClose, onDeleteClick }) => {
  const updateWorkspaceMutation = useMutation(
    (params: { name: string; triageName: string; description: string }) => {
      const { name, triageName, description } = params;
      return fetch(`${getServerUrl()}/api/vendors/${vendor.id}/workspaces/${workspace.id}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name, triageName, description }),
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

  const workspaceNameOk = workspace
    ? workspace.name === workspaceName.trim() || nameOk(workspaceName.trim())
    : nameOk(workspaceName.trim());

  const workspaceTriageNameOk = workspaceTriageName.trim().length > 0;

  const formOk = React.useMemo(() => {
    if (
      workspaceName.trim().length === 0 ||
      workspaceNameOk === false ||
      workspaceTriageName.trim().length === 0 ||
      workspaceTriageNameOk === false
    ) {
      return false;
    }
    return true;
  }, [workspaceName, workspaceNameOk, workspaceTriageName, workspaceTriageNameOk]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (formOk && !updateWorkspaceMutation.isLoading) {
          updateWorkspaceMutation.mutate({
            name: workspaceName,
            triageName: workspaceTriageName,
            description: workspaceDescription,
          });
        }
      }}
      className="flex flex-col gap-6"
    >
      <div className="font-bold font-admin text-4xl mb-2">Update workspace</div>

      <div
        className={classNames(
          "w-full flex bg-gray-100 rounded-lg h-14",
          workspaceName.trim().length > 0 || workspaceNameOk === false
            ? "flex-col items-start"
            : "flex-row items-center",
          "border",
          workspaceNameOk === false || updateWorkspaceError
            ? "border-brand-red-100"
            : "border-opacity-0"
        )}
      >
        {workspaceNameOk === false ? (
          <div className="text-xs text-brand-red-500 px-3">This name is already taken</div>
        ) : (
          workspaceName.trim().length > 0 && <div className="text-xs text-gray-500 px-3">Name</div>
        )}
        <div className="w-full flex content-between">{workspaceNameInput}</div>
      </div>

      <div
        className={classNames(
          "w-full flex bg-gray-100 rounded-lg h-14",
          workspaceTriageName.trim().length > 0 || workspaceTriageNameOk === false
            ? "flex-col items-start"
            : "flex-row items-center",
          "border",
          workspaceTriageNameOk === false || updateWorkspaceError
            ? "border-brand-red-100"
            : "border-opacity-0"
        )}
      >
        <div className="text-xs px-3">
          {workspaceTriageNameOk === false ? (
            <span className="text-brand-red-500">Can't be blank</span>
          ) : (
            workspaceTriageName.trim().length > 0 && (
              <span className="text-gray-500">Default room name for new customers</span>
            )
          )}
        </div>

        <div className="w-full flex content-between">{workspaceTriageNameInput}</div>
      </div>

      <div
        className={classNames(
          "w-full flex bg-gray-100 rounded-lg h-14",
          workspaceDescription.trim().length === 0
            ? "flex-row items-center"
            : "flex-col items-start",
          "border",
          updateWorkspaceError ? "border-brand-red-100" : "border-opacity-0"
        )}
      >
        {workspaceDescription.trim().length > 0 && (
          <div className="text-xs text-gray-500 px-3">Description</div>
        )}

        <div className="w-full flex content-between">{workspaceDescriptionInput}</div>
      </div>
      <div className="flex-1 flex self-center items-center">
        {updateWorkspaceError && !updateWorkspaceMutation.isLoading && (
          <span className="flex text-red-500 fog:text-caption-xl">{updateWorkspaceError}</span>
        )}
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
