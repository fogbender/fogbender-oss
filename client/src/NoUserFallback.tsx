import React from "react";
import { type Token } from "fogbender";
import { getServerApiUrl } from "fogbender-proto";
import Hand from "./assets/hand.png?url";
import Unicorn from "./assets/unicorn.png?url";
import { FogbenderLogo, ThickButton, useInputWithError } from "./shared";

const NoUserFallback: React.FC<{
  clientEnv: string | undefined;
  token: Token;
}> = ({ clientEnv, token }) => {
  const [vendorName, setVendorName] = React.useState<string>();

  React.useEffect(() => {
    if (token !== undefined) {
      fetch(`${getServerApiUrl(clientEnv)}/client/widget_info`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ token }),
      })
        .then(res =>
          res.ok ? (res.json() as { vendorName?: string } | null) : Promise.reject(res)
        )
        .then(data => {
          if (data && data.vendorName) {
            setVendorName(data.vendorName);
          }
        });
    }
  }, [token, clientEnv]);

  const [emailError, setEmailError] = React.useState<string>();

  const [emailValue, emailInput, resetEmail] = useInputWithError({
    title: "Email",
    error: emailError,
    autoFocus: true,
  });

  const [nameValue, nameInput, resetName] = useInputWithError({
    title: "Your name (optional)",
    error: undefined,
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [returnCounter, setReturnCounter] = React.useState<number>();

  const returnAfter = 9; // seconds

  React.useEffect(() => {
    if (submitSuccess) {
      setReturnCounter(returnAfter);
    }
  }, [submitSuccess]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setReturnCounter(x => (x && x > 0 ? x - 1 : x));
    }, 1000);
    return () => clearTimeout(t);
  }, [returnCounter]);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setEmailError(undefined);
      if (emailValue.trim().length > 0) {
        setSubmitting(true);
        fetch(`${getServerApiUrl(clientEnv)}/client/send_email_fallback_token`, {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ email: emailValue, token, name: nameValue || emailValue }),
        })
          .then(res => (res.ok ? res.json() : Promise.reject(res)))
          .then(() => {
            setSubmitSuccess(true);
          })
          .catch(x => {
            setEmailError("Error processing your email");
            return Promise.reject(x);
          })
          .finally(() => setSubmitting(false));
      }
    },
    [emailValue, nameValue, token, clientEnv]
  );

  return (
    <div className="relative z-10 h-full max-h-screen flex-1 flex flex-col bg-white dark:bg-brand-dark-bg">
      <div className="relatve flex items-center gap-x-2 bg-blue-500 text-white py-2 px-4 fog:text-caption-xl leading-loose">
        <div className="flex-1 invisible">&nbsp;</div>
      </div>

      <div className="-mt-8 flex items-center justify-center">
        <div className="rounded-full bg-white">
          <img
            className="w-16 h-16 my-2 ml-1 mr-2"
            src={submitSuccess ? Unicorn : Hand}
            alt="Hello!"
          />
        </div>
      </div>

      <form
        className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center gap-y-4 fog:text-body-m"
        onSubmit={onSubmit}
      >
        {!submitSuccess && (
          <>
            <div className="mt-4 mb-8 text-center fog:text-header3">
              <br />
              Welcome to
              <br />
              {vendorName} support
            </div>

            <div>
              Start by entering your <span className="text-brand-purple-500">work</span> email:
            </div>
            <div className="w-full">{emailInput}</div>
            {emailValue && <div className="w-full">{nameInput}</div>}
            {emailValue && (
              <ThickButton className="w-full" loading={submitting}>
                Continue
              </ThickButton>
            )}
          </>
        )}

        {submitSuccess && (
          <>
            <div className="mt-4 mb-8 text-center fog:text-header3">One more thing:</div>
            <div className="w-full p-2 bg-yellow-100 text-center fog:text-caption-xl">
              Check your email &mdash;
              <br />
              <br />
              {emailValue}
              <br />
              <br />
              &mdash; for a link to your support helpdesk
            </div>

            <div className="pt-4 fog:text-body-m">
              Wrong email address?{" "}
              <span
                className="fog:text-link"
                onClick={() => {
                  if (returnCounter && returnCounter > 0) {
                    return;
                  }
                  resetEmail();
                  resetName();
                  setSubmitSuccess(false);
                }}
              >
                Click here{returnCounter ? <> (in {returnCounter} sec)</> : null}
              </span>
            </div>
          </>
        )}
      </form>

      <div className="flex scrollbar-hide border-t border-gray-200">
        <div className="w-full shrink-0 snap-center">
          <a
            href="https://fogbender.com"
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-x-1 py-2"
            onClick={e => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.currentTarget.parentElement?.nextElementSibling?.scrollIntoView({
                  behavior: "smooth",
                });
              }
            }}
          >
            <span className="fog:text-body-xs">Powered by</span>
            <span className="fog:text-body-xs">
              <FogbenderLogo className="w-5" />
            </span>
            <span className="fog:text-caption-l">Fogbender</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default NoUserFallback;
