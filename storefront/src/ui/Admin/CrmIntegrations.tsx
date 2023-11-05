import { useMergeLink } from "@mergeapi/react-merge-link";
import classNames from "classnames";
import { ThinButton } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { getServerUrl } from "../../config";
import { type Workspace } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";

import { type MergeLink as MergeLinkT } from "./MergeLink";

export const CrmIntegrations: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const endUserOriginId = React.useRef<string>();
  const mergeLinkTokenUrl = `/api/workspaces/${workspace.id}/get-merge-link-token`;
  const [mergeLinkToken, setMergeLinkToken] = React.useState<string>();

  const setMergePublicTokenMutation = useMutation(
    (public_token: string) => {
      return fetch(`${getServerUrl()}/api/workspaces/${workspace.id}/set-merge-public-token`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          publicToken: public_token,
          endUserOriginId: endUserOriginId.current,
        }),
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.crmConnections(workspace.id));
      },
    }
  );

  const onSuccess = (public_token: string) => {
    // Send public_token to server (Step 3)
    setMergePublicTokenMutation.mutate(public_token);
  };

  const { open, isReady } = useMergeLink({
    linkToken: mergeLinkToken,
    onSuccess,
  });

  const { data: mergeLinks } = useQuery<MergeLinkT[]>(queryKeys.crmConnections(workspace.id), () =>
    fetch(`${getServerUrl()}/api/workspaces/${workspace.id}/merge-links`, {
      credentials: "include",
    }).then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        return {
          data: [],
        };
      }
    })
  );

  const [shouldOpen, setShouldOpen] = React.useState(false);

  const mergeLinkTokenMutation = useMutation({
    mutationFn: () => {
      endUserOriginId.current = workspace.id + "-" + btoa(`${Math.random()}`).replace(/=+/, "");

      return apiServer
        .url(mergeLinkTokenUrl)
        .post({ endUserOriginId: endUserOriginId.current })
        .json<string>();
    },
    onSuccess: res => {
      setMergeLinkToken(res);
      setShouldOpen(true);
    },
  });

  React.useEffect(() => {
    if (isReady && shouldOpen) {
      setShouldOpen(false);
      open();
    }
  }, [isReady, open, mergeLinkToken, shouldOpen]);

  return (
    <>
      <div
        className={classNames(
          "mt-4",
          (mergeLinks || []).length > 0 && "pb-2 border-b border-gray-200"
        )}
      >
        {(mergeLinks || []).map(link => (
          <MergeLink key={link.end_user_origin_id} workspace={workspace} link={link} />
        ))}
      </div>
      <ThinButton
        className="mt-4"
        loading={setMergePublicTokenMutation.isLoading}
        onClick={() => {
          mergeLinkTokenMutation.mutate();
        }}
      >
        Connect CRM
      </ThinButton>
    </>
  );
};

const MergeLink: React.FC<{ workspace: Workspace; link: MergeLinkT }> = ({ workspace, link }) => {
  const deleteMergeLinkMutation = useMutation(
    () => {
      return fetch(
        `${getServerUrl()}/api/workspaces/${workspace.id}/merge-links/${
          link.end_user_origin_id
        }/delete-account`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.crmConnections(workspace.id));
      },
    }
  );

  return (
    <div>
      <div className="flex justify-between">
        <div className="flex items-center gap-3">
          {link.status === "COMPLETE" && (
            <span className="text-white text-xs font-bold bg-green-500 rounded-lg px-1.5 text-center">
              Connected
            </span>
          )}
          <img
            alt="{connection.connector.name} logo"
            className="w-10 h-10"
            src={link.integration.square_image}
          />
          <span className="">
            {link.integration.name} ({link.remote_id})
          </span>
        </div>
        <ThinButton
          className="mt-4"
          loading={deleteMergeLinkMutation.isLoading}
          onClick={() => {
            if (window.confirm("Are you sure?") === true) {
              deleteMergeLinkMutation.mutate();
            }
          }}
        >
          Delete
        </ThinButton>
      </div>
    </div>
  );
};
