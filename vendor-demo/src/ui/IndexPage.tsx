/* eslint-disable jsx-a11y/anchor-is-valid */
import classNames from "classnames";
import React from "react";
import { NavLink as NavLinkOriginal, useLocation, useMatch } from "react-router-dom";

import logo from "../logo.svg?url";
import { useUserProfile, useVendorName } from "../store";

import { AuthContext } from "./Auth";
import { Badge } from "./Support";

const NavLink = ({
  to,
  children,
  className,
  activeClassName,
}: {
  to: string;
  activeClassName?: string;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <NavLinkOriginal to={to} className={classNames(className, useMatch(to) ? activeClassName : "")}>
      {children}
    </NavLinkOriginal>
  );
};

export const IndexPage = ({ children, title }: { title: string; children: React.ReactNode }) => {
  const [state] = React.useContext(AuthContext);
  const [isOpen, setOpen] = React.useState(false);
  const [showDropdown, setDropdown] = React.useState(false);
  React.useEffect(() => {
    const clickOutside = () => {
      setDropdown(false);
    };
    const escHit = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("click", clickOutside);
      document.addEventListener("keydown", escHit);
    }
    return () => {
      document.removeEventListener("click", clickOutside);
      document.removeEventListener("keydown", escHit);
    };
  }, [showDropdown]);
  const { userEmail, userName, userPicture } = useUserProfile();
  const vendorName = useVendorName();

  const location = useLocation();

  const isSupportPage = location.pathname.startsWith("/support");

  return (
    <div>
      <div className="bg-gray-800 pb-32">
        <nav className="bg-gray-800">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="border-b border-gray-700">
              <div className="flex h-16 items-center justify-between px-4 sm:px-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {vendorName ? (
                      <span className="text-lg font-medium text-orange-500">{vendorName}</span>
                    ) : (
                      <img
                        className="h-auto w-48 rounded-md"
                        src={logo}
                        alt="Diesel Engine, Inc."
                      />
                    )}
                  </div>
                  <div className="hidden md:block">
                    <div className="ml-10 flex items-baseline">
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/"
                        className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Dashboard
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/team"
                        className="ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Team
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/test-support-before"
                        className="ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Without Fogbender
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/support"
                        className="relative ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        With Fogbender
                        <div className="absolute top-1 right-0.5">
                          <Badge />
                        </div>
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/support-unknown-user"
                        className="relative ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Unknown User
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/support-visitor"
                        className="relative ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Visitor roomy
                      </NavLink>
                      <NavLink
                        activeClassName="text-white bg-gray-900 hover:text-white hover:bg-gray-900 focus:bg-gray-900"
                        to="/support-visitor-floaty"
                        className="relative ml-4 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      >
                        Visitor floaty
                      </NavLink>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="ml-4 flex items-center md:ml-6">
                    <button
                      className="rounded-full border-2 border-transparent p-1 text-gray-400 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      aria-label="Notifications"
                    >
                      <svg
                        className="h-6 w-6"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </button>
                    {/* Profile dropdown */}
                    <div className="relative ml-3">
                      <div>
                        <button
                          className="focus:shadow-solid flex max-w-xs items-center rounded-full text-sm text-white focus:outline-none"
                          id="user-menu"
                          aria-label="User menu"
                          aria-haspopup="true"
                          onClick={() => setDropdown(!showDropdown)}
                        >
                          <img
                            className="h-8 w-8 rounded-full"
                            src={userPicture}
                            alt="Avatar User"
                          />
                        </button>
                      </div>
                      {/*
              Profile dropdown panel, show/hide based on dropdown state.

              Entering: "transition ease-out duration-100"
                From: "transform opacity-0 scale-95"
                To: "transform opacity-100 scale-100"
              Leaving: "transition ease-in duration-75"
                From: "transform opacity-100 scale-100"
                To: "transform opacity-0 scale-95"
            */}
                      {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg">
                          <div className="shadow-xs rounded-md bg-white py-1">
                            <NavLink
                              to="/profile"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Your Profile
                            </NavLink>
                            <a
                              href="/login"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={e => {
                                e.preventDefault();
                                state.logout();
                              }}
                            >
                              Switch profile
                            </a>
                            <a
                              href="/login"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={e => {
                                e.preventDefault();
                                sessionStorage.clear();
                                localStorage.clear();
                                state.logout();
                              }}
                            >
                              Sign out
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="-mr-2 flex md:hidden">
                  {/* Mobile menu button */}
                  <button
                    className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                    onClick={() => {
                      setOpen(!isOpen);
                    }}
                  >
                    <svg
                      className={classNames("h-6 w-6", isOpen ? "hidden" : "block")}
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    <svg
                      className={classNames("h-6 w-6", isOpen ? "block" : "hidden")}
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={classNames(
              "border-b border-gray-700 md:hidden",
              isOpen ? "block" : "hidden"
            )}
          >
            <div onClick={() => setOpen(!isOpen)} className="px-2 py-3 sm:px-3">
              <NavLink
                activeClassName="text-white bg-gray-900 focus:outline-none focus:text-white focus:bg-gray-700 hover:bg-gray-700"
                to="/"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
              >
                Dashboard
              </NavLink>
              <NavLink
                activeClassName="text-white bg-gray-900 focus:outline-none focus:text-white focus:bg-gray-700 hover:bg-gray-700"
                to="/team"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
              >
                Team
              </NavLink>
              <NavLink
                activeClassName="text-white bg-gray-900 focus:outline-none focus:text-white focus:bg-gray-700 hover:bg-gray-700"
                to="/test-support-before"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
              >
                Support (without Fogbender)
              </NavLink>
              <NavLink
                activeClassName="text-white bg-gray-900 focus:outline-none focus:text-white focus:bg-gray-700 hover:bg-gray-700"
                to="/support"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
              >
                Support (with Fogbender)
              </NavLink>
            </div>
            <div className="border-t border-gray-700 pt-4 pb-3">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <img className="h-10 w-10 rounded-full" src={userPicture} alt="User Avatar" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">{userName}</div>
                  <div className="mt-1 text-sm font-medium leading-none text-gray-400">
                    {userEmail}
                  </div>
                </div>
              </div>
              <div
                className="mt-3 px-2"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu"
                onClick={() => setOpen(!isOpen)}
              >
                <NavLink
                  to="/profile"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                >
                  Your Profile
                </NavLink>
                <a
                  href="#"
                  className="mt-1 block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                  role="menuitem"
                  onClick={() => {
                    sessionStorage.clear();
                    localStorage.clear();
                    state.logout();
                  }}
                >
                  Sign out
                </a>
              </div>
            </div>
          </div>
        </nav>
        <header className="py-2 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-9 text-white">{title}</h1>
          </div>
        </header>
      </div>
      <main className="-mt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Replace with your content */}
          <div
            className={classNames(
              "rounded-t-lg shadow",
              isSupportPage ? "overflow-hidden bg-white" : "bg-gray-100 p-2 sm:px-6 sm:pt-6"
            )}
          >
            {children}
          </div>
          {/* /End replace */}
        </div>
      </main>
    </div>
  );
};
