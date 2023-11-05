import { type Customer } from "fogbender-proto";
import { useQuery } from "react-query";

import { apiServer, queryKeys } from "./client";

export function useCustomerQuery(helpdeskId: string) {
  const data = useQuery(
    queryKeys.customer(helpdeskId),
    () => apiServer.get(`/api/helpdesks/${helpdeskId}`).json<Customer>(),
    { enabled: helpdeskId !== undefined }
  );
  return data;
}
