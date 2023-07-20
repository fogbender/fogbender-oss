import { isUserToken, Token } from "fogbender";
import { getServerApiUrl, UserToken } from "fogbender-proto";
import { parse } from "query-string";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClientProvider } from "react-query";

import Hand from "./assets/hand.png";
import Unicorn from "./assets/unicorn.png";
import {
  App as AppBody,
  AuthorMe,
  ErrorPageFallback,
  FogbenderLogo,
  GalleryModal,
  getVersion,
  IsIdleProvider,
  isIframe,
  ThickButton,
  useInputWithError,
  useIsIdle,
  WsProvider,
} from "./shared";
import { queryClient } from "./shared/utils/client";
import Headless from "./ui/Headless";

const App = () => {
  const [wrongToken, onWrongToken] = React.useReducer(() => true, false);
  const [tokenWithoutVersion, setToken] = React.useState<Token>();
  const token = React.useMemo(() => {
    return addVersion(tokenWithoutVersion);
  }, [tokenWithoutVersion]);
  const [headless, setHeadless] = React.useState<boolean>(false);
  const [notificationsPermission, setNotificationsPermission] = React.useState<
    NotificationPermission | "hide" | "request"
  >(() => {
    // when running inside iframe this value is going to be always "denied"
    // so real value is going to be set by `postMessage` with `notificationsPermission`
    if (window.Notification) {
      return Notification.permission;
    }
    // window.Notification is not set on ios safari, so let's just return "hide"
    return "hide";
  });
  const [roomIdToOpen, setRoomIdToOpen] = React.useState<string>();
  const [clientEnv, setClientEnv] = React.useState<string | undefined>(
    import.meta.env.PUBLIC_DEFAULT_ENV
  );

  React.useEffect(() => {
    const parsedSearch = parse(window.location.search);
    if (typeof parsedSearch.env === "string") {
      setClientEnv(parsedSearch.env);
    }
    if (typeof parsedSearch.token === "string") {
      const userData = JSON.parse(unescape(parsedSearch.token));
      setToken(userData as Token);
    }
    if (typeof parsedSearch.room_id === "string") {
      setRoomIdToOpen(parsedSearch.room_id);
    }
  }, []);

  React.useEffect(() => {
    if (notificationsPermission === "request") {
      if (isIframe) {
        // this is used for communication with parent window which is going to be different for each user
        window.parent.postMessage({ type: "REQUEST_NOTIFICATIONS_PERMISSION" }, "*"); // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
      } else {
        window.Notification?.requestPermission().then(function (permission) {
          setNotificationsPermission(permission);
        });
      }
    }
  }, [notificationsPermission]);

  React.useLayoutEffect(() => {
    // we can't check origin because it's going to be different for each user
    // nosemgrep: javascript.browser.security.insufficient-postmessage-origin-validation.insufficient-postmessage-origin-validation
    window.addEventListener("message", e => {
      if (e.data.initToken) {
        if (e.data.env) {
          setClientEnv(e.data.env);
        }
        setToken(e.data.initToken);

        if (e.data.headless === true) {
          setHeadless(true);
        }
      } else if (e.data.notificationsPermission !== undefined) {
        setNotificationsPermission(
          e.data.notificationsPermission as NotificationPermission | "hide" | "request"
        );
      } else if (e.data.roomIdToOpen !== undefined) {
        setRoomIdToOpen(e.data.roomIdToOpen);
      }
    });

    if (window.parent && window.parent !== window) {
      // this is used for communication with parent window which is going to be different for each user
      window.parent.postMessage({ type: "APP_IS_READY" }, "*"); // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
    }
  }, []);

  const userToken = isUserToken(token) ? token : undefined;

  if (!userToken && token) {
    return <NoTokenFallback clientEnv={clientEnv} token={token} />;
  }
  return (
    <ErrorBoundary FallbackComponent={ErrorPageFallback}>
      <IsIdleProvider>
        <ProviderWrapper
          token={userToken}
          clientEnv={clientEnv}
          wrongToken={wrongToken}
          onWrongToken={onWrongToken}
          headless={headless}
          notificationsPermission={notificationsPermission}
          setNotificationsPermission={setNotificationsPermission}
          roomIdToOpen={roomIdToOpen}
          setRoomIdToOpen={setRoomIdToOpen}
        />
      </IsIdleProvider>
    </ErrorBoundary>
  );
};

const ProviderWrapper: React.FC<{
  token: UserToken | undefined;
  clientEnv: string | undefined;
  wrongToken: boolean;
  onWrongToken: (token: UserToken) => void;
  headless: boolean;
  notificationsPermission: NotificationPermission | "hide" | "request";
  setNotificationsPermission: (p: NotificationPermission | "hide" | "request") => void;
  roomIdToOpen: string | undefined;
  setRoomIdToOpen: (roomId: string) => void;
}> = ({
  token,
  clientEnv,
  wrongToken,
  onWrongToken,
  headless,
  notificationsPermission,
  setNotificationsPermission,
  roomIdToOpen,
  setRoomIdToOpen,
}) => {
  const envRef = React.useRef(clientEnv);
  envRef.current = clientEnv;
  const isIdle = useIsIdle();
  const authorMe = React.useMemo(() => {
    if (token) {
      const me: AuthorMe = {
        name: token.userName,
        email: token.userEmail,
        avatarUrl: token.userAvatarUrl,
      };
      return me;
    }
    return;
  }, [token]);
  return (
    <WsProvider
      token={token}
      client={{
        getEnv: () => envRef.current,
        onWrongToken,
      }}
      isIdle={headless ? true : isIdle}
    >
      <>
        {wrongToken ? (
          <WrongToken />
        ) : headless ? (
          <Headless />
        ) : (
          <QueryClientProvider client={queryClient}>
            <AppBody
              isIdle={isIdle}
              authorMe={authorMe}
              notificationsPermission={notificationsPermission}
              setNotificationsPermission={setNotificationsPermission}
              roomIdToOpen={roomIdToOpen}
              setRoomIdToOpen={setRoomIdToOpen}
            />
            <GalleryModal />
          </QueryClientProvider>
        )}
      </>
    </WsProvider>
  );
};

const NoTokenFallback: React.FC<{
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
    <div className="relative z-10 h-full max-h-screen flex-1 flex flex-col bg-white">
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

const WrongToken = () => {
  throw new Error(
    "Failed to authorize the user. For developers: check to make sure your token is correct."
  );
};

export default App;

function addVersion(token: Token | undefined): Token | undefined {
  if (token) {
    const version = getVersion();
    return { ...token, versions: { ...token.versions, client: version.debugVersion } };
  }
  return token;
}
