import { ThinButton, type Integration, useInput } from "fogbender-client/src/shared";
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
  readOnlyItem,
  useProgress,
} from "./Utils";

export const AddAsanaIntegration: React.FC<{
  workspace: Workspace;
  onDone: () => void;
  closing: boolean;
}> = ({ workspace, onDone, closing }) => {
  const [apiKey, apiKeyInput] = useInput({
    type: "password",
    placeholder: "Asana Personal Access Token",
    className: InputClassName,
  });

  const [projectName, setProjectName] = React.useState<string>();

  const [getProjectsRes, getProjectsCall] = useServerApiPostWithPayload<
    {
      gid: string;
      name: string;
    }[],
    {}
  >(`/api/workspaces/${workspace.id}/integrations/asana/get-projects`);

  const projectId = getProjectsRes?.data?.find(p => p.name === projectName)?.gid;

  const [createTagRes, createTagCall] = useServerApiPostWithPayload<
    any,
    { projectId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/create-tag`);

  const [deleteTagRes, deleteTagCall] = useServerApiPostWithPayload<
    any,
    { tagId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/delete-tag`);

  const [createWebhookRes, createWebhookCall] = useServerApiPostWithPayload<
    any,
    { webhookUrl: string; projectId: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/create-webhook`);

  const [createTaskRes, createTaskCall] = useServerApiPostWithPayload<
    any,
    { projectId: string; taskTitle: string; apiKey: string; tagId: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/create-task`);

  const [deleteTaskRes, deleteTaskCall] = useServerApiPostWithPayload<
    any,
    { taskId: string; taskTitle: string; apiKey: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/delete-task`);

  const [deleteWebhookRes, deleteWebhookCall] = useServerApiPostWithPayload<
    any,
    { apiKey: string; webhookId: string }
  >(`/api/workspaces/${workspace.id}/integrations/asana/delete-webhook`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<any, { taskId: string }>(
    `/api/workspaces/${workspace.id}/integrations/asana/get-task-by-id`
  );

  const [addIntegrationRes, addIntegrationCall] = useServerApiPostWithPayload<
    any,
    {
      projectId: string;
      projectName: string;
      apiKey: string;
      fogbenderTagId: string;
      webhookId: string;
    }
  >(`/api/workspaces/${workspace.id}/integrations/asana/add-integration`);

  const [steps, setSteps] = React.useState<{
    create_task: number;
    del_task: number;
    create_webook: number;
    create_tag: number;
    check_webhook: number;
  }>({
    create_task: 0,
    del_task: 0,
    create_webook: 0,
    create_tag: 0,
    check_webhook: 0,
  });

  const [cancelSteps, setCancelSteps] = React.useState<{
    del_webhook: number;
    del_tag: number;
  }>({
    del_webhook: 0,
    del_tag: 0,
  });

  const [clear, setClear] = React.useState(0);

  const { progressElem: createTagProgressElem, progressDone: createTagProgressDone } = useProgress(
    createTagRes.loading === true,
    clear
  );

  const {
    progressElem: deleteTagProgressElem,
    progressDone: deleteTagProgressDone,
    inProgress: deleteTagInProgress,
  } = useProgress(deleteTagRes.loading === true, clear);

  const { progressElem: createWebhookProgressElem, progressDone: createWebhookProgressDone } =
    useProgress(createWebhookRes.loading === true, clear);

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const { progressElem: createTaskProgressElem, progressDone: createTaskProgressDone } =
    useProgress(createTaskRes.loading === true, clear);

  const { progressElem: deleteTaskProgressElem, progressDone: deleteTaskProgressDone } =
    useProgress(deleteTaskRes.loading === true, clear, 200);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const {
    progressElem: addIntegrationProgressElem,
    progressDone: addIntegrationProgressDone,
    inProgress: addIntegrationInProgress,
  } = useProgress(addIntegrationRes.loading === true, clear);

  const taskTitleRef = React.useRef<string>();

  React.useEffect(() => {
    if (apiKey) {
      getProjectsCall({ apiKey });
    }
  }, [apiKey, getProjectsCall]);

  React.useEffect(() => {
    if (steps.create_webook === steps.create_tag - 1 && createTagRes.error === null) {
      if (apiKey.length !== 0 && projectId !== undefined && projectId.length !== 0) {
        createWebhookCall({ apiKey, projectId, webhookUrl: getWebhookUrl() });
      }
    }
  }, [steps, projectId, apiKey, createWebhookCall, createTagRes.error]);

  React.useEffect(() => {
    if (steps.create_task === steps.create_webook - 1 && createWebhookRes.error === null) {
      taskTitleRef.current = `Fogbender test ${Math.random()}`;
      const { gid: tagId } = createTagRes.data;
      if (projectId !== undefined) {
        createTaskCall({
          taskTitle: taskTitleRef.current,
          apiKey,
          projectId,
          tagId,
        });
      }
    }
  }, [steps, createWebhookRes.error, createTagRes.data, apiKey, projectId, createTaskCall]);

  React.useEffect(() => {
    if (
      steps.del_task === steps.create_task - 1 &&
      createTaskRes.error === null &&
      createTaskRes.data
    ) {
      const { gid: taskId, name: taskTitle } = createTaskRes.data;

      deleteTaskCall({
        taskId,
        taskTitle,
        apiKey,
      });
    }
  }, [steps, createTaskRes.data, createTaskRes.error, apiKey, deleteTaskCall]);

  React.useEffect(() => {
    if (steps.check_webhook === steps.del_task - 1 && deleteTaskRes.error === null) {
      const { gid: taskId } = createTaskRes.data;
      if (taskId) {
        checkWebhookCall({ taskId });
      }
    }
  }, [steps, createTaskRes.data, deleteTaskRes.error, checkWebhookCall]);

  React.useEffect(() => {
    if (cancelSteps.del_webhook === cancelSteps.del_tag - 1 && deleteTagRes.error === null) {
      const { gid } = createWebhookRes.data;

      if (projectId !== undefined && gid !== undefined) {
        deleteWebhookCall({ apiKey, webhookId: gid });
      }
    }
  }, [
    cancelSteps,
    createWebhookRes.data,
    apiKey,
    deleteTagRes.error,
    deleteWebhookCall,
    projectId,
  ]);

  React.useEffect(() => {
    if (deleteWebhookProgressDone && deleteWebhookRes.error === null) {
      setTimeout(() => onDone(), 0);
    }
  }, [steps, deleteWebhookProgressDone, deleteWebhookRes.error, onDone]);

  /* --- */

  React.useEffect(() => {
    if (createTagProgressDone) {
      setSteps(x => {
        return { ...x, create_tag: x.create_tag + 1 };
      });
    }
  }, [createTagProgressDone]);

  React.useEffect(() => {
    if (createTaskProgressDone) {
      setSteps(x => {
        return { ...x, create_task: x.create_task + 1 };
      });
    }
  }, [createTaskProgressDone]);

  React.useEffect(() => {
    if (deleteTaskProgressDone) {
      setSteps(x => {
        return { ...x, del_task: x.del_task + 1 };
      });
    }
  }, [deleteTaskProgressDone]);

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
    if (deleteTagProgressDone) {
      setCancelSteps(x => {
        return { ...x, del_tag: x.del_tag + 1 };
      });
    }
  }, [deleteTagProgressDone]);

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
      createTagRes.error ||
      createWebhookRes.error ||
      createTaskRes.error ||
      deleteTaskRes.error ||
      checkWebhookRes.error
    ) &&
    lockStep.length === 1 &&
    lockStep[0] > 0 &&
    cancelLockStep.length === 1 &&
    cancelLockStep[0] === 0 &&
    deleteTagInProgress === false &&
    addIntegrationProgressDone === false &&
    addIntegrationInProgress === false;

  React.useEffect(() => {
    if (addIntegrationProgressDone === true && addIntegrationRes.error === null) {
      onDone();
    }
  }, [onDone, addIntegrationProgressDone, addIntegrationRes.error]);

  const apiKeyHref = "https://developers.asana.com/docs/authentication-quick-start";

  const anchor = (text: string, url: string) => (
    <a target="_blank" rel="noopener" href={url}>
      {text}
    </a>
  );

  React.useEffect(() => {
    if (getProjectsRes.data !== null) {
      setProjectName(getProjectsRes?.data?.map(p => p.name)[0]);
    }
  }, [getProjectsRes.data]);

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

          {getProjectsRes?.data &&
            configListItem(
              "Project:",
              getProjectsRes?.data?.map(p => p.name),
              projectName,
              e => setProjectName(e.target.value)
            )}

          <div className="col-start-1">
            <ThinButton
              onClick={() => {
                if (projectId !== undefined && testIsAGo === true) {
                  setClear(x => x + 1);
                  setSteps(x => {
                    const y = x.create_tag;
                    return {
                      create_task: y,
                      del_task: y,
                      create_webook: y,
                      check_webhook: y,
                      create_tag: y,
                    };
                  });
                  setCancelSteps(() => {
                    return {
                      del_webhook: 0,
                      del_tag: 0,
                    };
                  });

                  createTagCall({ apiKey, projectId });
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
                  const { gid } = createTagRes.data;

                  if (gid) {
                    deleteTagCall({ apiKey, tagId: gid });
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
            <span className="text-sm bg-purple-500 text-white font-bold px-1.5 rounded">
              fogbender
            </span>{" "}
            tag
          </span>,
          createTagProgressDone,
          createTagRes,
          createTagProgressElem
        )}
        {createTagProgressDone &&
          operationStatus(
            "Adding webhook",
            createWebhookProgressDone,
            createWebhookRes,
            createWebhookProgressElem
          )}
        {createTagProgressDone &&
          createWebhookProgressDone &&
          operationStatus(
            "Creating test task",
            createTaskProgressDone,
            createTaskRes,
            createTaskProgressElem
          )}
        {createTagProgressDone &&
          createTaskProgressDone &&
          operationStatus(
            "Deleting test task",
            deleteTaskProgressDone,
            deleteTaskRes,
            deleteTaskProgressElem
          )}
        {createTagProgressDone &&
          createTaskProgressDone &&
          deleteTaskProgressDone &&
          operationStatus(
            "Testing webhook",
            checkWebhookProgressDone,
            checkWebhookRes,
            checkWebhookProgressElem
          )}
        {operationStatus(
          "Deleting 'fogbender' tag",
          deleteTagProgressDone,
          deleteTagRes,
          deleteTagProgressElem
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
        {getProjectsRes.error && error("Bad access token or incorrect project full path.")}
        {createTaskProgressDone &&
          createTaskRes.error &&
          error(
            <span>
              This access token comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {deleteTaskProgressDone &&
          deleteTaskRes.error &&
          error(
            <span>
              This access token comes with insufficient permissions (<b>api</b> scope required)
            </span>
          )}
        {checkWebhookProgressDone &&
          checkWebhookRes.error &&
          error(
            <span>
              The webhook in <b>{projectName}</b> is not working. Please contact support if you need
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
                const orgSlug = getProjectsRes?.data?.find(p => p.gid === projectId)?.name;
                const { gid: fogbenderTagId } = createTagRes.data;
                const { gid: webhookId } = createWebhookRes.data;

                if (
                  projectName !== undefined &&
                  projectId !== undefined &&
                  orgSlug !== undefined &&
                  webhookId !== undefined
                ) {
                  addIntegrationCall({
                    projectId,
                    projectName,
                    apiKey,
                    fogbenderTagId,
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

export const ShowAsanaIntegration: React.FC<{
  i: Integration;
  onDeleted: () => void;
}> = ({ i, onDeleted }) => {
  const [accessToken, accessTokenInput] = useInput({
    type: "new-password",
    placeholder: "Asana Personal Access Token",
    className: InputClassName,
  });

  const [projectName, projectNameInput] = useInput({
    type: "text",
    className: InputClassName,
    defaultValue: i.project_name,
    placeholder: i.project_url,
    disabled: true,
  });

  const [getProjectsRes, getProjectsCall] = useServerApiPostWithPayload<
    {
      gid: string;
      name: string;
    }[],
    {}
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/get-projects`);

  const [createTaskRes, createTaskCall] = useServerApiPostWithPayload<any, { taskTitle: string }>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/create-task`
  );

  const [deleteTaskRes, deleteTaskCall] = useServerApiPostWithPayload<
    any,
    { taskId: string; taskTitle: string }
  >(`/api/workspaces/${i.workspace_id}/integrations/${i.id}/delete-task`);

  const [checkWebhookRes, checkWebhookCall] = useServerApiPostWithPayload<any, { taskId: string }>(
    `/api/workspaces/${i.workspace_id}/integrations/${i.id}/get-task-by-id`
  );

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
    get_projects: number;
    create_task: number;
    del_task: number;
    check_webhook: number;
    del_webhook: number;
    del_integration: number;
  }>({
    get_projects: 0,
    create_task: 0,
    del_task: 0,
    check_webhook: 0,
    del_webhook: 0,
    del_integration: 0,
  });

  const [clear, setClear] = React.useState(0);

  const [deleting, setDeleting] = React.useState(false);

  const { progressElem: getProjectsProgressElem, progressDone: getProjectsProgressDone } =
    useProgress(getProjectsRes.loading === true, clear);

  const { progressElem: createTaskProgressElem, progressDone: createTaskProgressDone } =
    useProgress(createTaskRes.loading === true, clear);

  const { progressElem: deleteTaskProgressElem, progressDone: deleteTaskProgressDone } =
    useProgress(deleteTaskRes.loading === true, clear, 200);

  const { progressElem: checkWebhookProgressElem, progressDone: checkWebhookProgressDone } =
    useProgress(checkWebhookRes.loading === true, clear);

  const { progressElem: deleteWebhookProgressElem, progressDone: deleteWebhookProgressDone } =
    useProgress(deleteWebhookRes.loading === true, clear);

  const {
    progressElem: deleteIntegrationProgressElem,
    progressDone: deleteIntegrationProgressDone,
  } = useProgress(deleteIntegrationRes.loading === true, clear);

  const taskTitleRef = React.useRef<string>();

  /* --- */

  React.useEffect(() => {
    if (
      steps.create_task === steps.get_projects - 1 &&
      getProjectsRes.error === null &&
      getProjectsRes.data
    ) {
      taskTitleRef.current = `Fogbender test ${Math.random()}`;
      createTaskCall({ taskTitle: taskTitleRef.current });
    }
  }, [steps, getProjectsRes.data, getProjectsRes.error, createTaskCall]);

  React.useEffect(() => {
    if (
      steps.del_task === steps.create_task - 1 &&
      createTaskRes.error === null &&
      createTaskRes.data
    ) {
      const { gid: taskId, name: taskTitle } = createTaskRes.data;

      deleteTaskCall({
        taskId,
        taskTitle,
      });
    }
  }, [steps, createTaskRes.data, createTaskRes.error, deleteTaskCall]);

  React.useEffect(() => {
    if (steps.check_webhook === steps.del_task - 1 && deleteTaskRes.error === null) {
      const { gid: taskId } = createTaskRes.data;
      if (taskId) {
        checkWebhookCall({ taskId });
      }
    }
  }, [steps, createTaskRes.data, deleteTaskRes.error, checkWebhookCall]);

  React.useEffect(() => {
    if (steps.del_integration === steps.del_webhook - 1 && deleteWebhookRes.error === null) {
      deleteIntegrationCall();
    }
  }, [steps, deleteWebhookRes.error, deleteIntegrationCall]);

  /* --- */

  React.useEffect(() => {
    if (getProjectsProgressDone) {
      setSteps(x => {
        return { ...x, get_projects: x.get_projects + 1 };
      });
    }
  }, [getProjectsProgressDone]);

  React.useEffect(() => {
    if (createTaskProgressDone) {
      setSteps(x => {
        return { ...x, create_task: x.create_task + 1 };
      });
    }
  }, [createTaskProgressDone]);

  React.useEffect(() => {
    if (deleteTaskProgressDone) {
      setSteps(x => {
        return { ...x, del_task: x.del_task + 1 };
      });
    }
  }, [deleteTaskProgressDone]);

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

  React.useEffect(() => {
    // Avoid 'assigned a value but never used' warning
  }, [projectName]);

  return (
    <div className="grid gap-6 grid-cols-2">
      <div className="col-span-2 flex flex-col gap-4">
        {configInputItem("Access Token:", accessTokenInput)}
        <div className="col-end-4 col-span-1 flex justify-end">
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

        {readOnlyItem("Project:", projectNameInput)}
        <div className="col-end-4 col-span-1 flex justify-end">
          <ThinButton
            className="h-6 w-24 text-center"
            onClick={() => {
              setClear(x => x + 1);
              setSteps(x => {
                const y = x.get_projects;
                return {
                  get_projects: y,
                  create_task: y,
                  del_task: y,
                  check_webhook: y,
                  del_webhook: y,
                  del_integration: y,
                };
              });
              getProjectsCall();
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
                const y = x.get_projects;
                return {
                  get_projects: y,
                  create_task: y,
                  del_task: y,
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
          getProjectsProgressDone,
          getProjectsRes,
          getProjectsProgressElem
        )}
        {getProjectsProgressDone &&
          operationStatus(
            "Creating test task",
            createTaskProgressDone,
            createTaskRes,
            createTaskProgressElem
          )}
        {getProjectsProgressDone &&
          createTaskProgressDone &&
          operationStatus(
            "Deleting test task",
            deleteTaskProgressDone,
            deleteTaskRes,
            deleteTaskProgressElem
          )}
        {getProjectsProgressDone &&
          createTaskProgressDone &&
          deleteTaskProgressDone &&
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
