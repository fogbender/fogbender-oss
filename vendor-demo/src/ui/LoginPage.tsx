import type { Token } from "fogbender-react";
import React from "react";
import { useNavigate } from "react-router-dom";

import { getStorefrontUrl } from "../config";
import logo from "../logo.svg";
import { useStorageToken, useVendorName } from "../store";

import { AuthContext } from "./Auth";
import { teamMembers } from "./Team";

export const LoginPage = () => {
  const searchParams = new URLSearchParams([["demo", window.location.pathname]]);
  const storefrontLoginUrl = getStorefrontUrl() + `/admin/-/-/settings/embed?${searchParams}`;
  const [state] = React.useContext(AuthContext);
  const vendorName = useVendorName();
  const storageToken = useStorageToken();
  const navigate = useNavigate();

  if (!storageToken.widgetId && !storageToken.widgetKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div>
            <h1 className="text-center text-6xl font-bold text-orange-500">Fogbender Demo</h1>
            <p className="mt-8 text-lg text-gray-50">
              This site lets you check out Fogbender from your end user’s perspective.
            </p>
            <p className="mt-4 text-lg text-gray-50">
              To give it a go, head to{" "}
              <a className="cursor-pointer underline" href={storefrontLoginUrl}>
                fogbender.com/admin
              </a>
              , select your org and workspace, open Embedding instructions, and look for the young
              spy emoji:
            </p>
            <p className="mt-4">
              <img src="try-live-demo.png" alt="Live demo" width="853" height="612" />
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div>
          {vendorName ? (
            <h1 className="text-center text-6xl font-bold text-orange-500">{vendorName}</h1>
          ) : (
            <img
              className="mx-auto h-32 w-auto rounded-lg px-8"
              style={{ backgroundColor: "#241C32" }}
              src={logo}
              alt="Diesel Engine, Inc."
            />
          )}
          <h2 className="mt-8 text-center text-3xl font-extrabold leading-9 text-gray-100">
            First, select a profile:
          </h2>
        </div>
        <form
          className="mt-8"
          action="#"
          method="POST"
          onSubmit={async e => {
            e.preventDefault();
            await state.login();
            if (window.location.pathname === "/login" || window.location.pathname === "/") {
              navigate("/profile");
            }
          }}
        >
          <div className="mt-6">
            {teamMembers.map(({ customerName, userName }) => (
              <div key={customerName + userName} className="mt-6">
                <a
                  type="submit"
                  className="focus:shadow-outline-gray group relative flex w-full justify-center rounded-md border border-transparent bg-pink-600 py-2 px-4 text-sm font-medium leading-5 text-white transition duration-150 ease-in-out hover:bg-pink-700 focus:border-gray-700 focus:outline-none active:bg-pink-700"
                  href={(() => {
                    const customerId = customerName.toLowerCase().replace(/\W+/g, "-");
                    const safeUserName = (userName || "john_doe")
                      .toLowerCase()
                      .replace(/\W+/g, "+");
                    const userEmail = `${safeUserName}+${customerId}@example.com`;

                    const token: Record<
                      | Exclude<
                          keyof Token,
                          | "visitor"
                          | "visitorKey"
                          | "widgetId"
                          | "userAvatarUrl"
                          | "userHMAC"
                          | "userJWT"
                          | "userPaseto"
                          | "widgetKey"
                          | "versions"
                        >
                      | "override"
                      | "redirectUrl",
                      string
                    > = {
                      override: "true",
                      redirectUrl: window.location.pathname,
                      customerId,
                      customerName,
                      userId: userName,
                      userEmail,
                      userName,
                    };
                    return `/login-redirect?${new URLSearchParams(token).toString()}`;
                  })()}
                >
                  {userName} - {customerName}
                </a>
              </div>
            ))}
            <button
              type="submit"
              className="focus:shadow-outline-purple group relative mt-6 flex w-full justify-center rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium leading-5 text-white transition duration-150 ease-in-out hover:bg-purple-700 focus:border-purple-700 focus:outline-none active:bg-purple-700"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-purple-700 transition duration-150 ease-in-out group-hover:text-purple-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Custom profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
