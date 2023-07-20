import { Integration, ThinButton, useInput } from "fogbender-client/src/shared";
import React from "react";

import { getWebhookUrl } from "../../../config";
import { Workspace } from "../../../redux/adminApi";
import { useServerApiGet, useServerApiPostWithPayload } from "../../useServerApi";

import {
  clipboard,
  configCopyItem,
  configInputItem,
  error,
  InputClassName,
  operationStatus,
  readOnlyItem,
  useProgress,
} from "./Utils";

export const AddJiraIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [jiraUrl, jiraUrlInput] = useInput({
    type: "text",
    placeholder: "https://your-domain.atlassian.net",
    className: InputClassName,
    inline: true,
  });

  const [jiraUser, jiraUserInput] = useInput({
    type: "text",
    placeholder: "user@example.com",
    className: InputClassName,
  });

  const [projectKey, projectKeyInput] = useInput({
    type: "text",
    placeholder: "project-key",
    className: InputClassName,
  });

  const [apiToken, apiTokenInput] = useInput({
    type: "password",
    placeholder: "Jira API token",
    className: InputClassName,
  });

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<
    any,
    { jiraUrl: string; jiraUser: string; projectKey: string; apiToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/jira/check-access`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { jiraUrl: string; jiraUser: string; projectKey: string; issueTitle: string; apiToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/jira/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { jiraUrl: string; jiraUser: string; issueId: string; issueTitle: string; apiToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/jira/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/jira/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      jiraUrl: string;
      jiraUser: string;
      apiToken: string;
      projectKey: string;
      projectName: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/jira/add-integration`);

  const [steps, setSteps] = React.useState<{
    check: number;
    create: number;
    del: number;
    hook: number;
  }>({
    check: 0,
    create: 0,
    del: 0,
    hook: 0,
  });

  const [clear, setClear] = React.useState(0);

  const { progressElem: checkAccessProgressElem, progressDone: checkAccessProgressDone } =
    useProgress(checkAccessRes.loading === true, clear);

  const { progressElem: createIssueProgressElem, progressDone: createIssueProgressDone } =
    useProgress(createIssueRes.loading === true, clear);

  const { progressElem: deleteIssueProgressElem, progressDone: deleteIssueProgressDone } =
    useProgress(deleteIssueRes.loading === true, clear, 500);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const {
    progressElem: addIntegrationProgressElem,
    progressDone: addIntegrationProgressDone,
    inProgress: addIntegrationInProgress,
  } = useProgress(addIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  React.useEffect(() => {
    if (steps.create === steps.check - 1 && checkAccessRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      createIssueCall({
        jiraUser,
        jiraUrl,
        projectKey,
        issueTitle: issueTitleRef.current,
        apiToken,
      });
    }
  }, [
    steps,
    checkAccessProgressDone,
    checkAccessRes.data,
    checkAccessRes.error,
    jiraUser,
    jiraUrl,
    projectKey,
    apiToken,
    createIssueCall,
  ]);

  React.useEffect(() => {
    if (
      steps.del === steps.create - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data &&
      issueTitleRef.current
    ) {
      const { id: issueId } = createIssueRes.data;

      deleteIssueCall({
        jiraUrl,
        jiraUser,
        apiToken,
        issueId,
        issueTitle: issueTitleRef.current,
      });
    }
  }, [
    steps,
    createIssueRes.data,
    createIssueRes.error,
    jiraUrl,
    apiToken,
    deleteIssueCall,
    jiraUser,
  ]);

  React.useEffect(() => {
    if (steps.hook === steps.del - 1 && deleteIssueRes.error === null && deleteIssueRes.data) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
    }
  }, [steps, deleteIssueRes.data, deleteIssueRes.error, checkWebhookCall]);

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
        return { ...x, create: x.create + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, del: x.del + 1 };
      });
    }
  }, [deleteIssueProgressDone]);

  React.useEffect(() => {
    if (checkWebhookProgressDone) {
      setSteps(x => {
        return { ...x, hook: x.hook + 1 };
      });
    }
  }, [checkWebhookProgressDone]);

  const [webhookLoading, webhookError, webhookData] = useServerApiGet<{
    webhook_secret: string;
  }>(`/api/workspaces/${workspace.id}/webhook`);

  const testIsAGo = jiraUser.trim().length !== 0 && apiToken.trim().length !== 0;

  const lockStep = Object.values(steps).filter((v, i, a) => a.indexOf(v) === i);

  const addIsAGo =
    !(
      checkAccessRes.error ||
      createIssueRes.error ||
      deleteIssueRes.error ||
      checkWebhookRes.error
    ) &&
    lockStep.length === 1 &&
    lockStep[0] > 0 &&
    checkAccessProgressDone === true &&
    addIntegrationProgressDone === false &&
    addIntegrationInProgress === false;

  const jiraHooksUrl = `${jiraUrl}/plugins/servlet/webhooks`;

  const [clipboardSignal, setClipboardSignal] = React.useState<ClipboardSignal>();

  React.useEffect(() => {
    if (addIntegrationProgressDone && addIntegrationRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  const apiTokenHref = "https://id.atlassian.com/manage-profile/security/api-tokens";

  const webhookUrl = React.useMemo(() => {
    if (webhookLoading !== true && webhookError === null) {
      return getWebhookUrl() + "/" + webhookData?.webhook_secret;
    }

    return undefined;
  }, [webhookLoading, webhookError, webhookData]);

  const anchor = (text: string, url: string) => (
    <a target="_blank" rel="noopener" href={url}>
      {text}
    </a>
  );

  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2">
        <p>
          This integration requires a personal API token; you can create one in{" "}
          {anchor("Security settings", apiTokenHref)}.
        </p>
      </div>

      <div className="col-span-2 grid gap-2 grid-cols-3">
        {configInputItem("Jira URL:", jiraUrlInput)}

        {configInputItem("Jira user:", jiraUserInput)}

        {configInputItem("Project key:", projectKeyInput)}

        {configInputItem("API token:", apiTokenInput)}

        {webhookUrl !== undefined &&
          configCopyItem(
            "Webhook URL:",
            webhookUrl,
            clipboard<ClipboardSignal>(
              webhookUrl,
              setClipboardSignal,
              clipboardSignal,
              "webhookUrl"
            )
          )}

        {jiraUrl && jiraUser && (
          <div className="col-span-3">
            To create a webhook, go to{" "}
            <a href={jiraHooksUrl} target="_blank" rel="noopener">
              {jiraHooksUrl}
            </a>{" "}
            press <b>Create a WebHook</b> button, put <code>labels = fogbender</code> to{" "}
            <b>Issue related events</b> and select <b>Issue</b> and <b>Comment</b> events.
          </div>
        )}

        <div className="my-4 col-start-1">
          <ThinButton
            disabled={!testIsAGo}
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.check;
                return { check: y, create: y, del: y, hook: y };
              });
              checkAccessCall({
                jiraUser,
                jiraUrl,
                projectKey,
                apiToken,
              });
            }}
          >
            Test
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
        {operationStatus(
          "Adding integration",
          addIntegrationProgressDone,
          addIntegrationRes,
          addIntegrationProgressElem
        )}
        {checkAccessProgressDone &&
          checkAccessRes.error &&
          error("Bad access token or incorrect project key.")}
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
              The webhook is not working. Please contact support if you need help with
              configuration.
            </span>
          )}
        {addIntegrationProgressDone &&
          addIntegrationRes.error &&
          error(<span>Duplicate integration: integration has already been added.</span>)}

        {addIsAGo && (
          <div className="mt-6 flex flex-row-reverse">
            <ThinButton
              onClick={() => {
                const { name: projectName } = checkAccessRes.data;

                addIntegrationCall({
                  jiraUrl,
                  jiraUser,
                  apiToken,
                  projectKey,
                  projectName,
                });
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

export const ShowJiraIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const jiraUrl = i.jira_url;

  const [apiToken, apiTokenInput] = useInput({
    type: "new-password",
    placeholder: "Jira API Token",
    className: InputClassName,
  });

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/check-access`
  );

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
  >(`/api/workspaces/${i.workspace_id}/integrations/jira/get-issue-by-name`);

  const [deleteIntegrationRes, deleteIntegrationCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`
  );

  const [updateApiTokenRes, updateApiTokenCall] = useServerApiPostWithPayload<
    any,
    { apiToken: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-token`);

  const [steps, setSteps] = React.useState<{
    check: number;
    create: number;
    del: number;
    hook: number;
    del_integration: number;
  }>({
    check: 0,
    create: 0,
    del: 0,
    hook: 0,
    del_integration: 0,
  });

  const [clear, setClear] = React.useState(0);

  const [deleting, setDeleting] = React.useState(false);

  const { progressElem: checkAccessProgressElem, progressDone: checkAccessProgressDone } =
    useProgress(checkAccessRes.loading === true, clear);

  const { progressElem: createIssueProgressElem, progressDone: createIssueProgressDone } =
    useProgress(createIssueRes.loading === true, clear);

  const { progressElem: deleteIssueProgressElem, progressDone: deleteIssueProgressDone } =
    useProgress(deleteIssueRes.loading === true, clear, 500);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const {
    progressElem: deleteIntegrationProgressElem,
    progressDone: deleteIntegrationProgressDone,
  } = useProgress(deleteIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  /* --- */

  React.useEffect(() => {
    if (steps.create === steps.check - 1 && checkAccessRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      createIssueCall({ issueTitle: issueTitleRef.current });
    }
  }, [steps, checkAccessProgressDone, checkAccessRes.data, checkAccessRes.error, createIssueCall]);

  React.useEffect(() => {
    if (
      steps.del === steps.create - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data &&
      issueTitleRef.current
    ) {
      const { id: issueId } = createIssueRes.data;

      deleteIssueCall({ issueId, issueTitle: issueTitleRef.current });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, deleteIssueCall]);

  React.useEffect(() => {
    if (
      steps.hook === steps.del - 1 &&
      deleteIssueRes.error === null &&
      deleteIssueRes.data &&
      issueTitleRef.current
    ) {
      checkWebhookCall({ issueTitle: issueTitleRef.current });
    }
  }, [steps, deleteIssueRes.data, deleteIssueRes.error, checkWebhookCall]);

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
        return { ...x, create: x.create + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, del: x.del + 1 };
      });
    }
  }, [deleteIssueProgressDone]);

  React.useEffect(() => {
    if (checkWebhookProgressDone) {
      setSteps(x => {
        return { ...x, hook: x.hook + 1 };
      });
    }
  }, [checkWebhookProgressDone]);

  React.useEffect(() => {
    if (deleteIntegrationProgressDone === true && deleteIntegrationRes.error === null) {
      setTimeout(() => onDeleted(), 0);
    }
  }, [deleteIntegrationProgressDone, deleteIntegrationRes, onDeleted]);

  /* --- */

  const [webhookLoading, webhookError, webhookData] = useServerApiGet<{
    webhook_secret: string;
  }>(`/api/workspaces/${i.workspace_id}/webhook`);

  const webhookUrl = React.useMemo(() => {
    if (webhookLoading !== true && webhookError === null) {
      return getWebhookUrl() + "/" + webhookData?.webhook_secret;
    }

    return undefined;
  }, [webhookLoading, webhookError, webhookData]);

  const [clipboardSignal, setClipboardSignal] = React.useState<ClipboardSignal>();

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        {configInputItem("Access Token:", apiTokenInput)}

        <div className="col-end-4 col-span-1 flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              updateApiTokenCall({ apiToken });
            }}
            loading={updateApiTokenRes.loading}
            disabled={apiToken === ""}
          >
            Update
          </ThinButton>
        </div>

        {readOnlyItem(
          "Jira URL:",
          <a className="fog:text-link" href={jiraUrl} rel="noopener" target="_blank">
            {jiraUrl}
          </a>
        )}

        {webhookLoading !== true &&
          webhookError === null &&
          webhookUrl &&
          configCopyItem(
            "Webhook URL:",
            webhookUrl,
            clipboard<ClipboardSignal>(
              webhookUrl,
              setClipboardSignal,
              clipboardSignal,
              "webhookUrl"
            )
          )}

        <div className="col-end-4 col-span-1 flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.check;
                return { check: y, create: y, del: y, hook: y, del_integration: y };
              });
              checkAccessCall({});
            }}
          >
            Test
          </ThinButton>
        </div>
        <div className="col-end-4 col-span-1 flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              setSteps(x => {
                const y = x.check;
                return {
                  check: y,
                  create: y,
                  del: y,
                  hook: y,
                  del_integration: y,
                };
              });
              setDeleting(true);
              deleteIntegrationCall();
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
        {checkAccessProgressDone &&
          checkAccessRes.error &&
          error("Bad access token or incorrect project key.")}
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
              The webhook is not working. Please contact support if you need help with
              configuration.
            </span>
          )}
        {deleting === true &&
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

type ClipboardSignal = {
  webhookUrl?: boolean;
  webhookSecret?: boolean;
};
