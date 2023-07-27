import classNames from "classnames";
import {
  Icons,
  Modal,
  ThickButton,
  ThinButton,
  useInput,
  useInputWithError,
} from "fogbender-client/src/shared";
import React from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "react-query";

import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

function useUploadFile<DataIn>(vendorId: string, workspaceId: string) {
  const [res, setRes] = React.useState<{
    data: DataIn | null;
    error: Error | null;
    loading: boolean;
  }>({ data: null, error: null, loading: false });

  const call = React.useCallback(
    (acceptedFiles: File[]) => {
      const formData = new FormData();
      for (const file of acceptedFiles) {
        formData.append("file", file);
      }

      setRes(prevState => ({ ...prevState, loading: true, data: null, error: null }));

      fetch(`${getServerUrl()}/api/vendors/${vendorId}/workspaces/${workspaceId}/csv_import`, {
        method: "post",
        credentials: "include",
        body: formData,
      })
        .then(r => {
          if (r.status === 200) {
            return r.json();
          }
          throw r.statusText;
        })
        .then(r => {
          queryClient.invalidateQueries(queryKeys.customers(workspaceId));
          setRes({ data: r, loading: false, error: null });
        })
        .catch(error => {
          setTimeout(() => {
            setRes({ data: null, loading: false, error: error.toString() });
          }, 1500);
        });
    },
    [vendorId, workspaceId]
  );

  return [res, call] as const;
}

interface CreateCustomerProps {
  vendorId: string;
  workspaceId: string;
  existingCustomersIds: string[];
  onClose: () => void;
}

const CreateCustomerForm: React.FC<CreateCustomerProps> = ({
  vendorId,
  workspaceId,
  existingCustomersIds,
  onClose,
}) => {
  const [isEditMode] = React.useState(false);

  const inputClassName =
    "appearance-none bg-gray-100 dark:bg-gray-600 dark:text-gray-200 dark:placeholder-gray-400 focus:outline-none leading-loose px-3 transition text-gray-800 w-full";

  const [customerName, customerNameInput] = useInput({
    type: "text",
    className: inputClassName,
    outerDivClassName: "w-full",
    placeholder: "Customer name (e.g. John Deere)",
    autoFocus: true,
    defaultValue: "",
  });

  const [customerIdError, setCustomerIdError] = React.useState<string>();

  const [customerId, customerIdInput] = useInputWithError({
    title: "Customer id (e.g. abc123)",
    error: customerIdError,
  });

  React.useEffect(() => {
    existingCustomersIds?.includes(customerId)
      ? setCustomerIdError("This customer id is already taken")
      : setCustomerIdError(undefined);
  }, [customerId, customerIdError, existingCustomersIds]);

  const [createCustomerError, setCreateCustomerError] = React.useState<string>();

  const createCustomerRes = useMutation(
    (params: { customerName: string; customerId: string }) => {
      return fetch(
        `${getServerUrl()}/api/vendors/${vendorId}/workspaces/${workspaceId}/customers`,
        {
          method: "post",
          credentials: "include",
          body: JSON.stringify(params),
        }
      );
    },
    {
      onSuccess: async r => {
        if (r.status === 200) {
          onClose();
        } else if (r.status === 403) {
          const { error: err } = await r.json();
          setCreateCustomerError(err);
        }
        queryClient.invalidateQueries(queryKeys.customers(workspaceId));
      },
    }
  );

  const formOk = !!customerName.trim().length && !!customerId.trim().length;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        formOk && !customerIdError && createCustomerRes.mutate({ customerName, customerId });
      }}
    >
      <div className="font-admin mb-2 text-4xl font-bold">
        {isEditMode ? "Edit Customer" : "Add a new customer"}
      </div>

      <div
        className={classNames(
          "flex h-14 w-full rounded-lg bg-gray-100",
          customerName.trim().length > 0 ? "flex-col items-start" : "flex-row items-center",
          "border border-opacity-0"
        )}
      >
        {customerName.trim().length > 0 && (
          <div className="px-3 text-xs text-gray-500">Customer Name</div>
        )}
        <div className="flex w-full content-between">{customerNameInput}</div>
      </div>

      <div>
        <div
          className={classNames(
            "flex h-14 w-full rounded-lg bg-gray-100",
            customerId.trim().length > 0 ? "flex-col items-start" : "flex-row items-center",
            "border border-opacity-0"
          )}
        >
          <div className="flex w-full content-between">{customerIdInput}</div>
        </div>
        <div className="ml-1 mt-1 text-gray-600">
          <b>Important</b>: This id should match{" "}
          <code className="rounded bg-yellow-200 py-0.5 px-1">customerId</code> in{" "}
          <a href={`/admin/-/-/settings/embed`}>settings</a>. If you get it wrong, you can always
          create another customer with the correct id.
        </div>
      </div>
      <div className="min-w-min">
        <ThickButton disabled={!formOk || !!customerIdError}>
          {isEditMode ? "Update customer" : "Create customer"}
        </ThickButton>
      </div>
      <div className="ml-4 flex flex-1 items-center self-center">
        {createCustomerError && !createCustomerRes.isLoading && (
          <span className="fog:text-caption-xl flex text-red-500">{createCustomerError}</span>
        )}
      </div>
    </form>
  );
};

