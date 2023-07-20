import { ThickButton, useInputWithError } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

export const CreateVendorForm: React.FC<{
  nameOk: (x: string) => boolean;
  onClose: () => void;
}> = ({ nameOk, onClose }) => {
  const addVendorMutation = useMutation(
    (params: { name: string }) => {
      const { name } = params;
      return fetch(`${getServerUrl()}/api/vendors`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name }),
      });
    },
    {
      onSuccess: async (r, params) => {
        if (r.status === 200) {
          queryClient.invalidateQueries(queryKeys.vendors());
          onClose();
        } else {
          const { name } = params;
          console.error(`Couldn't create organization ${name}`);
        }
      },
    }
  );

  const [newVendorNameError, setNewVendorNameError] = React.useState<string>();

  const [newVendorName, newVendorNameInput] = useInputWithError({
    title: "Organization name",
    autoFocus: true,
    disabled: addVendorMutation.isLoading,
    error: newVendorNameError,
    redErrorBorder: newVendorNameError !== undefined,
  });

  React.useEffect(() => {
    if (!nameOk(newVendorName)) {
      setNewVendorNameError("Name is already taken");
    } else {
      setNewVendorNameError(undefined);
    }
  }, [nameOk, newVendorName]);

  const addOk = newVendorName.trim().length > 0 && nameOk(newVendorName);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
      }}
      className="flex flex-col gap-6"
    >
      <div className="font-admin mb-2 text-4xl font-bold">Create a new organization</div>

      {newVendorNameInput}

      <div className="flex flex-col flex-wrap gap-y-4 md:flex-row md:gap-x-4">
        <ThickButton
          disabled={addOk === false}
          onClick={() => addVendorMutation.mutate({ name: newVendorName })}
          loading={addVendorMutation.isLoading}
        >
          Create organization
        </ThickButton>
      </div>
    </form>
  );
};
