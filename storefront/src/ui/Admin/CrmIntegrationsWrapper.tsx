import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { lazily } from "react-lazily";
import { useLocation } from "react-router-dom";

import { Workspace } from "../../redux/adminApi";

import { ExpandableSection } from "./ExpandableSection";

const { CrmIntegrations } = lazily(() => import("./CrmIntegrations"));

export const CrmIntegrationsWrapper = ({ workspace }: { workspace: Workspace }) => {
  const { hash } = useLocation();

  return (
    <ExpandableSection title="CRM integrations" expand={hash === ""}>
      <ErrorBoundary fallback={<>Oops</>}>
        <Suspense fallback={<div>Loading...</div>}>
          <CrmIntegrations workspace={workspace} />
        </Suspense>
      </ErrorBoundary>
    </ExpandableSection>
  );
};
