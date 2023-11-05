import { type Integration, ThinButton, useInput } from "fogbender-client/src/shared";
import React from "react";

import { getWebhookUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import { useServerApiPostWithPayload } from "../../useServerApi";

import {
  configInputItem,
  configListItem,
  error,
  InputClassName,
  operationStatus,
  useProgress,
} from "./Utils";

export const AddLinearIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [apiKey, apiKeyInput] = useInput({
    type: "password",
    placeholder: "Linear API key",
    className: InputClassName,
  });

  const [teamName, setTeamName] = React.useState<string>();

  const [checkAccessRes0, checkAccessCall0] = useServerApiPostWithPayload<
    {
      teams: {
        nodes: { id: string; name: string; key: string; organization: { urlKey: string } }[];
      };
    },
    {}
  >(`/api/workspaces/${workspace.id}/integrations/linear/check-access`);

  const teamId = checkAccessRes0?.data?.teams?.nodes?.find(t => t.name === teamName)?.id;

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<
    {
      teams: {
        nodes: { id: string; name: string; key: string; organization: { urlKey: string } }[];
      };
    },
    { apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/check-access`);

  const [createLabelRes, createLabelCall] = useServerApiPostWithPayload<
    any,
    { teamId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/create-label`);

  const [deleteLabelRes, deleteLabelCall] = useServerApiPostWithPayload<
    any,
    { labelId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/delete-label`);

  const [createWebhookRes, createWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string; teamId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/create-webhook`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { teamId: string; issueTitle: string; apiKey: string; labelId: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { issueId: string; issueTitle: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/delete-issue`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { apiKey: string; webhookId: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/delete-webhook`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/linear/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      teamId: string;
      teamName: string;
      projectUrl: string;
      apiKey: string;
      fogbenderLabelId: string;
      webhookId: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/linear/add-integration`);

  const [steps, setSteps] = React.useState<{
    check: number;
    create_issue: number;
    del_issue: number;
    create_webook: number;
    create_label: number;
    check_webhook: number;
  }>({
    check: 0,
    create_issue: 0,
    del_issue: 0,
    create_webook: 0,
    create_label: 0,
    check_webhook: 0,
  });

  const [cancelSteps, setCancelSteps] = React.useState<{
    del_webhook: number;
    del_label: number;
  }>({
    del_webhook: 0,
    del_label: 0,
  });

  const [clear, setClear] = React.useState(0);

  const { progressElem: checkAccessProgressElem, progressDone: checkAccessProgressDone } =
    useProgress(checkAccessRes.loading === true, clear);

  const { progressElem: createLabelProgressElem, progressDone: createLabelProgressDone } =
    useProgress(createLabelRes.loading === true, clear);

  const {
    progressElem: deleteLabelProgressElem,
    progressDone: deleteLabelProgressDone,
    inProgress: deleteLabelInProgress,
  } = useProgress(deleteLabelRes.loading === true, clear);

  const { progressElem: createWebhookProgressElem, progressDone: createWebhookProgressDone } =
    useProgress(createWebhookRes.loading === true, clear);

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const { progressElem: createIssueProgressElem, progressDone: createIssueProgressDone } =
    useProgress(createIssueRes.loading === true, clear);

  const { progressElem: deleteIssueProgressElem, progressDone: deleteIssueProgressDone } =
    useProgress(deleteIssueRes.loading === true, clear, 200);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const {
    progressElem: addIntegrationProgressElem,
    progressDone: addIntegrationProgressDone,
    inProgress: addIntegrationInProgress,
  } = useProgress(addIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  React.useEffect(() => {
    if (apiKey) {
      checkAccessCall0({ apiKey });
    }
  }, [apiKey, checkAccessCall0]);

  React.useEffect(() => {
    if (steps.create_label === steps.check - 1 && checkAccessRes.error === null) {
      if (teamId !== undefined) {
        createLabelCall({ apiKey, teamId });
      }
    }
  }, [
    steps,
    checkAccessProgressDone,
    checkAccessRes.data,
    checkAccessRes.error,
    apiKey,
    teamId,
    createLabelCall,
  ]);

  React.useEffect(() => {
    if (steps.create_webook === steps.create_label - 1 && createLabelRes.error === null) {
      if (apiKey.length !== 0 && teamId !== undefined && teamId.length !== 0) {
        createWebhookCall({ apiKey, teamId, webhookUrl: getWebhookUrl() });
      }
    }
  }, [steps, teamId, apiKey, createWebhookCall, createLabelRes.error]);

  React.useEffect(() => {
    if (steps.create_issue === steps.create_webook - 1 && createWebhookRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;

      if (createLabelRes.data !== null) {
        const { id: labelId } = createLabelRes.data;

        if (labelId !== null && teamId !== undefined) {
          createIssueCall({ issueTitle: issueTitleRef.current, apiKey, teamId, labelId });
        }
      }
    }
  }, [steps, createWebhookRes.error, createLabelRes.data, apiKey, teamId, createIssueCall]);

  React.useEffect(() => {
    if (
      steps.del_issue === steps.create_issue - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { id: issueId, title: issueTitle } = createIssueRes.data;

      deleteIssueCall({
        issueId,
        issueTitle,
        apiKey,
      });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, apiKey, deleteIssueCall]);

  React.useEffect(() => {
    if (steps.check_webhook === steps.del_issue - 1 && deleteIssueRes.error === null) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
    }
  }, [steps, deleteIssueRes.error, checkWebhookCall]);

  React.useEffect(() => {
    if (cancelSteps.del_webhook === cancelSteps.del_label - 1 && deleteLabelRes.error === null) {
      const { id } = createWebhookRes.data;
      deleteWebhookCall({ apiKey, webhookId: id });
    }
  }, [cancelSteps, createWebhookRes.data, apiKey, deleteLabelRes.error, deleteWebhookCall]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone && deleteWebhookRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [steps, deleteWebhookProgressDone, deleteWebhookRes.error, onDone]);

  /* --- */

  React.useEffect(() => {
    if (checkAccessProgressDone) {
      setSteps(x => {
        return { ...x, check: x.check + 1 };
      });
    }
  }, [checkAccessProgressDone]);

  React.useEffect(() => {
    if (createLabelProgressDone) {
      setSteps(x => {
        return { ...x, create_label: x.create_label + 1 };
      });
    }
  }, [createLabelProgressDone]);

  React.useEffect(() => {
    if (createIssueProgressDone) {
      setSteps(x => {
        return { ...x, create_issue: x.create_issue + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, del_issue: x.del_issue + 1 };
      });
    }
  }, [deleteIssueProgressDone]);

  React.useEffect(() => {
    if (createWebhookProgressDone) {
      setSteps(x => {
        return { ...x, create_webook: x.create_webook + 1 };
      });
    }
  }, [createWebhookProgressDone]);

  React.useEffect(() => {
    if (checkWebhookProgressDone) {
      setSteps(x => {
        return { ...x, check_webhook: x.check_webhook + 1 };
      });
    }
  }, [checkWebhookProgressDone]);

  React.useEffect(() => {
    if (deleteLabelProgressDone) {
      setCancelSteps(x => {
        return { ...x, del_label: x.del_label + 1 };
      });
    }
  }, [deleteLabelProgressDone]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone) {
      setCancelSteps(x => {
        return { ...x, del_webhook: x.del_webhook + 1 };
      });
    }
  }, [deleteWebhookProgressDone]);

  const testIsAGo = apiKey.trim().length !== 0;

  const lockStep = Object.values(steps).filter((v, i, a) => a.indexOf(v) === i);
  const cancelLockStep = Object.values(cancelSteps).filter((v, i, a) => a.indexOf(v) === i);

  const addIsAGo =
    !(
      checkAccessRes.error ||
      createLabelRes.error ||
      createWebhookRes.error ||
      createIssueRes.error ||
      deleteIssueRes.error ||
      checkWebhookRes.error
    ) &&
    lockStep.length === 1 &&
    lockStep[0] > 0 &&
    cancelLockStep.length === 1 &&
    cancelLockStep[0] === 0 &&
    deleteLabelInProgress === false &&
    checkAccessProgressDone === true &&
    addIntegrationProgressDone === false &&
    addIntegrationInProgress === false;

  React.useEffect(() => {
    if (addIntegrationProgressDone && addIntegrationRes.error === null) {
      onDone();
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  const apiKeyHref = "https://linear.app/settings/api";

  const anchor = (text: string, url: string) => (
    <a target="_blank" rel="noopener" href={url}>
      {text}
    </a>
  );

  React.useEffect(() => {
    if (checkAccessRes0.data !== null) {
      setTeamName(checkAccessRes0?.data?.teams?.nodes?.map(n => n.name)[0]);
    }
  }, [checkAccessRes0.data]);

  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2">
        <p>
          This integration requires a personal API key; you can create one in{" "}
          {anchor("API settings", apiKeyHref)}.
        </p>
      </div>

      <div className="col-span-2">
        <div className="grid gap-2 grid-cols-3">
          {configInputItem("API key:", apiKeyInput)}

          {checkAccessRes0?.data?.teams &&
            configListItem(
              "Team:",
              checkAccessRes0?.data?.teams?.nodes?.map(n => n.name),
              teamName,
              e => setTeamName(e.target.value)
            )}

          <div className="col-start-1">
            <ThinButton
              onClick={() => {
                if (testIsAGo) {
                  setClear(x => x + 1);
                  setSteps(x => {
                    const y = x.check;
                    return {
                      check: y,
                      create_issue: y,
                      del_issue: y,
                      create_webook: y,
                      check_webhook: y,
                      create_label: y,
                    };
                  });
                  setCancelSteps(() => {
                    return {
                      del_webhook: 0,
                      del_label: 0,
                    };
                  });
                  checkAccessCall({ apiKey });
                }
              }}
            >
              Test
            </ThinButton>
          </div>
          {checkWebhookProgressDone && checkWebhookRes.error === null && (
            <div className="col-end-4 col-span-1 flex justify-end">
              <ThinButton
                onClick={() => {
                  const { id } = createLabelRes.data;

                  if (id) {
                    deleteLabelCall({ apiKey, labelId: id });
                  }
                }}
              >
                Cancel
              </ThinButton>
            </div>
          )}
        </div>
      </div>
      <div className="col-span-2">
        {operationStatus(
          "Checking access",
          checkAccessProgressDone,
          checkAccessRes,
          checkAccessProgressElem
        )}
        {checkAccessProgressDone &&
          operationStatus(
            <span>
              Creating{" "}
              <span className="bg-purple-500 text-white text-sm font-bold px-1.5 rounded">
                fogbender
              </span>{" "}
              label
            </span>,
            createLabelProgressDone,
            createLabelRes,
            createLabelProgressElem
          )}
        {checkAccessProgressDone &&
          createLabelProgressDone &&
          operationStatus(
            "Adding webhook",
            createWebhookProgressDone,
            createWebhookRes,
            createWebhookProgressElem
          )}
        {checkAccessProgressDone &&
          createLabelProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Creating test issue",
            createIssueProgressDone,
            createIssueRes,
            createIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createLabelProgressDone &&
          createIssueProgressDone &&
          operationStatus(
            "Deleting test issue",
            deleteIssueProgressDone,
            deleteIssueRes,
            deleteIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createLabelProgressDone &&
          createIssueProgressDone &&
          deleteIssueProgressDone &&
          operationStatus(
            "Testing webhook",
            checkWebhookProgressDone,
            checkWebhookRes,
            checkWebhookProgressElem
          )}
        {operationStatus(
          "Archiving 'fogbender' label",
          deleteLabelProgressDone,
          deleteLabelRes,
          deleteLabelProgressElem
        )}
        {operationStatus(
          "Deleting webhook",
          deleteWebhookProgressDone,
          deleteWebhookRes,
          deleteWebhookProgressElem
        )}
        {operationStatus(
          "Adding integration",
          addIntegrationProgressDone,
          addIntegrationRes,
          addIntegrationProgressElem
        )}
        {checkAccessProgressDone &&
          checkAccessRes.error &&
          error("Bad access token or incorrect project full path.")}
        {createIssueProgressDone &&
          createIssueRes.error &&
          error(
            <span>
              This access token comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {deleteIssueProgressDone &&
          deleteIssueRes.error &&
          error(
            <span>
              This access token comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {checkWebhookProgressDone &&
          checkWebhookRes.error &&
          error(
            <span>
              The webhook in <b>{teamName}</b> is not working. Please contact support if you need
              help with configuration.
            </span>
          )}
        {addIntegrationProgressDone &&
          addIntegrationRes.error &&
          error(
            <span>
              Duplicate integration: <b>TEAM</b> has already been added.
            </span>
          )}

        {addIsAGo && (
          <div className="mt-6 flex flex-row-reverse">
            <ThinButton
              onClick={() => {
                const teamKey = checkAccessRes?.data?.teams?.nodes?.find(t => t.id === teamId)?.key;
                const orgSlug = checkAccessRes?.data?.teams?.nodes?.find(t => t.id === teamId)
                  ?.organization.urlKey;

                const { id: fogbenderLabelId } = createLabelRes.data;
                const { id: webhookId } = createWebhookRes.data;

                if (
                  teamId !== undefined &&
                  teamName !== undefined &&
                  teamKey !== undefined &&
                  orgSlug !== undefined &&
                  webhookId !== undefined
                ) {
                  addIntegrationCall({
                    teamId,
                    teamName,
                    projectUrl: `https://linear.app/${orgSlug}/team/${teamKey}`,
                    apiKey,
                    fogbenderLabelId,
                    webhookId,
                  });
                }
              }}
            >
              Add integration
            </ThinButton>
          </div>
        )}
      </div>
    </div>
  );
};

