import classNames from "classnames";
import { useQuery } from "@tanstack/react-query";
import {
  IconGitHub,
  Icons,
  ThinButton,
  type Integration,
  useInput,
} from "fogbender-client/src/shared";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { apiServer } from "../../client";

import { getWebhookUrl, getGitHubAppName } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import { useServerApiPostWithPayload } from "../../useServerApi";

import {
  configInputItem,
  configListItem,
  error,
  InputClassName,
  operationStatus,
  operationStatusQuery,
  useProgress,
} from "./Utils";

export const AddGitHubIntegration = ({
  workspace,
  installationId,
  onDone,
  closing,
  context = "default",
}: {
  workspace: Workspace;
  installationId: null | string;
  onDone: () => void;
  closing: boolean;
  context?: "onboarding" | "default";
}) => {
  console.log({ onDone, closing });

  const stateObject = encodeURIComponent(JSON.stringify({ context }));

  const checkInstallationQuery = useQuery({
    queryKey: ["github_check_installation", installationId],
    queryFn: async () => {
      const url = `/api/workspaces/${workspace.id}/integrations/github/check-installation`;

      return await apiServer.url(url).post({ installationId }).json<
        | { id: string }
        | {
            error: "Must select single repository" | "No such installation";
            installation_url: string;
          }
      >();
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: !!installationId,
  });

  const location = useLocation();
  const navigate = useNavigate();

  const addIntegrationQuery = useQuery({
    queryKey: ["github_add_integration", workspace.id],
    queryFn: async () => {
      if (checkInstallationQuery.data) {
        const url = `/api/workspaces/${workspace.id}/integrations/github/add-integration`;
        const res = await apiServer.url(url).post({ installationId }).res();

        const searchParams = new URLSearchParams(location.search);
        searchParams.delete("installation_id");
        navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });

        onDone();

        return res;
      } else {
        return;
      }
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: checkInstallationQuery.isSuccess,
  });

  const errorMessage = (() => {
    if (checkInstallationQuery.error?.message) {
      const { error: message } = JSON.parse(checkInstallationQuery.error?.message);
      return message;
    }
  })();

  const fixUrl = (() => {
    if (errorMessage === "No such installation") {
      return `https://github.com/apps/${getGitHubAppName()}/installations/new?state=${stateObject}`;
    }

    return `https://github.com/apps/${getGitHubAppName()}/installations/${installationId}`;
  })();

  return (
    <>
      {installationId ? (
        <div className="flex flex-col gap-4 w-1/2">
          {operationStatusQuery("Checking installation", checkInstallationQuery)}

          {checkInstallationQuery.isError && (
            <div className="">
              {errorMessage} &mdash;{" "}
              <a
                className="fog:text-link no-underline cursor-pointer font-bold"
                target={errorMessage === "No such installation" ? undefined : "_blank"}
                href={fixUrl}
              >
                <span>CLICK TO FIX</span>
              </a>
            </div>
          )}

          {operationStatusQuery("Adding integration", addIntegrationQuery)}
        </div>
      ) : (
        <a
          className="no-underline"
          href={`https://github.com/apps/${getGitHubAppName()}/installations/new?state=${stateObject}`}
        >
          <div className="bg-[#238636] text-white font-medium w-36 h-11 rounded-lg flex items-center justify-center gap-2 hover:bg-[#1B6F2B]">
            <IconGitHub />
            <span>Connect</span>
          </div>
        </a>
      )}
    </>
  );
};

