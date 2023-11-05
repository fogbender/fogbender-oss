import { type Integration, ThinButton, useInput } from "fogbender-client/src/shared";
import React from "react";

import { getTrelloDeveloperApiKey, getWebhookUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import { useServerApiGet, useServerApiPostWithPayload } from "../../useServerApi";

import {
  configInputItem,
  configListItem,
  error,
  InputClassName,
  operationStatus,
  useProgress,
} from "./Utils";

export const AddTrelloIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [token, tokenInput] = useInput({
    type: "password",
    placeholder: "Trello User Token",
    className: InputClassName,
  });

  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<any, { token: string }>(
    `/api/workspaces/${workspace.id}/integrations/trello/check-access`
  );

  const [checkAccessRes0, checkAccessCall0] = useServerApiPostWithPayload<any, { token: string }>(
    `/api/workspaces/${workspace.id}/integrations/trello/check-access`
  );

  const [boardShortUrl, setBoardShortUrl] = React.useState<string>();

  const idBoard = React.useMemo(() => {
    if (boardShortUrl) {
      const [shortUrl] = boardShortUrl.split(" (");
      const board = checkAccessRes0.data.find((b: { shortUrl: string }) => b.shortUrl === shortUrl);

      if (board) {
        const { id } = board;

        return id;
      }
    } else if (checkAccessRes0.data) {
      const board = checkAccessRes0.data[0];

      if (board) {
        const { id } = board;

        return id;
      }
    }
  }, [checkAccessRes0.data, boardShortUrl]);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { idBoard: string; issueTitle: string; token: string }
  >(`/api/workspaces/${workspace.id}/integrations/trello/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { cardId: string; cardName: string; token: string }
  >(`/api/workspaces/${workspace.id}/integrations/trello/delete-issue`);

  const [createWebhookRes, createWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string; token: string; idBoard: string }
  >(`/api/workspaces/${workspace.id}/integrations/trello/create-webhook`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookId: string; token: string }
  >(`/api/workspaces/${workspace.id}/integrations/trello/delete-webhook`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/trello/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      projectId: string;
      projectName: string;
      projectUrl: string;
      webhookId: string;
      token: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/trello/add-integration`);

  const [webhookLoading, webhookError, webhookData] = useServerApiGet<{
    webhook_secret: string;
  }>(`/api/workspaces/${workspace.id}/webhook`);

  const webhookUrl = React.useMemo(() => {
    if (webhookLoading !== true && webhookError === null && webhookData !== null) {
      return `${getWebhookUrl()}/${webhookData?.webhook_secret}`;
    }
    return;
  }, [webhookLoading, webhookError, webhookData]);

  const [steps, setSteps] = React.useState<{
    check_access: number;
    create_task: number;
    delete_task: number;
    create_webhook: number;
    check_webhook: number;
  }>({
    check_access: 0,
    create_task: 0,
    delete_task: 0,
    create_webhook: 0,
    check_webhook: 0,
  });

  /*
  const [cancelSteps, setCancelSteps] = React.useState<{
    delete_webhook: number;
  }>({
    delete_webhook: 0,
  });
  */

  const [clear, setClear] = React.useState(0);

  const { progressElem: checkAccessProgressElem, progressDone: checkAccessProgressDone } =
    useProgress(checkAccessRes.loading === true, clear);

  const { progressElem: createIssueProgressElem, progressDone: createIssueProgressDone } =
    useProgress(createIssueRes.loading === true, clear);

  const { progressElem: deleteIssueProgressElem, progressDone: deleteIssueProgressDone } =
    useProgress(deleteIssueRes.loading === true, clear, 500);

  const { progressElem: createWebhookProgressElem, progressDone: createWebhookProgressDone } =
    useProgress(createWebhookRes.loading === true, clear);

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const {
    progressElem: addIntegrationProgressElem,
    progressDone: addIntegrationProgressDone,
    inProgress: addIntegrationInProgress,
  } = useProgress(addIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  React.useEffect(() => {
    if (
      steps.create_webhook === steps.check_access - 1 &&
      checkAccessRes.error === null &&
      webhookUrl !== undefined
    ) {
      if (idBoard) {
        createWebhookCall({ webhookUrl, token, idBoard });
      }
    }
  }, [
    idBoard,
    steps,
    checkAccessProgressDone,
    checkAccessRes.error,
    token,
    createWebhookCall,
    webhookUrl,
  ]);

  React.useEffect(() => {
    if (
      steps.create_task === steps.create_webhook - 1 &&
      createWebhookRes.data !== null &&
      createWebhookRes.error === null
    ) {
      if (idBoard) {
        issueTitleRef.current = `Fogbender test ${Math.random()}`;
        createIssueCall({ idBoard, issueTitle: issueTitleRef.current, token });
      }
    }
  }, [
    idBoard,
    steps,
    createWebhookProgressDone,
    createWebhookRes.data,
    createWebhookRes.error,
    token,
    createIssueCall,
  ]);

  React.useEffect(() => {
    if (
      steps.delete_task === steps.create_task - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { id: cardId, name: cardName } = createIssueRes.data;

      deleteIssueCall({
        cardId,
        cardName,
        token,
      });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, token, deleteIssueCall]);

  React.useEffect(() => {
    if (
      steps.check_webhook === steps.delete_task - 1 &&
      deleteIssueRes.error === null &&
      deleteIssueRes.data
    ) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
    }
  }, [steps, deleteIssueRes.data, deleteIssueRes.error, checkWebhookCall]);

  React.useEffect(() => {
    if (checkAccessProgressDone) {
      setSteps(x => {
        return { ...x, check_access: x.check_access + 1 };
      });
    }
  }, [checkAccessProgressDone]);

  React.useEffect(() => {
    if (createWebhookProgressDone) {
      setSteps(x => {
        return { ...x, create_webhook: x.create_webhook + 1 };
      });
    }
  }, [createWebhookProgressDone]);

  React.useEffect(() => {
    if (createIssueProgressDone) {
      setSteps(x => {
        return { ...x, create_task: x.create_task + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, delete_task: x.delete_task + 1 };
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

  const testIsAGo = token.trim().length !== 0;

  const lockStep = Object.values(steps).filter((v, i, a) => a.indexOf(v) === i);

  const addIsAGo =
    !(
      checkAccessRes.error ||
      createWebhookRes.error ||
      createIssueRes.error ||
      deleteIssueRes.error ||
      checkWebhookRes.error
    ) &&
    lockStep.length === 1 &&
    lockStep[0] > 0 &&
    checkAccessProgressDone === true &&
    addIntegrationProgressDone === false &&
    addIntegrationInProgress === false;

  React.useEffect(() => {
    if (addIntegrationProgressDone && addIntegrationRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  React.useEffect(() => {
    if (token) {
      checkAccessCall0({ token });
    }
  }, [checkAccessCall0, token]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone && deleteWebhookRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [steps, deleteWebhookProgressDone, deleteWebhookRes.error, onDone]);

  React.useEffect(() => {
    if (closing === true) {
      if (createWebhookProgressDone) {
        if (deleteWebhookProgressDone) {
          onDone();
        } else {
          const { id: webhookId } = createWebhookRes.data;

          if (webhookId !== undefined) {
            deleteWebhookCall({ webhookId, token });
          }
        }
      } else {
        onDone();
      }
    }
  }, [
    token,
    closing,
    deleteWebhookCall,
    createWebhookRes.data,
    onDone,
    createWebhookProgressDone,
    deleteWebhookProgressDone,
  ]);

  const createTokenUrl = `https://trello.com/1/authorize?expiration=never&name=Fogbender&scope=read,write&response_type=token&key=${getTrelloDeveloperApiKey()}`;

  const anchor = (text: string, url: string) => (
    <a target="_blank" rel="noopener" href={url}>
      {text}
    </a>
  );

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2">
        <i>
          We recommend creating a new Trello user account (e.g. an email group
          fogbender@[yourdomain]) for this integration.
        </i>
        <br />
        <p>First, {anchor("create your Trello User Token", createTokenUrl)}</p>
      </div>

      <div className="col-span-2 grid gap-2 grid-cols-3">
        {configInputItem("Trello User Token:", tokenInput)}

        {checkAccessRes0?.data &&
          configListItem(
            "Board:",
            checkAccessRes0?.data?.map(
              (b: { shortUrl: string; name: string }) => `${b.shortUrl} (${b.name})`
            ),
            boardShortUrl,
            e => setBoardShortUrl(e.target.value)
          )}

        <div className="my-4 col-start-1">
          <ThinButton
            disabled={!testIsAGo}
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.check_access;
                return {
                  check_access: y,
                  create_task: y,
                  delete_task: y,
                  create_webhook: y,
                  check_webhook: y,
                };
              });
              /*
              setCancelSteps(x => {
                return {
                  delete_webhook: 0,
                };
              });
              */

              checkAccessCall({ token });
            }}
          >
            Test
          </ThinButton>
        </div>
        {checkWebhookProgressDone && checkWebhookRes.error === null && (
          <div className="my-4 col-end-4 flex justify-end">
            <ThinButton
              onClick={() => {
                const { id: webhookId } = createWebhookRes.data;

                if (webhookId !== undefined) {
                  deleteWebhookCall({ webhookId, token });
                }
              }}
            >
              Cancel
            </ThinButton>
          </div>
        )}
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
            "Creating webhook",
            createWebhookProgressDone,
            createWebhookRes,
            createWebhookProgressElem
          )}
        {checkAccessProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Creating test issue",
            createIssueProgressDone,
            createIssueRes,
            createIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createIssueProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Deleting test issue",
            deleteIssueProgressDone,
            deleteIssueRes,
            deleteIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createWebhookProgressDone &&
          createIssueProgressDone &&
          deleteIssueProgressDone &&
          operationStatus(
            "Testing webhook",
            checkWebhookProgressDone,
            checkWebhookRes,
            checkWebhookProgressElem
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
          error("Bad api key or incorrect project full path.")}
        {createIssueProgressDone &&
          createIssueRes.error &&
          error(
            <span>
              This API key comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {deleteIssueProgressDone &&
          deleteIssueRes.error &&
          error(
            <span>
              This API key comes with insufficient permissions (<b>api</b> scope required)
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
          error(<span>Duplicate integration</span>)}

        {addIsAGo && (
          <div className="mt-6 flex flex-row-reverse">
            <ThinButton
              onClick={() => {
                const board = checkAccessRes.data.find((b: { id: string }) => b.id === idBoard);

                if (board) {
                  const { url, id, name } = board;
                  const { id: webhookId } = createWebhookRes.data;

                  if ([id, name, url].some(x => x === undefined) === false) {
                    addIntegrationCall({
                      projectId: id,
                      projectName: name,
                      projectUrl: url,
                      webhookId,
                      token,
                    });
                  }
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

export const ShowTrelloIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const [token, tokenInput] = useInput({
    type: "password",
    placeholder: "Trello User Token",
    className: InputClassName,
    defaultValue: "*************************",
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
    { cardId: string; cardName: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/trello/get-issue-by-name`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookId: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-webhook`);

  const [deleteIntegrationRes, deleteIntegrationCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`
  );

  const [updateApiKeyRes, updateApiKeyCall] = useServerApiPostWithPayload<any, { token: string }>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`
  );

  const [steps, setSteps] = React.useState<{
    check_access: number;
    create_task: number;
    delete_task: number;
    check_webhook: number;
    delete_webhook: number;
    delete_integration: number;
  }>({
    check_access: 0,
    create_task: 0,
    delete_task: 0,
    check_webhook: 0,
    delete_webhook: 0,
    delete_integration: 0,
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

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const {
    progressElem: deleteIntegrationProgressElem,
    progressDone: deleteIntegrationProgressDone,
  } = useProgress(deleteIntegrationRes.loading === true, clear);

  const issueTitleRef = React.useRef<string>();

  /* --- */

  React.useEffect(() => {
    if (steps.create_task === steps.check_access - 1 && checkAccessRes.error === null) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      createIssueCall({ issueTitle: issueTitleRef.current });
    }
  }, [steps, checkAccessProgressDone, checkAccessRes.data, checkAccessRes.error, createIssueCall]);

  React.useEffect(() => {
    if (
      steps.delete_task === steps.create_task - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { id: cardId, name: cardName } = createIssueRes.data;

      deleteIssueCall({ cardId, cardName });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, deleteIssueCall]);

  React.useEffect(() => {
    if (
      steps.check_webhook === steps.delete_task - 1 &&
      deleteIssueRes.error === null &&
      deleteIssueRes.data
    ) {
      if (issueTitleRef.current) {
        checkWebhookCall({ issueTitle: issueTitleRef.current });
      }
    }
  }, [steps, deleteIssueRes.data, deleteIssueRes.error, checkWebhookCall]);

  /* --- */

  React.useEffect(() => {
    if (checkAccessProgressDone) {
      setSteps(x => {
        return { ...x, check_access: x.check_access + 1 };
      });
    }
  }, [checkAccessProgressDone]);

  React.useEffect(() => {
    if (createIssueProgressDone) {
      setSteps(x => {
        return { ...x, create_task: x.create_task + 1 };
      });
    }
  }, [createIssueProgressDone]);

  React.useEffect(() => {
    if (deleteIssueProgressDone) {
      setSteps(x => {
        return { ...x, delete_task: x.delete_task + 1 };
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
    if (deleteWebhookProgressDone) {
      setSteps(x => {
        return { ...x, delete_webhook: x.delete_webhook + 1 };
      });
    }
  }, [deleteWebhookProgressDone]);

  React.useEffect(() => {
    if (deleteIntegrationProgressDone === true && deleteIntegrationRes.error === null) {
      setTimeout(() => onDeleted(), 0);
    }
  }, [deleteIntegrationProgressDone, deleteIntegrationRes, onDeleted]);

  React.useEffect(() => {
    if (steps.delete_integration === steps.delete_webhook - 1 && deleteWebhookRes.error === null) {
      deleteIntegrationCall();
    }
  }, [steps, deleteWebhookRes.error, deleteIntegrationCall]);

  /* --- */

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        {configInputItem("API key:", tokenInput)}

        <div className="flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              updateApiKeyCall({ token });
            }}
            loading={updateApiKeyRes.loading}
          >
            Update
          </ThinButton>
        </div>

        <div className="flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.check_access;
                return {
                  check_access: y,
                  create_task: y,
                  delete_task: y,
                  check_webhook: y,
                  delete_webhook: y,
                  delete_integration: y,
                };
              });
              checkAccessCall({});
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
                const y = x.check_access;
                return {
                  check_access: y,
                  create_task: y,
                  delete_task: y,
                  check_webhook: y,
                  delete_webhook: y,
                  delete_integration: y,
                };
              });
              setDeleting(true);

              const webhookId = i.webhook_id;

              if (webhookId !== undefined) {
                deleteWebhookCall({ webhookId });
              }
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
        {checkAccessProgressDone && checkAccessRes.error && error("Bad API key")}
        {createIssueProgressDone &&
          createIssueRes.error &&
          error(
            <span>
              This API key comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {deleteIssueProgressDone &&
          deleteIssueRes.error &&
          error(
            <span>
              This API key comes with insufficient permissions (<b>api</b> scope required)
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
