import classNames from "classnames";
import { ThickButton, useInputWithError } from "fogbender-client/src/shared";
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectUserName } from "../../redux/session";
import { useServerApiPostWithPayload } from "../useServerApi";

export const NoVendors: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const navigate = useNavigate();
  const userName = useSelector(selectUserName);

  const [orgNameError, setOrgNameError] = React.useState<string>();

  const [newVendorRes, newVendorCall] = useServerApiPostWithPayload<
    any,
    {
      name: string;
    }
  >(`/api/vendors`);

  const [newWorkspaceRes, newWorkspaceCall] = useServerApiPostWithPayload<
    {
      workspaceId?: string;
      name: string;
      triage_name: string | undefined;
      description: string | undefined;
    },
    any
  >(`/api/vendors/${newVendorRes?.data?.id}/workspaces`);

  const formLoading = newVendorRes.loading || newWorkspaceRes.loading;

  React.useEffect(() => setOrgNameError(newVendorRes?.error?.toString()), [newVendorRes]);

  const [orgNameValue, orgNameField] = useInputWithError({
    title: "Your company name",
    error: orgNameError,
    disabled: formLoading || newVendorRes.data,
  });

  const [workspaceNameValue, workspaceNameField] = useInputWithError({
    title: "Your workspace name",
    defaultValue: "Main",
    error: newVendorRes?.error?.toString(),
    disabled: formLoading,
  });

  const [submitStage, setSubmitStage] = React.useState<1 | 2>();

  const onSubmit = React.useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault();
      if (orgNameValue.trim().length === 0) {
        setOrgNameError("Can't be blank");
        return;
      }
      setSubmitStage(1);
    },
    [orgNameValue]
  );

  React.useEffect(() => {
    if (submitStage === 1) {
      setOrgNameError(undefined);
      newVendorCall({ name: orgNameValue });
    }
  }, [submitStage, orgNameValue, newVendorCall]);

  React.useEffect(() => {
    if (submitStage === 2) {
      newWorkspaceCall({ name: workspaceNameValue || "Main" });
    }
  }, [submitStage, workspaceNameValue, newWorkspaceCall]);

  React.useEffect(() => {
    if (newVendorRes.error) {
      setSubmitStage(undefined);
    }
    if (newVendorRes.data && !newVendorRes.error && !newVendorRes.loading) {
      setSubmitStage(2);
    }
  }, [newVendorRes]);

  React.useEffect(() => {
    if (newWorkspaceRes.error) {
      setSubmitStage(undefined);
    }
    if (newWorkspaceRes.data && !newWorkspaceRes.error && !newWorkspaceRes.loading) {
      onDone();
      if (newVendorRes.data.id) {
        navigate(`/admin/vendor/${newVendorRes.data.id}/workspaces`);
      }
    }
  }, [newVendorRes, newWorkspaceRes, onDone, navigate]);

  return (
    <>
      <div className="fog:text-body-m mt-4 flex max-w-screen-md flex-col gap-y-4 pr-16 dark:text-white">
        <p className="text-7xl">🍭</p>
        <h1 className="fog:text-header2">Welcome to Fogbender!</h1>
        <p>{userName.split(/\s+/)[0]}—hello!</p>
        <p>
          Fogbender is a new way to communicate with your customers—we’re so excited to have you and
          can’t wait to show you around.
        </p>
        <form
          className={classNames(
            "fog:box-shadow my-4 flex flex-col gap-y-4 rounded-xl bg-white dark:bg-brand-dark-bg p-6"
          )}
          onSubmit={onSubmit}
        >
          {orgNameField}
          <p className="-mt-3 mb-2">Your customers will see this name</p>
          {workspaceNameField}
          <p className="-mt-3 mb-2">
            A workspace is a dedicated support space for your customers and agents. Workspaces are
            used to distinguish between your products or product environments (e.g., production,
            staging). You can change this name and create more workspaces later.
          </p>
          <p>
            <ThickButton className="w-full" onClick={onSubmit} loading={formLoading}>
              Get started
            </ThickButton>
          </p>
        </form>
      </div>

      <div className="mt-4 border-t border-gray-300">
        <p className="fog:text-caption-xl mt-2 dark:text-white">
          We’re looking forward to working with you!
        </p>
        <p className="fog:text-caption-l mt-5 text-gray-500">The Fogbender team</p>
        <p className="fog:text-caption-l mt-1 text-gray-500">415&ndash;290&ndash;3979</p>
        <p className="fog:text-caption-l mt-1 text-gray-500">
          <a href="mailto:support@fogbender.com" className="fog:text-link">
            support@fogbender.com
          </a>
        </p>
      </div>
    </>
  );
};
