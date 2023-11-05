import dayjs from "dayjs";
import { Avatar, ConfirmDialog } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../../config";
import { type Invite } from "../../../redux/adminApi";
import { queryClient, queryKeys } from "../../client";

type DeleteInvitedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  invite: Invite;
  vendorId: string;
};

export const DeleteInvitedModal: React.FC<DeleteInvitedModalProps> = ({
  isOpen,
  onClose,
  invite,
  vendorId,
}) => {
  const [error, setError] = React.useState<string>();
  const deleteInviteMutation = useMutation(
    () => {
      return fetch(`${getServerUrl()}/api/invites/${invite.invite_id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.invites(vendorId));
          onClose();
        } else if (r.status === 403) {
          const { error: err } = await r.json();

          setError(err);
        }
      },
    }
  );

  return (
    <>
      {isOpen && (
        <ConfirmDialog
          title="Revoke invitation?"
          buttonTitle="Revoke"
          onClose={onClose}
          onDelete={() => deleteInviteMutation.mutate()}
          loading={deleteInviteMutation.isLoading}
          error={error}
        >
          <Avatar />
          <div>
            <div className="text-sm">{invite.email}</div>
            <div className="text-xs text-gray-500">
              Invited {dayjs(invite.inserted_at).format("YYYY-MM-DD")}
            </div>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
};
