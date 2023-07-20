import { Hub } from "aws-amplify";
import classNames from "classnames";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getQueryParam } from "../params";

import { Auth } from "./amazon";
import { useCheckCurrentSession } from "./useSessionApi";

// https://stackoverflow.com/a/16861050/74167
export function popupCenter(w: number, h: number) {
  // Fixes dual-screen position                             Most browsers      Firefox
  const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

  const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : window.screen.width;
  const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : window.screen.height;

  // const systemZoom = width / window.screen.availWidth;
  const systemZoom = 1;
  const left = (width - w) / 2 / systemZoom + dualScreenLeft;
  const top = (height - h) / 2 / systemZoom + dualScreenTop;
  return `
      width=${w / systemZoom}, 
      height=${h / systemZoom}, 
      top=${top}, 
      left=${left}
      `;
}

export function useTimePassedSince(date: Date, timeout: number) {
  const [, setTimePassed] = React.useState<boolean | number>(false);

  const isItTime = React.useCallback(() => {
    const timeLeftTs = date.getTime() + timeout - new Date().getTime();
    return { timePassed: timeLeftTs <= 0, timeLeftTs };
  }, [date, timeout]);

  React.useEffect(() => {
    const { timeLeftTs, timePassed } = isItTime();
    setTimePassed(timePassed);
    if (timeLeftTs > 0) {
      const timer = setInterval(() => {
        const { timePassed, timeLeftTs } = isItTime();
        if (timePassed) {
          setTimePassed(true);
        } else {
          setTimePassed(timeLeftTs);
        }
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
    return;
  }, [isItTime]);

  return isItTime();
}

export type AuthErrors = {
  emailTaken?: boolean;
  passwordTooShort?: boolean;
  verificationCodeMismatch?: boolean;
  userNotFound?: boolean;
  userNotConfirmed?: boolean;
  notAuthorized?: boolean;
  weakPassword?: boolean;
  limitExceeded?: boolean;
};

export const ConfirmEmailForm: React.FC<{
  inProgress: boolean;
  setInProgress: (x: boolean) => void;
  email: string;
  handleError: (x: any) => void;
  showCode: boolean;
  setCodeSentTs: (x: Date) => void;
  errors: AuthErrors | undefined;
  timeLeftTs: number;
}> = ({
  inProgress,
  setInProgress,
  email,
  handleError,
  showCode,
  setCodeSentTs,
  errors,
  timeLeftTs,
}) => {
  const location = useLocation();
  const [code, setCode] = React.useState("");

  return (
    <form
      className="mt-5"
      onSubmit={async e => {
        e.preventDefault();
        // e.currentTarget;
        if (typeof code === "string") {
          setInProgress(true);
          try {
            const redirectToLogin = (success: boolean) => {
              const params = new URLSearchParams(location.search);
              params.set("successful_signup", success ? "true" : "false");
              params.set("email", email);
              window.location.href = `/login?${params.toString()}`;
            };
            const cleanup = Hub.listen("auth", ({ payload: { event } }) => {
              if (event === "autoSignIn") {
                cleanup();
                redirectToLogin(true);
              } else if (event === "autoSignIn_failure") {
                cleanup();
                redirectToLogin(false);
              }
            });
            await Auth.confirmSignUp(email, code); // return string "SUCCESS"
            setTimeout(() => {
              cleanup();
              redirectToLogin(true);
            }, 5000);
          } catch (e) {
            handleError(e);
          }
          setInProgress(false);
        }
      }}
    >
      <input type="hidden" name="_token" defaultValue="cIQEjC4kpbF6EtXHlzsbByAbNpYiRCW92OdGbgf7" />
      <input type="hidden" name="remember" defaultValue="true" />
      <div className="rounded-md">
        <div className="-mt-px relative">
          <input
            autoFocus={true}
            type="text"
            name="code"
            value={code}
            onChange={e => setCode(e.target.value)}
            aria-label="One time code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            required={true}
            className="border-gray-300 placeholder-gray-500 appearance-none rounded-md relative block w-full px-3 py-2 border text-gray-900 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 focus:z-10 sm:text-sm sm:leading-5"
            placeholder="Code"
          />
          {showCode && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 z-50">
              <a
                href="."
                className="text-gray-900 underline"
                onClick={e => {
                  e.preventDefault();
                  setCode("");
                  handleError(undefined);
                  setCodeSentTs(new Date());
                  Auth.resendSignUp(email);
                }}
              >
                Send again?
              </a>
            </div>
          )}
        </div>
      </div>
      {errors?.verificationCodeMismatch && (
        <div className="flex justify-center mt-5">
          <span className="text-red-600 text-sm">
            This Code is invalid, please try again
            {Math.round(timeLeftTs / 1000) > 0 && (
              <span> in {Math.round(timeLeftTs / 1000)}s.</span>
            )}
          </span>
        </div>
      )}
      <div className="mt-5">
        <button
          type="submit"
          className="relative block w-full py-2 px-3 border border-transparent rounded-md text-white font-semibold bg-gray-800 hover:bg-gray-700 focus:bg-gray-900 focus:outline-none focus:shadow-outline sm:text-sm sm:leading-5"
        >
          {inProgress === true ? (
            <div className="inset-y absolute left-0 pl-3">
              <SpinnerSmall className="w-5" />
            </div>
          ) : (
            <span className="inset-y absolute left-0 pl-3">
              <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
          Confirm
        </button>
      </div>
    </form>
  );
};

export function useReturnBackWhenDone() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getQueryParam(location.search, "redirectTo");
  const returnUrl = redirectTo ?? window.origin + "/admin";

  const [, done] = useCheckCurrentSession({ skip: !redirectTo });
  const pathname = extractRelativeUrl(returnUrl);
  React.useEffect(() => {
    if (done) {
      const { from } = (location.state as { from?: { pathname: string } } | null) || {};
      if (from) {
        navigate(from);
      } else {
        window.location.assign(addLocation(pathname));
      }
    }
  }, [done, navigate, location.state, returnUrl, pathname]);

  return { returnUrl, pathname };
}

// Without adding hostname it's possible to have relative path like `//www.google.com` and it will redirect you to protocol-less URL on different domain
export function addLocation(newRelativeUrl: string, location = window.location) {
  const url = new URL(location.href);
  const parts = newRelativeUrl.split("?");
  url.pathname = parts[0];
  url.search = parts[1] || "";
  return url;
}

export function extractRelativeUrl(url: string) {
  try {
    const uri = new URL(url);
    return uri.pathname + uri.search;
  } catch (error) {
    return url;
  }
}

export const SpinnerSmall = ({ className = "w-4" }) => {
  return (
    <svg
      className={classNames("animate-spin", className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40.077 33.5a18.9 18.9 0 0 1-6.88 6.955 18.644 18.644 0 0 1-9.4 2.545c-3.299 0-6.54-.878-9.398-2.545a18.9 18.9 0 0 1-6.88-6.955A19.158 19.158 0 0 1 5 24c0-3.335.869-6.612 2.518-9.5a18.9 18.9 0 0 1 6.88-6.954A18.644 18.644 0 0 1 23.799 5"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
};
