import classNames from "classnames";
import qs from "query-string";
import React from "react";
import { Provider } from "react-redux";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Title } from "reactjs-meta";

import fogbender from "../assets/fogbender.svg";
import logo from "../assets/logo.svg";
import { getQueryParam } from "../params";
import { store } from "../redux/store";

import { Auth } from "./amazon";
import {
  addLocation,
  type AuthErrors,
  ConfirmEmailForm,
  extractRelativeUrl,
  SpinnerSmall,
  useReturnBackWhenDone,
  useTimePassedSince,
} from "./authUtils";
import { apiServer } from "./client";
import { LoginWithGoogle } from "./LoginWithGoogle";
import { useCognito } from "./useCognito";

export const Login = () => {
  return (
    <Provider store={store}>
      <Title>Fogbender | Login</Title>
      <Routes>
        <Route path="" element={<LoginForm />} />
        <Route path="callback" element={<LoginCallback />} />
        <Route path="google" element={<LoginForm doGoogleLogin={true} />} />
      </Routes>
    </Provider>
  );
};

export const LoginCallback: React.FC<{}> = () => {
  const location = useLocation();
  const returnUrl = getQueryParam(location.search, "returnUrl") || "/admin";
  React.useEffect(() => {
    const pathname = extractRelativeUrl(returnUrl);
    if (window.opener) {
      window.opener.location.href = addLocation(pathname, window.opener.location).toString();
      window.close();
    } else {
      window.location.assign(addLocation(pathname));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="m-4 text-xl">
      Login successful, {window.opener ? "you may now close this window." : "redirecting..."}
    </div>
  );
};

export const LoginForm: React.FC<{ doGoogleLogin?: boolean }> = ({ doGoogleLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { returnUrl, pathname } = useReturnBackWhenDone();

  const [loggedIn, setLoggedIn] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<string>();
  const [loggingIn, setLoggingIn] = React.useState(false);

  React.useEffect(() => {
    if (!loggedIn) {
      Auth.currentUserInfo().then(x => {
        console.info({ x });
        if (x) {
          setLoggedIn(true);
          const { name, email } = x.attributes;
          setUserInfo(`${name} (${email})`);
        }
      });
    }
  }, [loggedIn]);

  const { login } = useCognito();

  React.useEffect(() => {
    const run = async () => {
      const jwt = (await Auth.currentSession()).getIdToken().getJwtToken();
      // FIXME: add CSRF token for login
      const { ok, login_callback: loginCallback } = await login(jwt);
      if (ok) {
        await Auth.signOut(); // logout from cognito since we are already have fogbender session
        window.location.href = loginCallback || pathname || "/admin";
      }
    };
    // comment this out to debug cognito login without signing into fogbender
    if (loggedIn) {
      run();
    }
  }, [loggedIn, login, pathname]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [recoveryCode, setRecoveryCode] = React.useState("");
  const [errors, setErrors] = React.useState<AuthErrors>();
  const [confirmEmail, setConfirmEmail] = React.useState<string>();
  const [recoveringPassword, setRecoveringPassword] = React.useState<boolean>();
  const [codeSentTs, setCodeSentTs] = React.useState(new Date());
  const { timePassed: showCode, timeLeftTs } = useTimePassedSince(codeSentTs, 30_000);

  const handleError = React.useCallback((error: { code: string } | undefined) => {
    if (error === undefined) {
      setErrors(undefined);
    } else if (error.code === "CodeMismatchException") {
      setErrors({ verificationCodeMismatch: true });
    } else if (error.code === "UserNotFoundException") {
      setErrors({ userNotFound: true });
    } else if (error.code === "UserNotConfirmedException") {
      setErrors({ userNotConfirmed: true });
    } else if (error.code === "NotAuthorizedException") {
      setErrors({ notAuthorized: true });
    } else if (error.code === "InvalidPasswordException") {
      setErrors({ weakPassword: true });
    } else if (error.code === "LimitExceededException") {
      setErrors({ limitExceeded: true });
    }
  }, []);

  if (loggedIn) {
    return (
      <div>
        Logged in as {userInfo}
        <br />
        <button
          className="border bg-gray-200 focus:bg-gray-300"
          onClick={async () => {
            await Auth.signOut();
            setLoggedIn(false);
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md py-12 px-6">
        <a href="/">
          <div className="mx-auto flex items-end justify-center">
            <img className="h-12" src={logo.src} alt="" />
            <img className="ml-2 h-8" src={fogbender.src} alt="" />
          </div>
        </a>
        {confirmEmail === undefined && recoveringPassword !== true && (
          <form
            className="mt-5"
            onSubmit={async e => {
              e.preventDefault();
              setErrors(undefined);

              if (email.length !== 0 && password.length !== 0) {
                setLoggingIn(true);
                try {
                  const login = await Auth.signIn({
                    username: email,
                    password,
                  });
                  console.info({ login });
                  if (login) {
                    setLoggedIn(true);
                    const { name, email } = login.attributes;
                    setUserInfo(`${name} (${email})`);
                  }
                } catch (e) {
                  setPassword("");
                  handleError(e as any);
                }
                setLoggingIn(false);
              }
            }}
          >
            <input
              type="hidden"
              name="_token"
              defaultValue="cIQEjC4kpbF6EtXHlzsbByAbNpYiRCW92OdGbgf7"
            />
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md">
              <div>
                <input
                  aria-label="Email"
                  name="email"
                  type="email"
                  required={true}
                  value={email}
                  onChange={e => {
                    errors !== undefined && setErrors(undefined);
                    setEmail(e.target.value);
                  }}
                  className={classNames(
                    "relative block w-full appearance-none rounded-none px-3 py-2 placeholder-gray-500",
                    "focus:shadow-outline-blue rounded-t-md text-gray-900 focus:outline-none",
                    "focus:z-10 sm:text-sm sm:leading-5",
                    "focus:border-blue-300",
                    "border",
                    errors?.userNotFound === true ? "border-brand-pink-500" : "border-gray-300",
                    errors?.notAuthorized === true && "border-b-0"
                  )}
                  placeholder="Email 2"
                />
              </div>
              <div>
                <input
                  aria-label="Password"
                  name="password"
                  type="password"
                  onChange={e => setPassword(e.target.value)}
                  value={password}
                  required={true}
                  className={classNames(
                    "relative block w-full appearance-none rounded-none px-3 py-2 placeholder-gray-500",
                    "focus:shadow-outline-blue rounded-b-md text-gray-900 focus:outline-none",
                    "focus:z-10 sm:text-sm sm:leading-5",
                    "border-l border-r border-b",
                    "focus:border-blue-300",
                    errors?.notAuthorized === true
                      ? "border-brand-pink-500 border-t"
                      : "border-gray-300"
                  )}
                  placeholder="Password"
                />
              </div>
            </div>
            {errors?.notAuthorized === true && (
              <div className="text-brand-pink-500 mt-7 text-center">
                Incorrect password, please try again.{" "}
                <a
                  href="."
                  className="text-gray-900 underline"
                  onClick={e => {
                    e.preventDefault();
                    setErrors(undefined);
                    Auth.forgotPassword(email);
                    setRecoveringPassword(true);
                  }}
                >
                  Reset?
                </a>
              </div>
            )}
            {errors?.userNotFound === true && (
              <div className="text-brand-pink-500 mt-7 text-center">No such user</div>
            )}
            {errors?.userNotConfirmed === true && (
              <div className="text-brand-pink-500 mt-7 text-center">
                {email} is not confirmed.{" "}
                <a
                  href="."
                  className="text-gray-900 underline"
                  onClick={e => {
                    e.preventDefault();
                    Auth.resendSignUp(email);
                    setCodeSentTs(new Date());
                    setConfirmEmail(email);
                  }}
                >
                  Confirm?
                </a>
              </div>
            )}
            <div className="mt-7">
              <button
                type="submit"
                className="focus:shadow-outline relative block w-full rounded-md border border-transparent bg-gray-800 py-2 px-3 font-semibold text-white hover:bg-gray-700 focus:bg-gray-900 focus:outline-none sm:text-sm sm:leading-5"
              >
                {loggingIn === true ? (
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
                Log in
              </button>
            </div>
          </form>
        )}
        {confirmEmail && (
          <ConfirmEmailForm
            inProgress={loggingIn}
            setInProgress={setLoggingIn}
            email={confirmEmail}
            handleError={handleError}
            showCode={showCode}
            setCodeSentTs={setCodeSentTs}
            errors={errors}
            timeLeftTs={timeLeftTs}
          />
        )}
        {recoveringPassword === true && (
          <form
            className="mt-5"
            onSubmit={async e => {
              e.preventDefault();
              setErrors(undefined);
              if (recoveryCode.length !== 0 && password.length !== 0) {
                try {
                  await Auth.forgotPasswordSubmit(email, recoveryCode, password); // return string "SUCCESS"

                  if (location.pathname === "/login") {
                    const search = qs.stringify({ password_reset: true, email });
                    window.location.href = `/login?${search}`;
                  } else {
                    navigate({
                      pathname: "/login?",
                      search: qs.stringify({ password_reset: true, email }),
                    });
                  }
                } catch (e) {
                  handleError(e as any);
                }
              }
            }}
          >
            <input
              type="hidden"
              name="_token"
              defaultValue="cIQEjC4kpbF6EtXHlzsbByAbNpYiRCW92OdGbgf7"
            />
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md">
              <div className="relative -mt-px">
                <input
                  autoFocus={true}
                  type="text"
                  name="code"
                  aria-label="One time code"
                  onChange={e => setRecoveryCode(e.target.value)}
                  value={recoveryCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  required={true}
                  className={classNames(
                    "relative block w-full appearance-none rounded-none px-3 py-2 placeholder-gray-500",
                    "focus:shadow-outline-blue rounded-t-md text-gray-900 focus:outline-none",
                    "focus:z-10 sm:text-sm sm:leading-5",
                    "focus:border-blue-300",
                    "border",
                    "border-gray-300",
                    errors?.verificationCodeMismatch === true && "border-b-0"
                  )}
                  placeholder="Code from email"
                />
              </div>
              <div>
                <input
                  aria-label="Password"
                  name="password"
                  type="password"
                  onChange={e => setPassword(e.target.value)}
                  value={password}
                  required={true}
                  className={classNames(
                    "relative block w-full appearance-none rounded-none px-3 py-2 placeholder-gray-500",
                    "focus:shadow-outline-blue rounded-b-md text-gray-900 focus:outline-none",
                    "focus:z-10 sm:text-sm sm:leading-5",
                    "border-l border-r border-b",
                    "focus:border-blue-300",
                    errors?.notAuthorized === true
                      ? "border-brand-pink-500 border-t"
                      : "border-gray-300"
                  )}
                  placeholder="New password"
                />
              </div>
            </div>
            {errors?.verificationCodeMismatch === true && (
              <div className="mt-5 flex justify-center">
                <span className="text-sm text-red-600">
                  This Code is invalid, please try again
                  {Math.round(timeLeftTs / 1000) > 0 && (
                    <span> in {Math.round(timeLeftTs / 1000)}s.</span>
                  )}
                </span>
              </div>
            )}
            {errors?.weakPassword === true && (
              <div className="mt-5 flex justify-center">
                <span className="text-sm text-red-600">
                  That's a weak password; please try again.
                </span>
              </div>
            )}
            {errors?.limitExceeded === true && (
              <div className="mt-5 flex justify-center">
                <span className="text-sm text-red-600">
                  Too many attempts! Please try again after a long coffee break.
                </span>
              </div>
            )}
            <div>
              <div className="flex justify-between gap-4">
                <div
                  className="mt-4 cursor-pointer text-center underline"
                  onClick={() => {
                    setPassword("");
                    setRecoveryCode("");
                    setErrors(undefined);
                    Auth.forgotPassword(email);
                  }}
                >
                  Resend recovery code
                </div>
                <div
                  className="mt-4 cursor-pointer text-center underline"
                  onClick={() => {
                    setErrors(undefined);
                    setRecoveringPassword(undefined);
                  }}
                >
                  Back to login
                </div>
              </div>
              <button
                type="submit"
                className="focus:shadow-outline relative mt-5 block w-full rounded-md border border-transparent bg-gray-800 py-2 px-3 font-semibold text-white hover:bg-gray-700 focus:bg-gray-900 focus:outline-none sm:text-sm sm:leading-5"
              >
                <span className="inset-y absolute left-0 pl-3">
                  <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                Set new password
              </button>
            </div>
          </form>
        )}
        <div className="mt-7">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm leading-5">
              <span className="bg-gray-100 px-2 text-gray-500">Don't have an account?</span>
            </div>
          </div>
          {
            <>
              <div className="mt-7">
                <a
                  href="/demo"
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
                >
                  Book a demo
                </a>
              </div>
              <div className="mt-5">
                <Link
                  to={{ pathname: "/signup", search: location.search }}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
                >
                  Sign up
                </Link>
              </div>
              <div className="relative mt-5">
                <LoginWithGoogle returnUrl={returnUrl} doGoogleLogin={doGoogleLogin} />
              </div>
              <div className="relative mt-8 text-center text-sm">
                If you need help, please email{" "}
                <a href="mailto:support@fogbender.com" className="fog:text-link">
                  support@fogbender.com
                </a>
              </div>
            </>
          }
          {import.meta.env.DEV && <LoginDevOnly email={email} />}
        </div>
      </div>
    </div>
  );
};

function LoginDevOnly({ email }: { email: string }) {
  return (
    <div className="mt-5">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm leading-5">
          <span className="bg-gray-100 px-2 text-gray-500">Dev only</span>
        </div>
      </div>
      <div className="mt-7">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="http://localhost:8000/public/emails"
          className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
        >
          Open local email client
        </a>
      </div>
      <div className="mt-5">
        <a
          href="/login"
          onClick={e => {
            e.preventDefault();
            if (!email) {
              alert(
                "Please enter an email address at the top of the login form and click this button again"
              );
              return;
            }
            apiServer
              .url(`/auth/dev-only`)
              .post({
                email,
              })
              .text()
              .catch(err => {
                alert("Failed to login");
                throw err;
              })
              .then(() => {
                alert(
                  `A login link was created for ${email}. You can see the link in the Elixir terminal or in the local email client (button above). After opening the link, you can open http://localhost:3100/admin`
                );
              });
          }}
          className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
        >
          {email ? <>Login as {email} (dev only)</> : "Dev-only login"}
        </a>
      </div>
    </div>
  );
}
