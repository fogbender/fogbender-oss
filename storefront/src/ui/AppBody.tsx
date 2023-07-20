import React, { Suspense } from "react";
import { lazily } from "react-lazily";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const { AdminPage } = lazily(() => import("./pages/Admin"));
const Debug = React.lazy(() => import("./Debug"));
const Detective = React.lazy(() => import("./Detective"));
const { Landing } = lazily(() => import("./Landing"));
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

export const NotFound = () => {
  return <div className="p-20 text-center text-6xl">404</div>;
};

export default AppBody;
