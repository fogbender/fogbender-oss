import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { actionCreators, useDispatch } from "../redux";

import { LoginRedirect } from "./AppBody";
import { Dashboard } from "./Dashboard";
import { IndexPage } from "./IndexPage";
import { LoginPage } from "./LoginPage";
import { Profile } from "./ProfilePage";
import { Support, SupportFallback, SupportVisitor, SupportVisitorFloatie } from "./Support";
import { SupportBefore } from "./SupportBefore";
import { Team } from "./Team";

const Showcase = React.lazy(() => import("./Showcase").then(m => ({ default: m.Showcase })));
const Showcase2 = React.lazy(() => import("./Showcase2").then(m => ({ default: m.Showcase })));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <IndexPage title="Dashboard">
            <Dashboard />
          </IndexPage>
        }
      />
      <Route
        path="team"
        element={
          <IndexPage title="My Team">
            <Team />
          </IndexPage>
        }
      />
      <Route
        path="showcase"
        element={
          <IndexPage title="Showcase">
            <Suspense fallback={null}>
              <Showcase />
            </Suspense>
          </IndexPage>
        }
      />
      <Route
        path="showcase2"
        element={
          <IndexPage title="Showcase bookmarklet">
            <Suspense fallback={null}>
              <Showcase2 />
            </Suspense>
          </IndexPage>
        }
      />
      <Route
        path="test-support-before"
        element={
          <IndexPage title="Support">
            <SupportBefore />
          </IndexPage>
        }
      />
      <Route
        path="support"
        element={
          <IndexPage title="Support">
            <HideFloatingWidget />
            <Support />
          </IndexPage>
        }
      />
      <Route
        path="support-unknown-user"
        element={
          <IndexPage title="Support Fallback">
            <HideFloatingWidget />
            <SupportFallback />
          </IndexPage>
        }
      />
      <Route
        path="support-visitor"
        element={
          <IndexPage title="Support: Visitor">
            <HideFloatingWidget />
            <SupportVisitor />
          </IndexPage>
        }
      />
      <Route
        path="support-visitor-floatie"
        element={
          <IndexPage title="Support: Visitor (floatie)">
            <HideFloatingWidget />
            <SupportVisitorFloatie />
          </IndexPage>
        }
      />
      <Route
        path="profile"
        element={
          <IndexPage title="Profile">
            <Profile />
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