export const AddGitHubIntegrationOld: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [apiKey, apiKeyInput] = useInput({
    type: "password",
    placeholder: "GitHub Access Token",
    className: InputClassName,
  });

  const [repo, setRepo] = React.useState<string>();

  const [getRepositoriesRes, getRepositoriesCall] = useServerApiPostWithPayload<
    { id: string; full_name: string; html_url: string }[],
    {}
  >(`/api/workspaces/${workspace.id}/integrations/github/get-repositories`);

  const repositoryUrl = getRepositoriesRes?.data?.find(r => r.full_name === repo)?.html_url;

  const [createLabelRes, createLabelCall] = useServerApiPostWithPayload<
    any,
    { repo: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/create-label`);

  const [deleteLabelRes, deleteLabelCall] = useServerApiPostWithPayload<
    any,
    { labelId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/delete-label`);

  const [createWebhookRes, createWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string; repo: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/create-webhook`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { repo: string; issueTitle: string; apiKey: string; labelId: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { repo: string; issueNumber: string; issueTitle: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/delete-issue`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { apiKey: string; repo: string; webhookId: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/delete-webhook`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/github/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      repo: string;
      repositoryId: string;
      repositoryUrl: string;
      apiKey: string;
      fogbenderLabelId: string;
      webhookId: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/github/add-integration`);

  const [steps, setSteps] = React.useState<{
    create_issue: number;
    del_issue: number;
    create_webook: number;
    create_label: number;
    check_webhook: number;
  }>({
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
      getRepositoriesCall({ apiKey });
    }
  }, [apiKey, getRepositoriesCall]);

  React.useEffect(() => {
    if (steps.create_webook === steps.create_label - 1 && createLabelRes.error === null) {
      if (apiKey.length !== 0 && repo !== undefined && repo.length !== 0) {
        createWebhookCall({ apiKey, repo, webhookUrl: getWebhookUrl() });
      }
    }
  }, [steps, repo, apiKey, createWebhookCall, createLabelRes.error]);

  React.useEffect(() => {
    if (steps.create_issue === steps.create_webook - 1 && createWebhookRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      const { id: labelId } = createLabelRes.data;
      if (repo !== undefined) {
        createIssueCall({ issueTitle: issueTitleRef.current, apiKey, repo, labelId });
      }
    }
  }, [steps, createWebhookRes.error, createLabelRes.data, apiKey, repo, createIssueCall]);

  React.useEffect(() => {
    if (
      steps.del_issue === steps.create_issue - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { number: issueNumber, title: issueTitle } = createIssueRes.data;

      if (repo) {
        deleteIssueCall({
          repo,
          issueNumber,
          issueTitle,
          apiKey,
        });
      }
    }
  }, [steps, createIssueRes.data, createIssueRes.error, apiKey, deleteIssueCall, repo]);

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

      if (repo !== undefined && id !== undefined) {
        deleteWebhookCall({ apiKey, repo, webhookId: id });
      }
    }
  }, [cancelSteps, createWebhookRes.data, apiKey, deleteLabelRes.error, deleteWebhookCall, repo]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone && deleteWebhookRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [steps, deleteWebhookProgressDone, deleteWebhookRes.error, onDone]);

  /* --- */

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
    addIntegrationProgressDone === false &&
    addIntegrationInProgress === false;

  React.useEffect(() => {
    if (addIntegrationProgressDone === true && addIntegrationRes.error === null) {
      onDone();
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  const apiKeyHref =
    "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token";

  React.useEffect(() => {
    if (getRepositoriesRes.data !== null) {
      setRepo(getRepositoriesRes?.data?.map(r => r.full_name)[0]);
    }
  }, [getRepositoriesRes.data]);

  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-2">
        <p>
          This integration requires a personal access token&mdash;you can create one in{" "}
          {anchor("API settings", apiKeyHref)}. The token must be one of:
        </p>
        <p>
          • Classic token with at least <CodeSnippet>repo</CodeSnippet> and{" "}
          <CodeSnippet>admin:repo_hook</CodeSnippet> scopes selected
        </p>
        <p>
          • Fine-grained token with read and write access to <CodeSnippet>Issues</CodeSnippet> and{" "}
          <CodeSnippet>Webhooks</CodeSnippet>
        </p>
      </div>

      <div className="col-span-2">
        <div className="grid gap-2 grid-cols-3">
          {configInputItem("Access Token:", apiKeyInput)}

          {getRepositoriesRes?.data &&
            configListItem(
              "Repository:",
              getRepositoriesRes?.data?.map(r => r.full_name),
              repo,
              e => setRepo(e.target.value)
            )}

          <div className="col-start-1 flex items-center">
            <ThinButton
              disabled={testIsAGo !== true}
              className="w-14"
              onClick={() => {
                if (repo !== undefined && testIsAGo === true) {
                  setClear(x => x + 1);
                  setSteps(x => {
                    const y = x.create_label;
                    return {
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

                  createLabelCall({ apiKey, repo });
                }
              }}
            >
              {getRepositoriesRes.loading === true ? (
                <Icons.Spinner className="w-3 text-blue-500" />
              ) : (
                <span>Test</span>
              )}
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
        {createLabelProgressDone &&
          operationStatus(
            "Adding webhook",
            createWebhookProgressDone,
            createWebhookRes,
            createWebhookProgressElem
          )}
        {createLabelProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Creating test issue",
            createIssueProgressDone,
            createIssueRes,
            createIssueProgressElem
          )}
        {createLabelProgressDone &&
          createIssueProgressDone &&
          operationStatus(
            "Closing test issue",
            deleteIssueProgressDone,
            deleteIssueRes,
            deleteIssueProgressElem
          )}
        {createLabelProgressDone &&
          createIssueProgressDone &&
          deleteIssueProgressDone &&
          operationStatus(
            "Testing webhook",
            checkWebhookProgressDone,
            checkWebhookRes,
            checkWebhookProgressElem
          )}
        {operationStatus(
          "Deleting 'fogbender' label",
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
        {getRepositoriesRes.error && error("Bad access token")}
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
              The webhook in <b>{repo}</b> is not working. Please contact support if you need help
              with configuration.
            </span>
          )}
        {addIntegrationProgressDone &&
          addIntegrationRes.error &&
          error(
            <span>
              Duplicate integration: <b>TEAM</b> has already been added.
            </span>
          )}

        <div className={classNames("mt-6 flex flex-row-reverse")}>
          <ThinButton
            disabled={addIsAGo !== true}
            onClick={() => {
              const repository = getRepositoriesRes.data?.find(r => r.full_name === repo);
              const { id: fogbenderLabelId } = createLabelRes.data;
              const { id: webhookId } = createWebhookRes.data;

              if (
                repo !== undefined &&
                repositoryUrl !== undefined &&
                repository !== undefined &&
                webhookId !== undefined
              ) {
                addIntegrationCall({
                  repo,
                  repositoryId: repository.id,
                  repositoryUrl,
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
      </div>
    </div>
  );
};

export const ShowGitHubIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i }) => {
  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-1">
          <div>Repository:</div>
          {anchor(i.project_name, i.project_url)}
        </div>
        <a
          className="no-underline"
          target="_blank"
          href={`https://github.com/apps/${getGitHubAppName()}/installations/${i.installation_id}`}
        >
          <div className="bg-[#238636] text-white font-medium w-32 h-10 rounded-lg flex items-center justify-center gap-2 hover:bg-[#1B6F2B]">
            <IconGitHub />
            <span>Manage</span>
          </div>
        </a>
      </div>
    </div>
  );
};

const CodeSnippet = ({ children }: { children?: React.ReactNode }) => {
  return (
    <code className={"py-0.5 px-1 rounded bg-yellow-200 dark:text-black text-sm"}>{children}</code>
  );
};

const anchor = (text: string, url: string) => (
  <a className="fog:text-link" target="_blank" rel="noopener" href={url}>
    {text}
  </a>
);
