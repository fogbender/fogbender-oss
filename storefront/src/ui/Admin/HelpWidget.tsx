import { FogbenderSimpleWidget } from "fogbender-react";
import React from "react";

import { detectBetaEnvironment, getClientUrlWithBeta } from "../../config";
import { useUserToken } from "../useUserToken";

const clientUrl = getClientUrlWithBeta();

export const HelpWidget: React.FC<{ vendorId?: string | undefined }> = ({ vendorId }) => {
  const { token, loading, done, widgetId } = useUserToken(vendorId);

  if (!token || (loading && !done)) {
    return <div>Loading...</div>;
  }

  if (!widgetId && !loading) {
    return <div>Support widget isn't working, please try again later.</div>;
  }

  if (token) {
    return (
      <FogbenderSimpleWidget clientUrl={clientUrl} token={token} env={detectBetaEnvironment()} />
    );
  } else {
    return <div>Please select an organization</div>;
  }
};
