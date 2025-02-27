import { useQuery } from "@tanstack/react-query";

import { apiServer, queryKeys } from "./client";

export type VerifiedDomain = {
  domain: string;
  verified: boolean;
  verification_code?: string;
};

export function useVerifiedDomains(vendorId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.verifiedDomains(vendorId || "N/A"),
    queryFn: () =>
      apiServer.get(`/api/vendors/${vendorId}/verified_domains`).json<VerifiedDomain[]>(),
    initialData: [],
    enabled: vendorId !== undefined,
  });
}
