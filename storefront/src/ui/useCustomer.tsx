import { type Customer } from "fogbender-proto";
import { useQuery } from "@tanstack/react-query";

import { apiServer, queryKeys } from "./client";

export function useCustomerQuery(helpdeskId: string) {
  const data = useQuery({
    queryKey: queryKeys.customer(helpdeskId),
    queryFn: () => apiServer.get(`/api/helpdesks/${helpdeskId}`).json<Customer>(),
    enabled: helpdeskId !== undefined,
  });
  return data;
}
