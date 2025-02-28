import { ThickButton, useInputWithError } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "@tanstack/react-query";

import { queryClient, queryKeys, apiServer } from "../client";

export const CreateVendorForm: React.FC<{
  nameOk: (x: string) => boolean;
  onClose: () => void;
}> = ({ nameOk, onClose }) => {
  const addVendorMutation = useMutation({
    mutationFn: (params: { name: string }) => {
      const { name } = params;
      return apiServer.url("/api/vendors").post({ name }).json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors() });
      onClose();
    },
  });

  const [newVendorNameError, setNewVendorNameError] = React.useState<string>();

  const [newVendorName, newVendorNameInput] = useInputWithError({
    title: "Organization name",
    autoFocus: true,
    disabled: addVendorMutation.isPending,
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
          loading={addVendorMutation.isPending}
        >
          Create organization
        </ThickButton>
      </div>
    </form>
  );
};
