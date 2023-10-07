import type { UserToken, VisitorToken } from "fogbender-proto";
import { stringifyUrl } from "query-string";
import React from "react";

import { Icons } from "./Icons";

export const GoFullScreen: React.FC<{ token: UserToken | VisitorToken; visitorJWT?: string }> = ({
  token,
  visitorJWT,
}) => {
  return (
    <button onClick={() => handleGoFullScreen(token, visitorJWT)} type="button">
      <Icons.FullScreen />
    </button>
  );
};

export const handleGoFullScreen = (
  token: UserToken | VisitorToken,
  visitorJWT?: string,
  sameTab?: boolean
) => {
  const url = stringifyUrl({
    url: window.location.href,
    query: {
      token: JSON.stringify(token),
      visitorJWT: JSON.stringify(visitorJWT),
    },
  });
  if (sameTab) {
    window.location.href = url;
  } else {
    window.open(url, "_blank")?.focus();
  }
};
