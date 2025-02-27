import { useQuery } from "@tanstack/react-query";
import { useMatch } from "react-router-dom";

import { type Vendor } from "../redux/adminApi";

import { fetchData, queryKeys } from "./client";

export function useDedicatedVendorId() {
  const vendorMatch = useMatch("/admin/vendor/:vid/*");
  const designatedVendorId = vendorMatch?.params?.vid || undefined;
  return designatedVendorId;
}

export function useVendorById(vendorId: string | undefined) {
  const vendors = useVendorsQuery();
  if (vendors === undefined || vendors === "loading") {
    return undefined;
  } else {
    return vendors?.find(x => x.id === vendorId);
  }
}

export function useVendorsQuery() {
  const { data: vendors } = useQuery({
    queryKey: queryKeys.vendors(),
    queryFn: async () => fetchData<Vendor[] | "loading" | undefined>("api/vendors"),
    initialData: "loading",
  });
  return vendors;
}
