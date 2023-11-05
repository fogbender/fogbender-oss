import { type Integration, ThinButton } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";

import { error, operationStatusMutation, useProgress } from "./Utils";

export const AddMsTeamsIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const enableMutation = useMutation(() => {
    return fetch(`${getServerUrl()}/api/workspaces/${workspace.id}/integrations/msteams/enable`, {
      method: "POST",
      credentials: "include",
    });
  });

  const { progressElem: enableProgressElem, progressDone: enableProgressDone } = useProgress(
    enableMutation.isLoading === true,
    0
  );

  const [yesDone, setYesDone] = React.useState(false);

  React.useEffect(() => {
    if (yesDone === true) {
      setTimeout(() => onDone(), 0);
    }
  }, [onDone, yesDone]);

  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="col-span-2 grid grid-cols-3 gap-2">
        <div className="col-start-1 my-4">
          <ThinButton
            onClick={() => {
              enableMutation.mutate();
            }}
          >
            Enable
          </ThinButton>
        </div>
      </div>
      <div className="col-span-2">
        {operationStatusMutation(
          "Enabling",
          enableProgressDone,
          enableMutation,
          enableProgressElem
        )}
        {enableProgressDone && enableMutation?.data?.ok !== true && error("API error")}
      </div>
      {enableProgressDone && (
        <div className="col-start-2 flex flex-row-reverse">
          <ThinButton
            disabled={enableProgressDone && enableMutation?.data?.ok !== true}
            onClick={() => {
              setYesDone(true);
            }}
          >
            OK
          </ThinButton>
        </div>
      )}
    </div>
  );
};

export const ShowMsTeamsIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const deleteMutation = useMutation(
    () => {
      return fetch(
        `${getServerUrl()}/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    },
    {
      onSuccess: () => {
        onDeleted();
      },
    }
  );
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="col-span-2 grid grid-cols-3 gap-2">
        <div className="col-start-1 my-4">
          <ThinButton
            onClick={() => {
              deleteMutation.mutate();
            }}
          >
            Delete
          </ThinButton>
        </div>
      </div>
    </div>
  );
};
