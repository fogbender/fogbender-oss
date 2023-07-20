import { LinkButton, Modal, ThickButton } from "fogbender-client/src/shared";
import queryString from "query-string";
import React from "react";
import { useMutation } from "react-query";
import { useNavigate } from "react-router-dom";

import { VendorInvite } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";
import { useLogout } from "../useLogout";
import { fetchServerApiPost } from "../useServerApi";

class EmailIsWrongError extends Error {
  public account_email: string | undefined;
  public invite_email: string | undefined;
}

export const AcceptInviteButton: React.FC<{ invite: VendorInvite }> = ({ invite }) => {
  const values = queryString.parse(window.location.search);
  const code = typeof values.code === "string" ? values.code : undefined;
  const navigate = useNavigate();
  const [showModal, setShowModal] = React.useState(code && code === invite.code);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logout] = useLogout();

  const acceptInvite = useMutation<string | undefined, Error>(
    async () => {
      const res = await fetchServerApiPost<never>("/api/vendor_invites/accept", {
        code: invite.code,
      });
      if (res.status === 204) {
        return "Successfully accepted the invite";
      } else if (res.status === 403) {
        const x: { error?: string; account_email?: string; invite_email?: string } =
          await res.json();
        if (x.error === "email mismatch") {
          const e = new EmailIsWrongError(x.error);
          e.account_email = x.account_email;
          e.invite_email = x.invite_email;
          throw e;
        }
        return;
      } else {
        throw new Error(`Something went wrong: ${res.status}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate invites sent to you
        queryClient.invalidateQueries("vendor_invites");
        // invalidate invites sent from this vendor in case if you already have access to Team page
        queryClient.invalidateQueries(["agent invite", invite.vendor.id]);
        setShowModal(false);
        queryClient.invalidateQueries(queryKeys.vendors());
        navigate(`vendor/${invite.vendor.id}/workspaces`);
      },
    }
  );

  const declineInvite = useDeclineInvite(invite);

  // If there is an email mismatch, replace the "Accept" button with a "Switch account" button
  const emailIsWrongError =
    acceptInvite.error instanceof EmailIsWrongError ? acceptInvite.error : undefined;
  const formOk = acceptInvite.status !== "error";

  return (
    <>
      {showModal && (
        <Modal
          onClose={() => {
            setShowModal(false);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="font-bold font-admin text-4xl mb-2">Accept invitation</div>

            <div>
              You have been invited to join <strong>{invite.vendor.name}</strong> as an{" "}
              <strong className="capitalize">{invite.role}</strong>. The invitation was sent by{" "}
              {invite.from_agent.name}, {invite.from_agent.email}.
            </div>

            {acceptInvite.status === "error" && (
              <p className="text-brand-red-500">
                {emailIsWrongError ? (
                  <>
                    You can't accept this invitation because it was sent to{" "}
                    {emailIsWrongError.invite_email}, but you are signed in as{" "}
                    {emailIsWrongError.account_email}. Please either ask the person who invited you
                    to resend the invitation to {emailIsWrongError.account_email}, or click{" "}
                    <strong>Switch account</strong> to sign out and then sign back in as{" "}
                    {emailIsWrongError.invite_email}.
                  </>
                ) : (
                  acceptInvite.error.toString()
                )}
              </p>
            )}
            <div className="mt-2 flex flex-col gap-y-4 sm:flex-row sm:gap-y-0 sm:gap-x-4 justify-between">
              {!emailIsWrongError && (
                <ThickButton
                  disabled={!formOk}
                  onClick={() => acceptInvite.mutate()}
                  loading={acceptInvite.isLoading}
                >
                  Accept
                </ThickButton>
              )}
              {emailIsWrongError && (
                <ThickButton
                  onClick={async () => {
                    setLoggingOut(true);
                    await logout();
                  }}
                  loading={loggingOut}
                >
                  Switch account
                </ThickButton>
              )}
              <LinkButton
                position="end"
                onClick={() => {
                  declineInvite.mutate();
                  setShowModal(false);
                }}
              >
                Decline
              </LinkButton>
            </div>
          </div>
        </Modal>
      )}
      <ThickButton
        disabled={!formOk}
        onClick={() => {
          setShowModal(true);
        }}
        small={true}
      >
        Accept
      </ThickButton>
    </>
  );
};

function useDeclineInvite(invite: VendorInvite) {
  return useMutation(
    () =>
      fetchServerApiPost<never>("/api/vendor_invites/decline", {
        code: invite.code,
      }),
    {
      onSettled: () => {
        // invalidate invites sent to you
        queryClient.invalidateQueries("vendor_invites");
        // invalidate invites sent from this vendor in case if you already have access to Team page
        queryClient.invalidateQueries(["agent invite", invite.vendor.id]);
      },
    }
  );
}

export const DeclineInviteButton: React.FC<{ invite: VendorInvite }> = ({ invite }) => {
  const declineInvite = useDeclineInvite(invite);
  return (
    <>
      <LinkButton
        onClick={() => {
          declineInvite.mutate();
        }}
        className="fog:text-button-s"
      >
        Decline
      </LinkButton>
    </>
  );
};

export const BadInviteModal = () => {
  const [showModal, setShowModal] = React.useState(true);

  return (
    <>
      {showModal && (
        <Modal
          onClose={() => {
            setShowModal(false);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="font-bold font-admin text-4xl mb-2">Invalid invitation</div>

            <div>
              Sorry, this invitation was expired, recalled, or declined and is no longer valid.
            </div>

            <div className="mt-2 flex flex-col gap-y-4 sm:flex-row sm:gap-y-0 sm:gap-x-4 justify-between">
              <ThickButton onClick={() => {}}>OK</ThickButton>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
