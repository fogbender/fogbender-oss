import { ThinButton, type Integration, useInput } from "fogbender-client/src/shared";
import React from "react";

import { getWebhookUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
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

export const AddGitLabIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [gitLabUrl, gitLabUrlInput] = useInput({
    type: "text",
    placeholder: "https://gitlab.com",
    defaultValue: "https://gitlab.com",
    className: InputClassName,
    inline: true,
  });

  const [projectPath, projectPathInput] = useInput({
    type: "text",
    placeholder: "GitLab project full path (e.g. megacorp/superapp)",
    className: InputClassName,
  });

  const [accessToken, accessTokenInput] = useInput({
    type: "password",
    placeholder: "GitLab access token",
    className: InputClassName,
  });

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<
    any,
    { projectPath: string; accessToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/gitlab/check-access`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { projectId: string; issueTitle: string; accessToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/gitlab/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { projectId: string; issueIid: string; issueTitle: string; accessToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/gitlab/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/gitlab/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      projectId: string;
      projectPath: string;
      projectName: string;
      projectUrl: string;
      accessToken: string;
      gitLabUrl: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/gitlab/add-integration`);

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
      const { id: projectId } = checkAccessRes.data;
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      createIssueCall({ projectId, issueTitle: issueTitleRef.current, accessToken });
    }
  }, [
    steps,
    checkAccessProgressDone,
    checkAccessRes.data,
    checkAccessRes.error,
    accessToken,
    projectPath,
    createIssueCall,
  ]);

  React.useEffect(() => {
    if (steps.del === steps.create - 1 && createIssueRes.error === null && createIssueRes.data) {
      const { iid: issueIid, title: issueTitle } = createIssueRes.data;

      deleteIssueCall({
        projectId: encodeURIComponent(projectPath),
        issueIid,
        issueTitle,
        accessToken,
      });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, accessToken, deleteIssueCall, projectPath]);

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

  const testIsAGo = projectPath.trim().length !== 0 && accessToken.trim().length !== 0;

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

  const gitLabHooksUrl = `${gitLabUrl}/${projectPath}/hooks`;

  const [clipboardSignal, setClipboardSignal] = React.useState<ClipboardSignal>();

  React.useEffect(() => {
    if (addIntegrationProgressDone && addIntegrationRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  const personalTokenHref = "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html";
  const projectTokenHref =
    "https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html";
  const accessTokenHref = "https://docs.gitlab.com/search/?query=access+tokens";

  const createPersonalTokenHref =
    "https://gitlab.com/-/profile/personal_access_tokens?name=Fogbender&scopes=api";

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
          This integration requires a {anchor("personal", personalTokenHref)} or{" "}
          {anchor("project", projectTokenHref)} GitLab access token.{" "}
          {anchor("Click here", createPersonalTokenHref)} to create a personal token.
        </p>
        <br />
        <p>
          The minimal permission scope your token must have is{" "}
          <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">api</code>.
        </p>
        <br />
        <p>
          To learn more about GitLab access tokens, see {anchor(accessTokenHref, accessTokenHref)}.
        </p>
        <br />
      </div>

      <div className="col-span-2 grid gap-2 grid-cols-3">
        {configInputItem("GitLab URL:", gitLabUrlInput)}

        {configInputItem("Access token:", accessTokenInput)}

        {configInputItem("Project full path:", projectPathInput)}

        {configCopyItem(
          "Webhook URL:",
          getWebhookUrl(),
          clipboard<ClipboardSignal>(
            getWebhookUrl(),
            setClipboardSignal,
            clipboardSignal,
            "webhookUrl"
          )
        )}

        {webhookData?.webhook_secret &&
          configCopyItem(
            "Webhook secret token:",
            secret(webhookLoading, webhookError, webhookData),
            clipboard<ClipboardSignal>(
              webhookData.webhook_secret,
              setClipboardSignal,
              clipboardSignal,
              "webhookSecret"
            )
          )}

        {gitLabUrl && projectPath && (
          <div className="col-span-3">
            To set the webhook, go to{" "}
            <a href={gitLabHooksUrl} target="_blank" rel="noopener">
              {gitLabHooksUrl}
            </a>{" "}
            and select <b>Comments</b> and <b>Issues events</b>.
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
              checkAccessCall({ projectPath, accessToken });
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
              The webhook in <b>{projectPath}</b> is not working. Please contact support if you need
              help with configuration.
            </span>
          )}
        {addIntegrationProgressDone &&
          addIntegrationRes.error &&
          error(
            <span>
              Duplicate integration: <b>{projectPath}</b> has already been added.
            </span>
          )}

        {addIsAGo && (
          <div className="mt-6 flex flex-row-reverse">
            <ThinButton
              onClick={() => {
                const {
                  id: projectId,
                  name: projectName,
                  web_url: projectUrl,
                } = checkAccessRes.data;

                addIntegrationCall({
                  projectId,
                  projectPath,
                  projectName,
                  gitLabUrl,
                  projectUrl,
                  accessToken,
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

export const ShowGitLabIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const gitLabUrl = i.base_url;
  const projectPath = i.project_path;

  const [accessToken, accessTokenInput] = useInput({
    type: "new-password",
    placeholder: "GitLab Access Token",
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
    { issueIid: string; issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/gitlab/get-issue-by-name`);

  const [deleteIntegrationRes, deleteIntegrationCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`
  );

  const [updateApiKeyRes, updateApiKeyCall] = useServerApiPostWithPayload<any, { apiKey: string }>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`
  );

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
  }, [
    steps,
    checkAccessProgressDone,
    checkAccessRes.data,
    checkAccessRes.error,
    projectPath,
    createIssueCall,
  ]);

  React.useEffect(() => {
    if (steps.del === steps.create - 1 && createIssueRes.error === null && createIssueRes.data) {
      const { iid: issueIid, title: issueTitle } = createIssueRes.data;

      deleteIssueCall({ issueIid, issueTitle });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, deleteIssueCall]);

  React.useEffect(() => {
    if (steps.hook === steps.del - 1 && deleteIssueRes.error === null && deleteIssueRes.data) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
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

        {readOnlyItem("GitLab URL:", gitLabUrl)}

        {readOnlyItem("Project full path:", projectPath)}

        {readOnlyItem("Webhook URL:", getWebhookUrl())}

        {webhookData?.webhook_secret &&
          readOnlyItem("Webhook secret token:", secret(webhookLoading, webhookError, webhookData))}

        <div className="flex justify-end">
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
              The webhook in <b>{projectPath}</b> is not working. Please contact support if you need
              help with configuration.
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

function secret(
  webhookLoading: boolean,
  webhookError: Error | null,
  webhookData: { webhook_secret: string } | null
) {
  return (
    <span>
      {webhookLoading && (
        <span className="animate-spin-fast text-2xl font-bold inline-block">+</span>
      )}
      {webhookData && webhookData.webhook_secret && <span>{webhookData.webhook_secret}</span>}
      {webhookError !== null && <span className="font-bold text-red-500">ERROR</span>}
    </span>
  );
}
