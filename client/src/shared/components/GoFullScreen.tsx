import type { UserToken } from "fogbender-proto";
import { stringifyUrl } from "query-string";
import React from "react";

import { Icons } from "./Icons";

export const GoFullScreen: React.FC<{ token: UserToken }> = ({ token }) => {
  return (
    <button onClick={() => handleGoFullScreen(token)} type="button">
      <Icons.FullScreen />
    </button>
  );
};

export const handleGoFullScreen = (token: UserToken) => {
  const url = stringifyUrl({
    url: window.location.href,
    query: {
      token: JSON.stringify(token),
    },
  });
  window.open(url, "_blank")?.focus();
};
