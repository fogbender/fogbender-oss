import { Icons, type Integration, ThinButton } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import { queryClient, queryKeys } from "../../client";

import { error, operationStatusMutation, useProgress } from "./Utils";

export const AddSlackCustomerIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const enableMutation = useMutation((params: { aggressiveTicketing: boolean }) => {
    const { aggressiveTicketing } = params;

    return fetch(
      `${getServerUrl()}/api/workspaces/${workspace.id}/integrations/slack-customer/enable`,
      {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ aggressiveTicketing }),
      }
    );
  });

  const {
    progressElem: enableProgressElem,
    progressDone: enableProgressDone,
    inProgress: enableInProgress,
  } = useProgress(enableMutation.isLoading === true, 0);

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

  const [aggressiveTicketing, setAggressiveTicketing] = React.useState(false);

  return (
    <div className="">
      <div className="hidden">
        <AggressiveTicketing
          value={aggressiveTicketing}
          update={x => setAggressiveTicketing(x)}
          changeLater={true}
        />
      </div>
      <div className="my-4">
        <ThinButton
          onClick={() => {
            enableMutation.mutate({ aggressiveTicketing });
          }}
          disabled={enableInProgress === true || enableProgressDone === true}
        >
          Enable
        </ThinButton>
      </div>
      <div className="">
        {operationStatusMutation(
          "Enabling",
          enableProgressDone,
          enableMutation,
          enableProgressElem
        )}
        {enableProgressDone && enableMutation?.data?.ok !== true && error("API error")}
      </div>
      {enableProgressDone && (
        <div className="my-4 flex flex-row-reverse">
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

export const ShowSlackCustomerIntegration: React.FC<{
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

  const updateIntegration = useMutation(
    (params: { aggressiveTicketing: boolean }) => {
      const { aggressiveTicketing } = params;

      return fetch(
        `${getServerUrl()}/api/workspaces/${i.workspace_id}/integrations/${i.id}/update`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ aggressiveTicketing }),
        }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.integrations(i.workspace_id));
      },
    }
  );

  return (
    <div className="">
      <div className="hidden">
        <AggressiveTicketing
          value={!!i.aggressive_ticketing}
          update={x => updateIntegration.mutate({ aggressiveTicketing: x })}
        />
      </div>
      <div className="my-4">
        <ThinButton
          onClick={() => {
            deleteMutation.mutate();
          }}
        >
          Delete
        </ThinButton>
      </div>
    </div>
  );
};

export const AggressiveTicketing: React.FC<{
  value: boolean;
  update: (x: boolean) => void;
  changeLater?: boolean;
}> = ({ update, value, changeLater }) => {
  return (
    <div
      className="my-4 flex cursor-pointer items-center gap-4"
      onClick={() => {
        update(!value);
      }}
    >
      <div className="text-blue-500">
        {value === true && <Icons.CheckboxOn />}
        {value === false && <Icons.CheckboxOff />}
      </div>
      <div className="flex-col">
        <div className="">
          Each top-level channel message in Slack results in a new issue
          {/* TODO add documentation link */}
        </div>
        {changeLater === true && <div className="text-sm">(You can change this later)</div>}
      </div>
    </div>
  );
};
