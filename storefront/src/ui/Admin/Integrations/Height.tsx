import classNames from "classnames";
import { ThinButton, type Integration } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl, getWebhookUrl } from "../../../config";
import { type Workspace } from "../../../redux/adminApi";
import {
  fetchServerApiPost,
  filterOutResponse,
  useServerApiGet,
  useServerApiPostWithPayload,
} from "../../useServerApi";

import { error, IntegrationUser, operationStatus, readOnlyItem, useProgress } from "./Utils";

export const AddHeightIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [newOauthConnection, setNewOauthConnection] = React.useState<OauthCodeExchange>();
  const userToken = newOauthConnection?.userToken || "";
  const userInfo = newOauthConnection?.userInfo; // to make typescript happy
  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<any, { userToken: string }>(
    `/api/workspaces/${workspace.id}/integrations/height/check-access`
  );

  const [checkAccessRes0, checkAccessCall0] = useServerApiPostWithPayload<
    any,
    { userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/check-access`);

  const [createFogbenderListRes, createFogbenderListCall] = useServerApiPostWithPayload<
    any,
    { userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/create-fogbender-list`);

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { fogbenderListId: string; issueTitle: string; userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { taskId: string; taskName: string; userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/delete-issue`);

  const [createWebhookRes, createWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string; userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/create-webhook`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookId: string; userToken: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/delete-webhook`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${workspace.id}/integrations/height/get-issue-by-name`);

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      projectId: string;
      projectName: string;
      projectUrl: string;
      fogbenderListId: string;
      userToken: string;
      userInfo: Integration["userInfo"];
    }
  >(`/api/workspaces/${workspace.id}/integrations/height/add-integration`);

  const [webhookLoading, webhookError, webhookData] = useServerApiGet<{
    webhook_secret: string;
  }>(`/api/workspaces/${workspace.id}/webhook`);

  const webhookUrl = React.useMemo(() => {
    if (webhookLoading !== true && webhookError === null && webhookData !== null) {
      if (
        checkAccessRes0.loading !== true &&
        checkAccessRes0.error === null &&
        checkAccessRes0.data !== null
      ) {
        const { id } = checkAccessRes0.data;

        if (id !== undefined) {
          return `${getWebhookUrl()}/${webhookData?.webhook_secret}?workspaceId=${id}`;
        }
      }
    }
    return;
  }, [
    webhookLoading,
    webhookError,
    webhookData,
    checkAccessRes0.loading,
    checkAccessRes0.data,
    checkAccessRes0.error,
  ]);

  const [steps, setSteps] = React.useState<{
    check_access: number;
    create_list: number;
    create_task: number;
    delete_task: number;
    create_webhook: number;
    check_webhook: number;
  }>({
    check_access: 0,
    create_list: 0,
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

  const {
    progressElem: createFogbenderListProgressElem,
    progressDone: createFogbenderListProgressDone,
  } = useProgress(createFogbenderListRes.loading === true, clear);

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
    if (steps.create_list === steps.check_access - 1 && checkAccessRes.error === null) {
      createFogbenderListCall(newOauthConnection);
    }
  }, [
    steps,
    checkAccessProgressDone,
    checkAccessRes.data,
    checkAccessRes.error,
    createFogbenderListCall,
    newOauthConnection,
  ]);

  React.useEffect(() => {
    if (
      steps.create_webhook === steps.create_list - 1 &&
      createFogbenderListRes.error === null &&
      webhookUrl !== undefined
    ) {
      createWebhookCall({ webhookUrl, userToken });
    }
  }, [
    steps,
    createFogbenderListProgressDone,
    createFogbenderListRes.error,
    userToken,
    createWebhookCall,
    webhookUrl,
  ]);

  React.useEffect(() => {
    if (
      steps.create_task === steps.create_webhook - 1 &&
      createWebhookRes.data !== null &&
      createWebhookRes.error === null
    ) {
      issueTitleRef.current = `Fogbender test ${Math.random()}`;
      const { id: fogbenderListId } = createFogbenderListRes.data;
      createIssueCall({
        fogbenderListId,
        issueTitle: issueTitleRef.current,
        userToken,
      });
    }
  }, [
    steps,
    createWebhookProgressDone,
    createFogbenderListRes.data,
    createWebhookRes.data,
    createWebhookRes.error,
    userToken,
    createIssueCall,
  ]);

  React.useEffect(() => {
    if (
      steps.delete_task === steps.create_task - 1 &&
      createIssueRes.error === null &&
      createIssueRes.data
    ) {
      const { id: taskId, name: taskName } = createIssueRes.data;

      deleteIssueCall({
        taskId,
        taskName,
        userToken,
      });
    }
  }, [steps, createIssueRes.data, createIssueRes.error, userToken, deleteIssueCall]);

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
    if (createFogbenderListProgressDone) {
      setSteps(x => {
        return { ...x, create_list: x.create_list + 1 };
      });
    }
  }, [createFogbenderListProgressDone]);

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

  const testIsAGo = !!newOauthConnection;

  const lockStep = Object.values(steps).filter((v, i, a) => a.indexOf(v) === i);

  const addIsAGo =
    !(
      checkAccessRes.error ||
      createFogbenderListRes.error ||
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
    if (newOauthConnection?.userToken) {
      checkAccessCall0({ userToken: newOauthConnection?.userToken });
    }
  }, [checkAccessCall0, newOauthConnection?.userToken]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone && deleteWebhookRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [steps, deleteWebhookProgressDone, deleteWebhookRes.error, onDone]);

  React.useEffect(() => {
    if (closing === true) {
      if (
        userToken.length === 0 ||
        createWebhookRes.error !== null ||
        (createWebhookRes.error === null && deleteWebhookProgressDone === true)
      ) {
        onDone();
      } else {
        if (createWebhookRes.data !== null) {
          const { id: webhookId } = createWebhookRes.data;

          if (webhookId !== undefined) {
            deleteWebhookCall({ webhookId, userToken });
          }
        }
      }
    }
  }, [
    userToken,
    closing,
    deleteWebhookCall,
    createWebhookRes.data,
    onDone,
    deleteWebhookProgressDone,
    createWebhookRes,
  ]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2">
        <HeightOAuth workspaceId={workspace.id} onSuccess={setNewOauthConnection} />
      </div>

      <div className="col-span-2 grid gap-2 grid-cols-3">
        {checkAccessRes0.loading !== true &&
          checkAccessRes0.data !== null &&
          checkAccessRes0.error === null &&
          readOnlyItem("Workspace:", checkAccessRes0.data.name)}

        <div className="my-4 col-start-1">
          <ThinButton
            disabled={!testIsAGo}
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.check_access;
                return {
                  check_access: y,
                  create_list: y,
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

              checkAccessCall(newOauthConnection);
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
                  deleteWebhookCall({ webhookId, userToken });
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
            <span>
              Creating{" "}
              <span className="text-sm bg-purple-500 text-white font-bold px-1.5 rounded">
                fogbender
              </span>{" "}
              list
            </span>,
            createFogbenderListProgressDone,
            createFogbenderListRes,
            createFogbenderListProgressElem
          )}
        {checkAccessProgressDone &&
          createFogbenderListProgressDone &&
          operationStatus(
            "Creating webhook",
            createWebhookProgressDone,
            createWebhookRes,
            createWebhookProgressElem
          )}
        {checkAccessProgressDone &&
          createFogbenderListProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Creating test issue",
            createIssueProgressDone,
            createIssueRes,
            createIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createFogbenderListProgressDone &&
          createIssueProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Deleting test issue",
            deleteIssueProgressDone,
            deleteIssueRes,
            deleteIssueProgressElem
          )}
        {checkAccessProgressDone &&
          createFogbenderListProgressDone &&
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
          error("Authentication error - please ping us in support for help")}
        {createIssueProgressDone &&
          createIssueRes.error &&
          error(<span>Could not create test issue - please ping us in support for help</span>)}
        {deleteIssueProgressDone &&
          deleteIssueRes.error &&
          error(<span>Could not delete test issue - please ping us in support for help</span>)}
        {checkWebhookProgressDone &&
          checkWebhookRes.error &&
          error(<span>The webhook is not working - please ping us in support for help</span>)}
        {addIntegrationProgressDone &&
          addIntegrationRes.error &&
          error(<span>Duplicate integration</span>)}

        {addIsAGo && (
          <div className="mt-6 flex flex-row-reverse">
            <ThinButton
              onClick={() => {
                const { id, name, url } = checkAccessRes.data;
                const { id: fogbenderListId } = createFogbenderListRes.data;

                if ([id, name, url, fogbenderListId].some(x => x === undefined) === false) {
                  addIntegrationCall({
                    projectId: id,
                    projectName: name,
                    projectUrl: url,
                    fogbenderListId,
                    userToken,
                    userInfo,
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

export const ShowHeightIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const [checkAccessRes, checkAccessCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/check-access`
  );

  const [createIssueRes, createIssueCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/create-issue`);

  const [deleteIssueRes, deleteIssueCall] = useServerApiPostWithPayload<
    any,
    { taskId: string; taskName: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-issue`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<
    any,
    { issueTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/height/get-issue-by-name`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-webhook`);

  const [deleteIntegrationRes, deleteIntegrationCall] = useServerApiPostWithPayload<any, {}>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete`
  );

  const [updateApiKeyRes, updateApiKeyCall] = useServerApiPostWithPayload<any, OauthCodeExchange>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/update-api-key`
  );

  const [webhookLoading, webhookError, webhookData] = useServerApiGet<{
    webhook_secret: string;
  }>(`/api/workspaces/${i.workspace_id}/webhook`);

  const webhookUrl = React.useMemo(() => {
    if (webhookLoading !== true && webhookError === null && webhookData !== null) {
      return `${getWebhookUrl()}/${webhookData?.webhook_secret}?workspaceId=${i.project_id}`;
    }
    return;
  }, [webhookLoading, webhookError, webhookData, i.project_id]);

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
      const { id: taskId, name: taskName } = createIssueRes.data;

      deleteIssueCall({ taskId, taskName });
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

  // TODO: we expect this value to be alwasys set after all users migrate, so let's remove this check in July 2022
  const existingOauthUser = i.userInfo;

  const [newOauthConnection, setNewOauthConnection] = React.useState<OauthCodeExchange>();

  /* --- */

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div>{existingOauthUser ? "Current user:" : "Connect new user:"}</div>
          <HeightOAuth
            userInfo={existingOauthUser}
            workspaceId={i.workspace_id}
            onSuccess={setNewOauthConnection}
          />
        </div>

        <div className="col-end-4 col-span-1 flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              newOauthConnection && updateApiKeyCall(newOauthConnection);
            }}
            loading={updateApiKeyRes.loading}
            disabled={newOauthConnection === undefined}
          >
            Update
          </ThinButton>
        </div>

        <div className="col-end-4 col-span-1 flex justify-end">
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
        <div className="col-end-4 col-span-1 flex justify-end">
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

              if (webhookUrl !== undefined) {
                deleteWebhookCall({ webhookUrl });
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
        {checkAccessProgressDone &&
          checkAccessRes.error &&
          error("Bad user token, please try signing in again")}
        {createIssueProgressDone &&
          createIssueRes.error &&
          error(<span>Could not create a test issue - please ping us in support for help</span>)}
        {deleteIssueProgressDone &&
          deleteIssueRes.error &&
          error(<span>Could not delete a test issue - please ping us in support for help</span>)}
        {checkWebhookProgressDone &&
          checkWebhookRes.error &&
          error(<span>The webhook is not working - please ping us in support for help</span>)}
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

type OauthCodeExchange = {
  userInfo: {
    email: string;
    pictureUrl: string;
    username: string;
  };
  userToken: string;
};

const HeightOAuth: React.FC<{
  userInfo?: Integration["userInfo"];
  workspaceId: string;
  onSuccess: (data: OauthCodeExchange) => void;
}> = props => {
  const { workspaceId, userInfo } = props;
  const oauthMutation = useMutation(
    async (code: string) => {
      return fetchServerApiPost<OauthCodeExchange>(
        `/api/workspaces/${workspaceId}/integrations/height/oauth-code`,
        {
          code,
        }
      ).then(filterOutResponse);
    },
    {
      onSuccess: x => {
        props.onSuccess(x);
      },
    }
  );

  const userInfo0 = oauthMutation.data?.userInfo || userInfo;

  return (
    <div
      className={classNames(
        "flex-1 flex flex-col gap-y-2 sm:flex-row sm:items-center sm:gap-y-0 sm:gap-x-2",
        userInfo0 ? "justify-between" : "justify-end"
      )}
    >
      <div className="flex-1">
        <IntegrationUser userInfo={userInfo0} />
      </div>
      <div>
        <ThinButton
          onClick={() => {
            const key = "cb" + Math.random().toString();
            const queryParams = new URLSearchParams();
            queryParams.append("state", key);
            const url = new URL(getServerUrl());
            url.pathname = "/oauth/height-auth";
            url.search = queryParams.toString();
            const popup = window.open(url.toString(), "_blank");
            // we are going to leak event handlers here, but it's ok
            window.addEventListener("message", event => {
              if (event.origin !== getServerUrl()) {
                return;
              }
              if (popup === event.source) {
                const params = new URLSearchParams(event.data);
                const error = params.get("error_description") || params.get("error");
                if (error) {
                  console.error(error, event.data);
                  // TODO: setResult(error);
                } else if (key === params.get("state")) {
                  const code = params.get("code");
                  if (code) {
                    oauthMutation.mutate(code);
                  }
                }
              }
            });
          }}
        >
          {oauthMutation.data || userInfo ? "Change User" : "Connect"}
        </ThinButton>
      </div>
    </div>
  );
};
