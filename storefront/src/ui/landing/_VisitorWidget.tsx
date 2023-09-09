import type { APIFogbenderVisitor } from "fogbender-client/src/shared/z_types";
import {
  FogbenderConfig,
  FogbenderFloatingWidget,
  FogbenderHeadlessWidget,
  FogbenderIsConfigured,
  FogbenderProvider,
} from "fogbender-react";
import React from "react";
import wretch from "wretch";

import {
  detectBetaEnvironment,
  getClientUrlWithBeta,
  getServerUrl,
  getVersion,
} from "../../config";

const clientUrl = getClientUrlWithBeta();

export const apiServer = wretch(getServerUrl(), {});

export function VisitorWidget() {
  const [visitor, setVisitor] = React.useState<APIFogbenderVisitor>();
  React.useEffect(() => {
    apiServer
      .get("/public/fogbender_visitor")
      .json<APIFogbenderVisitor>()
      .then(x => {
        setVisitor(x);
      });
  }, []);

  return (
    <div>
      <FogbenderProvider>
        {visitor && (
          <FogbenderConfig
            env={detectBetaEnvironment()}
            clientUrl={clientUrl}
            token={{
              widgetId: visitor.widgetId,
              visitorKey: visitor.visitorKey,
              visitor: true,
              versions: {
                storefront: getVersion().debugVersion,
              },
            }}
          />
        )}
        <FogbenderIsConfigured>
          <FogbenderHeadlessWidget />
          <FogbenderFloatingWidget />
        </FogbenderIsConfigured>
      </FogbenderProvider>
    </div>
  );
}

// const x: APIFogbenderVisitor;
