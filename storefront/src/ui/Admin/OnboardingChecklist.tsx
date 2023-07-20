import { Icons } from "fogbender-client/src/shared";
import {
  Integration,
  KnownCommsIntegrations,
  KnownIssueTrackerIntegrations,
} from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";

import { apiServer, queryKeys } from "../client";

type OnboardingChecklistResponse = {
  users_posted_in_vendor_support: boolean;
  posted_in_fogbender_support: boolean;
  agent_invited: boolean;
  invited_agent_joined: boolean;
};

type OnboardingChecklistInput = {
  onboardingChecklistDone: boolean;
  setOnboardingChecklistDone: (val: boolean) => void;
  vendorId: string;
  onCreateWorkspace?: () => void;
  workspacesCount: number;
  vendorIntegrations: { workspace_id: string; integrations: Integration[] }[] | undefined;
};

const StepDone = ({ title, checked = false }: { title: React.ReactNode; checked?: boolean }) => {
  return (
    <div className="flex space-x-2">
      <div className="flex space-x-2 text-gray-700 font-medium items-center">
        <span>
          {checked ? (
            <Icons.Check className="text-green-500 w-4 h-4" />
          ) : (
            <Icons.XClose className="text-red-500 w-4 h-4" />
          )}
        </span>
        <div className="fog:text-body-m">{title}</div>
      </div>
    </div>
  );
};

export const OnboardingChecklist = React.memo(
  ({
    vendorId,
    workspacesCount,
    vendorIntegrations,
    onCreateWorkspace,
    onboardingChecklistDone,
    setOnboardingChecklistDone,
  }: OnboardingChecklistInput) => {
    const defaultChecklistValue = {
      users_posted_in_vendor_support: false,
      posted_in_fogbender_support: false,
      agent_invited: false,
      invited_agent_joined: false,
    };

    const { data: checklistData = defaultChecklistValue } = useQuery({
      queryKey: queryKeys.onboardingChecklist(vendorId),
      queryFn: () =>
        apiServer
          .get(`/api/vendors/${vendorId}/onboarding_checklist`)
          .json<OnboardingChecklistResponse>(),
    });

    const baseUrl = `/admin/vendor/${vendorId}/`;

    const {
      agent_invited,
      invited_agent_joined,
      posted_in_fogbender_support,
      users_posted_in_vendor_support,
    } = checklistData;

    let hasCommsIntegration = false;
    let hasIssueTrackerIntegration = false;

    outer: for (const vi of vendorIntegrations || []) {
      for (const i of vi.integrations || []) {
        if (hasCommsIntegration && hasIssueTrackerIntegration) {
          break outer;
        }
        if (KnownIssueTrackerIntegrations.includes(i.type)) {
          hasIssueTrackerIntegration = true;
        }
        if (KnownCommsIntegrations.includes(i.type)) {
          hasCommsIntegration = true;
        }
      }
    }

    const onboardingChecklist = [
      {
        title: (
          <div>
            <button onClick={onCreateWorkspace} className="fog:text-link no-underline">
              Create
            </button>{" "}
            a workspace
          </div>
        ),
        checked: workspacesCount > 0,
      },
      {
        title: (
          <span>
            Send an{" "}
            <Link className="fog:text-link no-underline" to={baseUrl + "team?openInviteModal=true"}>
              invite
            </Link>{" "}
            to a colleague
          </span>
        ),
        checked: agent_invited,
      },
      {
        title: "Have a colleague accept the invite",
        checked: invited_agent_joined,
      },
      {
        title: (
          <span>
            Send a message in{" "}
            <Link className="fog:text-link no-underline" to={baseUrl + "support"}>
              support
            </Link>
          </span>
        ),
        checked: posted_in_fogbender_support,
      },
      {
        title: (
          <span>
            Send a message from{" "}
            <Link className="fog:text-link no-underline" to={baseUrl + "-/settings/embed"}>
              live demo
            </Link>
          </span>
        ),
        checked: users_posted_in_vendor_support,
      },
      {
        title: (
          <span>
            Connect an{" "}
            <Link
              className="fog:text-link no-underline"
              to={"/admin/-/-/settings/integrations#issue-tracker-integrations"}
            >
              issue tracker integration
            </Link>
          </span>
        ),
        checked: hasIssueTrackerIntegration,
      },
      {
        title: (
          <span>
            Connect a{" "}
            <Link
              className="fog:text-link no-underline"
              to={"/admin/-/-/settings/integrations#comms-integrations"}
            >
              comms integration
            </Link>
          </span>
        ),
        checked: hasCommsIntegration,
      },
    ];

    const allDone = onboardingChecklist.every(c => c.checked);
    if (onboardingChecklistDone) {
      return null;
    }

    return (
      <div className="mb-8 py-4 px-5 flex flex-col rounded-xl fog:box-shadow bg-white">
        <div className="flex flex-col gap-y-4">
          <div className="flex justify-between items-center">
            <div className="fog:text-header3">Onboarding checklist</div>
            {allDone && (
              <>
                <button
                  onClick={() => setOnboardingChecklistDone(true)}
                  className="fog:text-link no-underline"
                >
                  <Icons.XClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {onboardingChecklist.map((props, i) => (
            <StepDone key={i} {...props} />
          ))}
        </div>
      </div>
    );
  }
);
