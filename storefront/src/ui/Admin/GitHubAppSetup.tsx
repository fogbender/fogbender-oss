import { useNavigate, useSearchParams } from "react-router-dom";
import { LocalStorageKeys, SafeLocalStorage } from "fogbender-client/src/shared";
import { useEffect } from "react";

export const GitHubAppSetup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const installationId = searchParams.get("installation_id");
  const stateString = searchParams.get("state");

  const context = (() => {
    if (stateString) {
      try {
        const state = JSON.parse(stateString);
        const context = state["context"];

        if (context === "onboarding") {
          return "onboarding";
        } else {
          return null;
        }

      } catch (error) {
        console.error("Failed to parse state:", error);
      }
    }

    return null;
  })();

  const designatedVendorId = SafeLocalStorage.getItem(LocalStorageKeys.DesignatedVendorId);

  useEffect(() => {
    if (context === "onboarding" && installationId && designatedVendorId) {
      navigate(`/admin/vendor/${designatedVendorId}/onboarding/github?installation_id=${installationId}`);
    }
  }, [context, installationId, designatedVendorId, navigate]);

  if (!installationId || !designatedVendorId) {
    return null;
  }

  return (
    <></>
  );
};
