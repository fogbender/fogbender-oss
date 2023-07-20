import React from "react";

import { useClientNotifications, useOnNotifications, useSharedRoster, useWs } from "../shared";

const Headless = () => {
  const { userId } = useWs();
  const { badges, roomById } = useSharedRoster();

  React.useEffect(() => {
    if (window.parent && window.parent !== window) {
      // we can't specify the targetOrigin because it could run from any domain
      // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
      window.parent.postMessage({ type: "BADGES", badges: JSON.stringify(badges) }, "*");
    }
  }, [badges]);

  const { onNotification } = useClientNotifications({ roomById });
  useOnNotifications({ onNotification, userId });
  return <noscript />;
};

export default Headless;
