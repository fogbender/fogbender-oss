import classNames from "classnames";
import qs from "query-string";
import React from "react";
import { Provider } from "react-redux";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Title } from "reactjs-meta";

import fogbender from "../assets/fogbender.svg";
import logo from "../assets/logo.svg";
import { googleLoginUrl } from "../config";
import { store } from "../redux/store";

import { Auth } from "./amazon";
import {
  type AuthErrors,
  ConfirmEmailForm,
  popupCenter,
  SpinnerSmall,
  useReturnBackWhenDone,
  useTimePassedSince,
} from "./authUtils";
import { LoginWithGoogle } from "./LoginWithGoogle";

const googleLogin = googleLoginUrl();

export const Signup = () => {
  return (
    <Provider store={store}>
      <Title>Fogbender | Sign up</Title>
      <Routes>
        <Route path="" element={<SignupForm />} />
        <Route path="google" element={<SignupForm doGoogleLogin={true} />} />
      </Routes>
    </Provider>
  );
};

export const SignupForm: React.FC<{ doGoogleLogin?: boolean }> = ({ doGoogleLogin }) => {
  const location = useLocation();
  const { returnUrl } = useReturnBackWhenDone();

  const onGoogleLogin = (returnUrl: string) => {
    const opts = "location=no,scrollbars=yes,status=yes," + popupCenter(500, 600);
    const url = qs.stringifyUrl({ url: googleLogin, query: { returnUrl } });
    window.open(url, "_blank", opts);
  };

  React.useEffect(() => {
    if (doGoogleLogin) {
      onGoogleLogin(returnUrl);
    }
  }, [doGoogleLogin, returnUrl]);

  const [codeSentTs, setCodeSentTs] = React.useState(new Date());
  const [signingUp, setSigningUp] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState<string>();

  const { timePassed: showCode, timeLeftTs } = useTimePassedSince(codeSentTs, 30_000);

  const [errors, setErrors] = React.useState<AuthErrors>();

  const handleError = React.useCallback((error: { code: string; message: string } | undefined) => {
    if (error === undefined) {
      setErrors(undefined);
    } else if (error.code === "CodeMismatchException") {
      setErrors({ verificationCodeMismatch: true });
    } else if (error.code === "InvalidPasswordException") {
      setErrors({ weakPassword: true });
    } else if (error.code === "LimitExceededException") {
      setErrors({ limitExceeded: true });
    } else if (error.code === "UsernameExistsException") {
      setErrors({ emailTaken: true });
    } else if (error.code === "InvalidParameterException") {
      if (error.message.includes("password") && error.message.includes("length")) {
        setErrors({ passwordTooShort: true });
      } else {
        setErrors({ weakPassword: true });
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md py-12 px-6">
        <div className="mx-auto flex items-end justify-center">
          <img className="h-12" src={logo.src} alt="" />
          <img className="ml-2 h-8" src={fogbender.src} alt="" />
        </div>
        <h1 className="mt-6 text-center text-sm leading-5 text-gray-900">
          {confirmEmail ? (
            <>Please check your email inbox and enter your code:</>
          ) : (
            <>Create a new account</>
          )}
        </h1>
        {confirmEmail && (
          <ConfirmEmailForm
            inProgress={signingUp}
            setInProgress={setSigningUp}
            email={confirmEmail}
            handleError={handleError}
            showCode={showCode}
            setCodeSentTs={setCodeSentTs}
            errors={errors}
            timeLeftTs={timeLeftTs}
          />
        )}
        {!confirmEmail && (
          <form
            className="mt-5"
            onSubmit={async e => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = data.get("name");
              const email = data.get("username");
              const password = data.get("password");
              if (
                typeof name === "string" &&
                typeof email === "string" &&
                typeof password === "string"
              ) {
                setSigningUp(true);
                try {
                  const { userConfirmed } = await Auth.signUp({
                    username: email,
                    password,
                    attributes: { name },
                    validationData: {
                      recaptchaToken: "example token",
                    },
                    autoSignIn: { enabled: true },
                  });
                  if (userConfirmed === false) {
                    setConfirmEmail(email);
                    setCodeSentTs(new Date());
                  }
                } catch (e) {
                  handleError(e as any);
                }
                setSigningUp(false);
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
                  aria-label="Email address"
                  name="username"
                  type="email"
                  required={true}
                  className={classNames(
                    "focus:shadow-outline-blue relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-300 focus:outline-none sm:text-sm sm:leading-5",
                    errors?.emailTaken && "border-red-600"
                  )}
                  placeholder="Email address"
                />
              </div>
              <div>
                <input
                  aria-label="Name"
                  name="name"
                  autoComplete="name"
                  required={true}
                  className="focus:shadow-outline-blue relative block w-full appearance-none rounded-none border-l border-r border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-300 focus:outline-none sm:text-sm sm:leading-5"
                  placeholder="Name"
                />
              </div>
              <div className="relative -mt-px">
                <input
                  aria-label="Password"
                  name="password"
                  type="password"
                  {...{
                    passwordrules:
                      "minlength: 10; maxlength: 256; required: lower; required: digit;",
                  }}
                  required={true}
                  className={classNames(
                    "focus:shadow-outline-blue relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-300 focus:outline-none sm:text-sm sm:leading-5",
                    errors?.passwordTooShort && "border-red-600"
                  )}
                  placeholder="Password"
                />
              </div>
            </div>
            {errors?.emailTaken && (
              <div className="mt-5 flex justify-center">
                <span className="text-sm text-red-600">
                  An account with this address already exists
                </span>
              </div>
            )}
            {errors?.passwordTooShort && (
              <div className="mt-5 flex justify-center">
                <span className="text-sm text-red-600">Password is too short</span>
              </div>
            )}
            {errors?.weakPassword === true && (
              <div className="mt-5 flex justify-center">
                <span className="text-center text-sm text-red-600">
                  Use 10 or more characters with a mix of lowercase letters and numbers.
                </span>
              </div>
            )}
            <div className="mt-5 text-xs">
              <span>By signing up, you’re agreeing with Fogbender’s </span>
              <a
                href="https://github.com/fogbender/legal/blob/master/terms-of-service.txt"
                target="_blank"
              >
                terms of service
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/fogbender/legal/blob/master/privacy-policy.txt"
                target="_blank"
              >
                privacy policy
              </a>
            </div>
            <div className="mt-5">
              <button
                type="submit"
                className="focus:shadow-outline relative block w-full rounded-md border border-transparent bg-gray-800 py-2 px-3 font-semibold text-white hover:bg-gray-700 focus:bg-gray-900 focus:outline-none sm:text-sm sm:leading-5"
              >
                {signingUp === true ? (
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
                Sign up
              </button>
            </div>
            <div className="mt-7">
              <a
                href="/demo"
                className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
              >
                Book a demo
              </a>
            </div>
          </form>
        )}
        <div className="mt-7">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm leading-5">
              <span className="bg-gray-100 px-2 text-gray-500">Already have an account?</span>
            </div>
          </div>
          <div className="mt-5">
            <Link
              to={{ pathname: "/login", search: location.search }}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
            >
              Sign in
            </Link>
          </div>
          <div className="relative mt-5">
            <LoginWithGoogle returnUrl={returnUrl} />
          </div>
          <div className="relative mt-8 text-center text-sm">
            If you need help, please email{" "}
            <a href="mailto:support@fogbender.com" className="fog:text-link">
              support@fogbender.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