export const ShowLinearIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const [accessToken, accessTokenInput] = useInput({
    type: "new-password",
    placeholder: "Linear API key",
    className: InputClassName,
  });

  const [teamName, setTeamName] = React.useState<string>();

  const [checkAccessRes0, checkAccessCall0] = useServerApiPostWithPayload<
    {
      labelId: string;
      teams: {
        nodes: { id: string; name: string; key: string; organization: { urlKey: string } }[];
      };
    },
    {}
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/check-access`);

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<
    {
      labelId: string;
      teams: {
        nodes: { id: string; name: string; key: string; organization: { urlKey: string } }[];
      };
    },
    {}
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/check-access`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { issueId: string; issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/get-issue-by-name`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-webhook`
  );

  const [deleteIntegrationRes, deleteIntegrationCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`
  );

  const [updateApiKeyRes, updateApiKeyCall] = useServerApiPostWithPayload<any, { apiKey: string }>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`
  );

  const [steps, setSteps] = React.useState<{
    check: number;
    create_issue: number;
    del_issue: number;
    check_webhook: number;
    del_webhook: number;
    del_integration: number;
  }>({
    check: 0,
    create_issue: 0,
    del_issue: 0,
    check_webhook: 0,
    del_webhook: 0,
    del_integration: 0,
  });

  const [clear, setClear] = React.useState(0);

  const [deleting, setDeleting] = React.useState(false);

  const { progressElem: checkAccessProgressElem, progressDone: checkAccessProgressDone } =
    useProgress(checkAccessRes.loading === true, clear);

  const { progressElem: createIssueProgressElem, progressDone: createIssueProgressDone } =
    useProgress(createIssueRes.loading === true, clear);

  const { progressElem: deleteIssueProgressElem, progressDone: deleteIssueProgressDone } =
    useProgress(deleteIssueRes.loading === true, clear, 200);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const {
    progressElem: deleteIntegrationProgressElem,
    progressDone: deleteIntegrationProgressDone,
  } = useProgress(deleteIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  /* --- */

  React.useEffect(() => {
    checkAccessCall0();
  }, [checkAccessCall0]);

  React.useEffect(() => {
    if (steps.create_issue === steps.check - 1 && checkAccessRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      createIssueCall({ issueTitle: issueTitleRef.current });
    }
  }, [steps, checkAccessRes.error, createIssueCall]);

  React.useEffect(() => {
    if (
      steps.del_issue === steps.create_issue - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { id: issueId, title: issueTitle } = createIssueRes.data;

      deleteIssueCall({
        issueId,
        issueTitle,
      });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, deleteIssueCall]);

  React.useEffect(() => {
    if (steps.check_webhook === steps.del_issue - 1 && deleteIssueRes.error === null) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
    }
  }, [steps, deleteIssueRes.error, checkWebhookCall]);

  React.useEffect(() => {
    if (steps.del_integration === steps.del_webhook - 1 && deleteWebhookRes.error === null) {
      deleteIntegrationCall();
    }
  }, [steps, deleteWebhookRes.error, deleteIntegrationCall]);

  /* --- */

  React.useEffect(() => {
    if (checkAccessProgressDone) {
      setSteps(x => {
        return { ...x, check: x.check + 1 };
      });
    }
  }, [checkAccessProgressDone]);

  React.useEffect(() => {
    if (createIssueProgressDone) {
      setSteps(x => {
        return { ...x, create_issue: x.create_issue + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, del_issue: x.del_issue + 1 };
      });
    }
  }, [deleteIssueProgressDone]);

  React.useEffect(() => {
    if (checkWebhookProgressDone) {
      setSteps(x => {
        return { ...x, check_webhook: x.check_webhook + 1 };
      });
    }
  }, [checkWebhookProgressDone]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone === true) {
      setSteps(x => {
        return { ...x, del_webhook: x.del_webhook + 1 };
      });
    }
  }, [deleteWebhookProgressDone]);

  React.useEffect(() => {
    if (deleteIntegrationProgressDone === true && deleteIntegrationRes.error === null) {
      setTimeout(() => onDeleted(), 0);
    }
  }, [deleteIntegrationProgressDone, deleteIntegrationRes, onDeleted]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        {configInputItem("Access Token:", accessTokenInput)}
        <div className="flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              updateApiKeyCall({ apiKey: accessToken });
            }}
            loading={updateApiKeyRes.loading}
            disabled={accessToken === ""}
          >
            Update
          </ThinButton>
        </div>

        {checkAccessRes0?.data?.teams &&
          configListItem(
            "Team:",
            checkAccessRes0?.data?.teams?.nodes?.map(n => n.name),
            teamName,
            e => setTeamName(e.target.value)
          )}
        <div className="flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              if (checkAccessRes0.data !== null && checkAccessRes0.error === null) {
                setClear(x => x + 1);
                setSteps(x => {
                  const y = x.check;
                  return {
                    check: y,
                    create_issue: y,
                    del_issue: y,
                    check_webhook: y,
                    del_webhook: y,
                    del_integration: y,
                  };
                });
                checkAccessCall();
              }
            }}
          >
            Test
          </ThinButton>
        </div>
        <div className="flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              setSteps(x => {
                const y = x.check;
                return {
                  check: y,
                  create_issue: y,
                  del_issue: y,
                  check_webhook: y,
                  del_webhook: y,
                  del_integration: y,
                };
              });
              setDeleting(true);
              deleteWebhookCall();
            }}
          >
            Delete
          </ThinButton>
        </div>
      </div>
      <div className="col-span-2">
        {operationStatus(
          "Checking access",
          checkAccessProgressDone,
          checkAccessRes,
          checkAccessProgressElem
        )}
        {checkAccessProgressDone &&
          operationStatus(
            "Creating test issue",
            createIssueProgressDone,
            createIssueRes,
            createIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createIssueProgressDone &&
          operationStatus(
            "Deleting test issue",
            deleteIssueProgressDone,
            deleteIssueRes,
            deleteIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createIssueProgressDone &&
          deleteIssueProgressDone &&
          operationStatus(
            "Testing webhook",
            checkWebhookProgressDone,
            checkWebhookRes,
            checkWebhookProgressElem
          )}
        {deleting &&
          operationStatus(
            "Deleting webhook",
            deleteWebhookProgressDone,
            deleteWebhookRes,
            deleteWebhookProgressElem
          )}
        {deleteWebhookProgressDone &&
          operationStatus(
            "Deleting integration",
            deleteIntegrationProgressDone,
            deleteIntegrationRes,
            deleteIntegrationProgressElem
          )}
      </div>
    </div>
  );
};
