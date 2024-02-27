import { isUserToken, isVisitorToken, type Token } from "fogbender";
import {
  type ClientSession,
  type UserToken,
  type VisitorInfo,
  type VisitorToken,
} from "fogbender-proto";
import { useSetAtom } from "jotai";
import { parse } from "query-string";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClientProvider } from "react-query";

import {
  App as AppBody,
  ErrorPageFallback,
  GalleryModal,
  getVersion,
  IsIdleProvider,
  isIframe,
  type AuthorMe,
  useIsIdle,
  WsProvider,
} from "./shared";
import { handleGoFullScreen } from "./shared/components/GoFullScreen";
import { modeAtom } from "./shared/store/config.store";
import "./shared/styles/tailwind.css";
import { queryClient } from "./shared/utils/client";
import "./styles/tailwind.css";
import Headless from "./ui/Headless";
import NoUserFallback from "./NoUserFallback";

const App = () => {
  const [wrongToken, onWrongToken] = React.useReducer(() => true, false);
  // const [mode, setMode] = React.useState<"light" | "dark">("light");
  const setMode = useSetAtom(modeAtom);
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
      const userData = JSON.parse(decodeURI(parsedSearch.token));
      if (typeof parsedSearch.visitorJWT === "string") {
        const visitorJWT = JSON.parse(decodeURI(parsedSearch.visitorJWT));
        setToken({ ...userData, visitorToken: visitorJWT } as Token);
      } else {
        setToken(userData as Token);
      }
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

  const setVisitorInfo = (info: VisitorInfo, reload?: boolean) => {
    if (window.parent && window.parent !== window) {
      // this is used for communication with parent window which is going to be different for each user
      window.parent.postMessage(
        { type: "VISITOR_INFO", visitorInfo: JSON.stringify(info), reload },
        "*"
      ); // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
    } else {
      // we're in full-screen client mode
      if (isUserToken(token) || isVisitorToken(token)) {
        const { token: visitorJWT } = info;
        handleGoFullScreen(token, visitorJWT, true);
      }
    }
  };

  React.useLayoutEffect(() => {
    // we can't check origin because it's going to be different for each user
    // nosemgrep: javascript.browser.security.insufficient-postmessage-origin-validation.insufficient-postmessage-origin-validation
    window.addEventListener("message", e => {
      if (["light", "dark"].includes(e.data.mode)) {
        setMode(e.data.mode);
      }

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

  const closeFloaty = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CLOSE_FLOATY" }, "*"); // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration
    }
  };

  const userToken = isUserToken(token) ? token : undefined;
  const visitorToken = isVisitorToken(token) ? token : undefined;

  if (!userToken && !visitorToken && token) {
    return <NoUserFallback clientEnv={clientEnv} token={token} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorPageFallback}>
      <IsIdleProvider>
        <ProviderWrapper
          token={userToken || visitorToken}
          clientEnv={clientEnv}
          wrongToken={wrongToken}
          onWrongToken={onWrongToken}
          setVisitorInfo={setVisitorInfo}
          headless={headless}
          notificationsPermission={notificationsPermission}
          setNotificationsPermission={setNotificationsPermission}
          roomIdToOpen={roomIdToOpen}
          setRoomIdToOpen={setRoomIdToOpen}
          closeFloaty={closeFloaty}
        />
      </IsIdleProvider>
    </ErrorBoundary>
  );
};

const ProviderWrapper: React.FC<{
  token: UserToken | VisitorToken | undefined;
  clientEnv: string | undefined;
  wrongToken: boolean;
  onWrongToken: (token: UserToken) => void;
  setVisitorInfo?: (x: VisitorInfo, reload?: boolean) => void;
  headless: boolean;
  notificationsPermission: NotificationPermission | "hide" | "request";
  setNotificationsPermission: (p: NotificationPermission | "hide" | "request") => void;
  roomIdToOpen: string | undefined;
  setRoomIdToOpen: (roomId: string) => void;
  closeFloaty: () => void;
}> = ({
  token,
  clientEnv,
  wrongToken,
  onWrongToken,
  setVisitorInfo,
  headless,
  notificationsPermission,
  setNotificationsPermission,
  roomIdToOpen,
  setRoomIdToOpen,
  closeFloaty,
}) => {
  const envRef = React.useRef(clientEnv);
  envRef.current = clientEnv;
  const isIdle = useIsIdle();

  const [authorMe, setAuthorMe] = React.useState<AuthorMe>();

  return (
    <WsProvider
      token={token}
      client={{
        getEnv: () => envRef.current,
        onWrongToken,
        setVisitorInfo,
        setSession: ({ userAvatarUrl, userName, userEmail, customerName }: ClientSession) => {
          if (userName && userEmail) {
            setAuthorMe({
              name: userName,
              email: userEmail,
              avatarUrl: userAvatarUrl,
              customerName,
            });
          }
        },
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
              closeFloaty={closeFloaty}
            />
            <GalleryModal />
          </QueryClientProvider>
        )}
      </>
    </WsProvider>
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
