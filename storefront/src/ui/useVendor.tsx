import { useQuery } from "react-query";
import { useMatch } from "react-router-dom";

import { Vendor } from "../redux/adminApi";

import { fetchData, queryKeys } from "./client";

export function useDedicatedVendorId() {
  const vendorMatch = useMatch("/admin/vendor/:vid/*");
  const designatedVendorId = vendorMatch?.params?.vid || undefined;
  return designatedVendorId;
}

export function useVendorById(vendorId: string | undefined) {
  const vendors = useVendorsQuery();
  return vendors?.find(x => x.id === vendorId);
}

export function useVendorsQuery() {
  const { data: vendors } = useQuery(queryKeys.vendors(), () => fetchData<Vendor[]>("api/vendors"));
  return vendors;
}
