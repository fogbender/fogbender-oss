import { Icons } from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import React from "react";

import { type Workspace } from "../../redux/adminApi";
import { useServerApiGet } from "../useServerApi";

import { ExpandableSection } from "./ExpandableSection";

export const EmailForwarding: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const [loading, err, data] = useServerApiGet<
    | { error_msg: "signature_not_set" }
    | {
        forward_email_address: string;
      }
  >(`/api/workspaces/${workspace.id}/signature_secret`);

  const serverData = (!loading && data && "forward_email_address" in data && data) || undefined;

  const { forward_email_address: forwardEmailAddress } = serverData || {};

  return (
    <ExpandableSection title="Email forwarding" expand={true}>
      <p className="my-4">
        If you’d like to respond to email sent to your support@ address from Fogbender, you can
        configure forwarding to the following email address:
      </p>
      <div className="mt-4 flex">
        <div className="relative truncate">
          <div className="pointer-events-none absolute inset-0 ml-4 mr-32 rounded backdrop-blur-sm backdrop-filter">
            &nbsp;
          </div>
          <code className="truncate rounded bg-blue-100 dark:text-black py-0.5 px-1 font-bold">
            {forwardEmailAddress || err?.toString()}
          </code>
        </div>
        <div className="py-0.5 px-1">
          <ClipboardCopy text={forwardEmailAddress}>
            <Icons.Clipboard />
          </ClipboardCopy>
        </div>
      </div>
    </ExpandableSection>
  );
};
