import React from "react";
import { Route, Routes } from "react-router-dom";

import { actionCreators, useDispatch } from "../redux";

import { LoginRedirect } from "./AppBody";
import { IndexPage } from "./IndexPage";
import { LoginPage } from "./LoginPage";
import { Support } from "./Support";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="embedded"
        element={
          <IndexPage title="Embedded Widget Demo">
            <HideFloatingWidget />
            <Support />
          </IndexPage>
        }
      />
      <Route
        path="login"
        element={
          <>
            <HideFloatingWidget />
            <LoginPage />
          </>
        }
      />
      <Route
        path="login-redirect"
        element={
          <>
            <HideFloatingWidget />
            <LoginRedirect />
          </>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export const NotFound = () => {
  return <div className="p-20 text-center text-6xl">404</div>;
};

export const HideFloatingWidget = () => {
  const dispatch = useDispatch();
  React.useEffect(() => {
    dispatch(actionCreators.setShowWidget({ show: false }));
    return () => {
      dispatch(actionCreators.setShowWidget({ show: true }));
    };
  }, [dispatch]);
  return null;
};
