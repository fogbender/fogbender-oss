import React from "react";
import { Route, Routes, useNavigate, useSearchParams } from "react-router-dom";

import { useVendorName } from "../store";

import { AppRoutes } from "./AppRoutes";
import { AuthContext } from "./Auth";
import { GlobalSpinner } from "./globalSpinner";
import { LoginPage } from "./LoginPage";

const AppBody = () => {
  const vendorName = useVendorName();
  React.useEffect(() => {
    document.title = vendorName;
  }, [vendorName]);

  const [state] = React.useContext(AuthContext);

  if (state.isLoading) {
    return <GlobalSpinner />;
  }

  if (!state.isAuthenticated) {
    return (
      <Routes>
        <Route path="login-redirect" element={<LoginRedirect />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }
  return <AppRoutes />;
};

export const LoginRedirect = () => {
  const navigate = useNavigate();
  const [state] = React.useContext(AuthContext);
  const redirectParam = useSearchParams()[0].get("redirectUrl");
  // there's no point in redirecting back to the login page
  const redirectUrl = redirectParam === "/login" ? undefined : redirectParam;
  React.useEffect(() => {
    const run = async () => {
      await state.login();
      navigate(redirectUrl || "/embedded");
    };
    run();
  }, [navigate, redirectUrl, state]);
  return null;
};

export default AppBody;
