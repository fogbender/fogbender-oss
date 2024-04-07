import { Icons } from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import React from "react";
import { PiEyeBold,PiEyeClosedBold } from "react-icons/pi";

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

  const [visible, setVisible] = React.useState(false);

  const asterisks = (() => {
    if (forwardEmailAddress) {
      return forwardEmailAddress
        .split("")
        .map(() => "*")
        .join("");
    } else {
      return "";
    }
  })();

  return (
    <ExpandableSection title="Email forwarding" expand={true}>
      <p className="my-4">
        If you’d like to respond to email sent to your support@ address from Fogbender, you can
        configure forwarding to the following email address:
      </p>
      <div className="mt-4 flex gap-2 items-center">
        <div className="relative truncate">
          <span className="font-mono truncate rounded bg-blue-100 dark:text-black py-0.5 px-1 font-bold">
            {visible ? forwardEmailAddress : asterisks || err?.toString()}
          </span>
        </div>
        <div className="py-0.5 px-1">
          <ClipboardCopy text={forwardEmailAddress}>
            <Icons.Clipboard />
          </ClipboardCopy>
        </div>
        <div
          className="text-gray-500 dark:text-gray-300 hover:text-brand-red-500 dark:hover:text-brand-red-500 cursor-pointer"
          onClick={() => setVisible(x => !x)}
        >
          {visible ? <PiEyeBold size={18} /> : <PiEyeClosedBold size={18} />}
        </div>
      </div>
    </ExpandableSection>
  );
};
