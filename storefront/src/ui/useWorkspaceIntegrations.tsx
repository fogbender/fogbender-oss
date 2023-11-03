import { type Integration } from "fogbender-proto";
import { useQuery } from "react-query";

import { apiServer, queryKeys } from "./client";

export function useWorkspaceIntegrationsQuery(workspaceId: string | undefined) {
  const workspaceIntegrations = useQuery(
    queryKeys.integrations(workspaceId),
    () => apiServer.get(`/api/workspaces/${workspaceId}/integrations`).json<Integration[]>(),
    { enabled: workspaceId !== undefined }
  );
  return workspaceIntegrations;
}
