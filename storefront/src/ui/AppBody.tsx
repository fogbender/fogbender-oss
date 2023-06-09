import React, { Suspense } from "react";
import { lazily } from "react-lazily";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const { AdminPage } = lazily(() => import("./pages/Admin"));
const Debug = React.lazy(() => import("./Debug"));
const Detective = React.lazy(() => import("./Detective"));
const { Login } = lazily(() => import("./Login"));
const { Signup } = lazily(() => import("./Signup"));

const AppBody = () => {
  return (
    <Suspense fallback={null}>
      <>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="login/*" element={<Login />} />
            <Route path="signup/*" element={<Signup />} />
            <Route path="debug/*" element={<Debug />} />
            <Route path="detective/*" element={<Detective />} />
            <Route path="admin/*" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </>
    </Suspense>
  );
};

// we don't expect anyone to actually get to the / route in react router in production,
// but just in case if that happens we are going to redirect them to the astro landing page
const Landing = () => {
  React.useEffect(() => {
    // to make sure we don't have an infinite loop
    const search = new URLSearchParams(window.location.search);
    const fromApp = search.has("from_app");
    console.log("fromApp", fromApp);
    if (fromApp) {
      return;
    }
    // Astro landing page can't be accessed from react, so we need to reload the page
    window.location.href = "/?from_app";
  }, []);
  if (import.meta.env.DEV) {
    return (
      <div>
        <div className="p-20 text-center text-6xl">Landing</div>
        <div className="container mx-auto text-center">
          You are here because you are in development mode. If you want to see the Astro landing
          page, please start `yarn start` instead of `yarn dev`.
        </div>
        <div className="container mx-auto text-center text-xl">
          Or return to the <a href="/admin">App</a>
        </div>
      </div>
    );
  }
  return null;
};

export const NotFound = () => {
  return <div className="p-20 text-center text-6xl">404</div>;
};

export default AppBody;
