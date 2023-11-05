import { type Customer } from "fogbender-proto";
import { useQuery } from "react-query";

import { apiServer, queryKeys } from "./client";

export function useCustomersQuery(workspaceId: string | undefined) {
  const data = useQuery(
    queryKeys.customers(workspaceId),
    () => apiServer.get(`/api/workspaces/${workspaceId}/customers`).json<Customer[]>(),
    { enabled: workspaceId !== undefined }
  );
  return data;
}
