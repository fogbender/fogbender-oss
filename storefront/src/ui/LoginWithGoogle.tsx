import qs from "query-string";
import React from "react";
import { Link } from "react-router-dom";

import googleIcon from "../assets/icon-google.svg";
import { googleLoginUrl } from "../config";

import { popupCenter } from "./authUtils";

const googleLogin = googleLoginUrl();

export const LoginWithGoogle: React.FC<{
  returnUrl: string;
  doGoogleLogin?: boolean;
}> = ({ returnUrl, doGoogleLogin }) => {
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

  return (
    <Link
      to="/login/google"
      className="flex w-full rounded-md border border-gray-300 py-2 px-3 text-center font-medium text-gray-900 no-underline hover:border-gray-400 focus:border-gray-400 focus:outline-none sm:text-sm sm:leading-5"
      onClick={e => {
        e.preventDefault();
        onGoogleLogin(returnUrl);
      }}
    >
      <img alt="Google logo" style={{ width: 18 }} src={googleIcon} />
      <span className="mx-2 flex-grow">Continue with Google</span>
    </Link>
  );
};
