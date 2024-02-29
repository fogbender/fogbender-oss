import { LinkButton, ThickButton, useInputWithError } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../config";
import { type Vendor } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";

export const UpdateVendorForm: React.FC<{
  vendor: Vendor;
  nameOk: (x: string) => boolean;
  onClose: () => void;
  onDeleteClick?: () => void;
}> = ({ vendor, nameOk, onClose, onDeleteClick }) => {
  const updateVendorMutation = useMutation(
    () => {
      return fetch(`${getServerUrl()}/api/vendors/${vendor.id}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name: newVendorName }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.vendors());
          onClose();
        } else {
          const res = await r.json();
          const { error } = res;
          setUpdateVendorError(error);
        }
      },
    }
  );

  const [updateVendorError, setUpdateVendorError] = React.useState<string>();

  const [newVendorName, newVendorNameInput] = useInputWithError({
    title: "Organization name",
    defaultValue: vendor?.name,
    error: updateVendorError,
    disabled: updateVendorMutation.isLoading,
    redErrorBorder: !!updateVendorError,
  });

  const newVendorOk = vendor
    ? vendor.name === newVendorName.trim() || nameOk(newVendorName.trim())
    : nameOk(newVendorName.trim());

  React.useEffect(
    () => setUpdateVendorError(newVendorOk !== true ? "Name is already taken" : undefined),
    [newVendorOk]
  );

  const formOk = React.useMemo(() => {
    if (newVendorName.trim().length === 0 || newVendorOk === false) {
      return false;
    }
    return true;
  }, [newVendorName, newVendorOk]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        updateVendorMutation.mutate();
      }}
      className="flex flex-col gap-6"
    >
      <div className="font-bold font-admin text-4xl mb-2">Edit organization</div>

      {newVendorNameInput}

      <div className="flex flex-wrap justify-between flex-col gap-y-4 md:flex-row md:gap-x-4">
        <ThickButton disabled={!formOk} loading={updateVendorMutation.isLoading}>
          Update organization
        </ThickButton>
        <LinkButton
          position="end"
          className="col-start-3 !text-brand-red-500/80 hover:!text-brand-red-500"
          onClick={onDeleteClick}
        >
          Delete organization
        </LinkButton>
      </div>
    </form>
  );
};