export const SeedCustomers: React.FC<{
  vendorId: string;
  workspaceId: string;
  existingCustomersIds: string[];
}> = ({ vendorId, workspaceId, existingCustomersIds }) => {
  const [res, call] = useUploadFile<any>(vendorId, workspaceId); // XXX replace any; we know the response type
  const [isCreateCustomerModalOpen, setCreateCustomerModalOpen] = React.useState(false);

  const onDrop = React.useCallback(
    acceptedFiles => {
      call(acceptedFiles);
    },
    [call]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const uploading = res && res.loading;

  const [showConfirmation, setShowConfirmation] = React.useState(true);

  React.useEffect(() => {
    if (uploading) {
      setShowConfirmation(true);
    }
  }, [uploading]);

  return (
    <div className="flex flex-col gap-2">
      {showConfirmation && res && res.data && (
        <div className="text-sm text-gray-600">
          {res.data.status === "error" && (
            <div className="flex flex-col gap-1">
              {res.data.errors.map((e: string, i: number) => (
                <div className="text-clip bg-gray-100 p-1" key={i}>
                  {e}
                </div>
              ))}
            </div>
          )}
          {res.data.status === "success" && (
            <div className="flex items-center justify-between">
              <div>
                {res.data.entries.length} user{res.data.entries.length !== 1 && "s"} were imported
              </div>
              <div
                onClick={() => {
                  setShowConfirmation(false);
                }}
                className="hover:text-brand-red-500 cursor-pointer text-gray-500"
              >
                <Icons.XClose className="w-5" />
              </div>
            </div>
          )}
          {res && res.error && <div>{res.error}</div>}
        </div>
      )}
      <div className="flex items-center justify-between">
        <form
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          <div {...getRootProps()}>
            <div title="drag-n-drop file in csv format">
              <ThinButton loading={uploading} className={isDragActive ? "bg-green-100" : ""}>
                {uploading ? "Uploading..." : "Upload csv"}
              </ThinButton>
            </div>
            <input {...getInputProps()} />
          </div>
        </form>
        <a
          href="/blog/fogbender-user-management"
          rel="noopener"
          target="_blank"
        >
          <ThinButton>?</ThinButton>
        </a>
        <div className="my-2">
          <ThinButton onClick={() => setCreateCustomerModalOpen(true)}>Add by hand</ThinButton>
        </div>
      </div>
      {isCreateCustomerModalOpen && (
        <Modal onClose={() => setCreateCustomerModalOpen(false)}>
          <CreateCustomerForm
            vendorId={vendorId}
            workspaceId={workspaceId}
            existingCustomersIds={existingCustomersIds}
            onClose={() => {
              setCreateCustomerModalOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
};
