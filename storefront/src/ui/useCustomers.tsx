import { type Customer } from "fogbender-proto";
import { useQuery } from "@tanstack/react-query";

import { apiServer, queryKeys } from "./client";

export function useCustomersQuery(workspaceId: string | undefined) {
  const data = useQuery({
    queryKey: queryKeys.customers(workspaceId),
    queryFn: async () =>
      apiServer.get(`/api/workspaces/${workspaceId}/customers`).json<Customer[]>(),
    enabled: workspaceId !== undefined,
  });
  return data;
}
