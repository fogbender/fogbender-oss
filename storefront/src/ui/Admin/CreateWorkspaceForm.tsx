import classNames from "classnames";
import { ThickButton, useInput } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "@tanstack/react-query";

import type { Vendor, Workspace } from "../../redux/adminApi";
import { queryClient, queryKeys, apiServer } from "../client";

const InputClassName =
  "w-full bg-gray-100 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose";

export const CreateWorkspaceForm: React.FC<{
  workspace?: Workspace;
  vendor: Vendor;
  nameOk: (x: string) => boolean;
  onClose: () => void;
}> = ({ workspace, vendor, nameOk, onClose }) => {
  const addWorkspaceMutation = useMutation({
    mutationFn: (params: { name: string; triageName: string; description: string }) => {
      const { name, triageName, description } = params;
      return apiServer
        .url(`/api/vendors/${vendor.id}/workspaces`)
        .post({
          name,
          triageName,
          description,
        })
        .json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(vendor.id) });
      onClose();
    },
    onError: e => {
      if ("error" in e) {
        const { error } = e;

        if (typeof error === "string") {
          setCreateWorkspaceError(error);
        }
      }
    },
  });

  const [createWorkspaceError, setCreateWorkspaceError] = React.useState<string>();

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
        if (formOk && !addWorkspaceMutation.isPending) {
          addWorkspaceMutation.mutate({
            name: workspaceName,
            triageName: workspaceTriageName,
            description: workspaceDescription,
          });
        }
      }}
      className="flex flex-col gap-6"
    >
      <div className="font-bold font-admin text-4xl mb-2">Create a new workspace</div>

      <WorkspaceInput
        inputElement={workspaceNameInput}
        error={!workspaceNameOk}
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
        error={!workspaceTriageNameOk}
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
        className={classNames(
          workspaceDescription.trim().length === 0
            ? "flex-row items-center"
            : "flex-col items-start",
          "border border-opacity-0"
        )}
        label={workspaceDescription.trim().length > 0 ? "Description" : ""}
      />

      <div className="flex flex-wrap flex-col gap-y-4 md:flex-row md:gap-x-4">
        <ThickButton disabled={!formOk} loading={addWorkspaceMutation.isPending}>
          Create workspace
        </ThickButton>
        <div className="flex-1 flex items-center ml-4">
          {createWorkspaceError && !addWorkspaceMutation.isPending && (
            <span className="flex text-red-500 fog:text-caption-xl">{createWorkspaceError}</span>
          )}
        </div>
      </div>
    </form>
  );
};

export const WorkspaceInput = ({
  inputElement,
  className,
  error,
  errorMessage,
  label,
}: {
  inputElement?: JSX.Element;
  className?: string;
  error?: boolean;
  errorMessage?: string;
  label: string;
}) => {
  return (
    <div
      className={classNames(
        "border w-full flex bg-gray-100 dark:bg-black rounded-lg h-14",
        className,
        error ? "border-brand-red-100" : "border-opacity-0"
      )}
    >
      {error ? (
        <div className="text-xs text-brand-red-500 px-3">{errorMessage}</div>
      ) : label.length > 0 ? (
        <div className="text-xs text-gray-500 px-3">{label}</div>
      ) : null}
      <div className="w-full flex content-between">{inputElement}</div>
    </div>
  );
};
