import qs from "query-string";
import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router";

import { getIsSignedOut } from "../redux/session";

export const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const needsLogin = useSelector(getIsSignedOut);
  const location = useLocation();
  if (needsLogin) {
    return (
      <Navigate
        to={{
          pathname: "/login",
          search: qs.stringify({
            redirectTo: window.location.href,
          }),
        }}
        state={{ from: location }}
      />
    );
  }

  return children;
};
