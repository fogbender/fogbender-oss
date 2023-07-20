import dayjs from "dayjs";
import { Avatar, ConfirmDialog } from "fogbender-client/src/shared";
import React from "react";
import { useMutation } from "react-query";

import { getServerUrl } from "../../../config";
import { Agent, Vendor } from "../../../redux/adminApi";
import { queryClient, queryKeys } from "../../client";

type DeleteMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  vendor: Vendor;
  agents?: Agent[];
};

export const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  isOpen,
  onClose,
  agent,
  vendor,
  agents,
}) => {
  const [deleteMemberError, setDeleteMemberError] = React.useState<string>();

  const deleteMemberMutation = useMutation(
    () => {
      return fetch(`${getServerUrl()}/api/vendors/${vendor.id}/agents/${agent.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.agents(vendor.id));
          queryClient.invalidateQueries(queryKeys.vendors());
          onClose();
        } else if (r.status === 403) {
          const { error: err } = await r.json();

          setDeleteMemberError(err);
        }
      },
    }
  );
  const numAgents = agents?.filter(x => x.role === "owner").length;
  return (
    <>
      {isOpen &&
        (numAgents === 1 && agent.role === "owner" ? (
          <ConfirmDialog title="No can do" buttonTitle="OK" onClose={onClose} onDelete={onClose}>
            A team must have at least one owner—please designate someone else as owner first
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            title="Remove team member?"
            buttonTitle="Remove"
            onClose={onClose}
            onDelete={deleteMemberMutation.mutate}
            loading={deleteMemberMutation.isLoading}
            error={deleteMemberError}
          >
            <Avatar url={agent.image_url} />
            <div>
              <div className="text-sm">{agent.email}</div>
              <div className="text-xs text-gray-500">
                Added {dayjs(agent.inserted_at).format("YYYY-MM-DD")}
              </div>
            </div>
          </ConfirmDialog>
        ))}
    </>
  );
};
