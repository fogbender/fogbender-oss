import classNames from "classnames";
import {
  createNewFogbender,
  FogbenderConfig,
  FogbenderFloatingWidget,
  FogbenderIsConfigured,
  FogbenderProvider,
  FogbenderUnreadBadge,
  Token,
} from "fogbender-react";
import React from "react";

import { getClientUrl } from "../config";

import { HideFloatingWidget } from "./AppRoutes";
import { HighlightCode } from "./HighlightCode";
import { useToken as useUserToken } from "./Support";

export const Showcase = () => {
  const [isVerbose, setIsVerbose] = React.useState(false);
  const [openInNewTab, setOpenInNewTab] = React.useState(false);
  const [isClosable, setIsClosable] = React.useState(false);
  const [defaultOpen, setDefaultOpen] = React.useState(false);
  const [isFallback, setIsFallback] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const token = useToken();
  const tokenReadable =
    "{\n" +
    Object.entries(token)
      .filter(([key]) => (isFallback ? key === "widgetId" || key === "widgetKey" : true))
      .filter(([key, value]) => key !== "versions" && value !== undefined)
      .map(([key, value]) => `  ${key}: "${value}"`)
      .join(",\n") +
    "\n}";

  return (
    <div className="h-full shadow sm:m-24">
      <HideFloatingWidget />
      <div className={classNames("h-full flex-col justify-center bg-white")}>
        <div className="w-full py-2 px-4 sm:p-4">
          <button
            className="mr-4 mb-2 rounded bg-green-500 py-2 px-4 font-bold text-white hover:bg-green-700"
            onClick={() => setUnreadCount(unreadCount + 1)}
          >
            Add unread badge
          </button>
          <button
            className="rounded bg-green-500 py-2 px-4 font-bold text-white hover:bg-green-700"
            onClick={() => setUnreadCount(0)}
          >
            Reset unread badge
          </button>
        </div>
        <div className="w-full px-4 sm:p-4">
          <h3 className="text-xl font-bold">Unread badge example:</h3>
          <button className="mr-4 rounded bg-green-500 py-2 px-4 font-bold text-white hover:bg-green-700">
            <div className="flex">
              On a button
              <FBCounter unreadCount={unreadCount} />
            </div>
          </button>
          <div className="inline-flex rounded-md border p-2 px-4">
            On a div
            <FBCounter unreadCount={unreadCount} />
          </div>
          <HighlightCode className="language-js rounded">
            {`import { FogbenderProvider, FogbenderConfig, FogbenderIsConfigured,
  FogbenderHeadlessWidget, FogbenderUnreadBadge } from "fogbender-react";

const token = ${tokenReadable};

<FogbenderProvider>
  <FogbenderConfig token={token} />
  <FogbenderIsConfigured>
    <FogbenderHeadlessWidget />
    <FogbenderUnreadBadge />
  </FogbenderIsConfigured>
</FogbenderProvider>
`}
          </HighlightCode>
        </div>

        <div className="w-full p-4">
          <h3 className="text-xl font-bold">Floating widget controls</h3>
          <label className="m-2 flex gap-2">
            <input
              type="checkbox"
              checked={isVerbose}
              onChange={() => {
                setIsVerbose(!isVerbose);
              }}
            />{" "}
            Verbose
          </label>
          <label className="m-2 flex gap-2">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={() => setOpenInNewTab(!openInNewTab)}
            />{" "}
            Open in new tab
          </label>
          <label className="m-2 flex gap-2">
            <input
              type="checkbox"
              checked={isClosable}
              onChange={() => {
                setIsClosable(!isClosable);
              }}
            />{" "}
            Closeable (on hover; refresh page to reset)
          </label>
          <label className="m-2 flex gap-2">
            <input
              type="checkbox"
              checked={defaultOpen}
              onChange={() => {
                setDefaultOpen(x => !x);
              }}
            />{" "}
            Start widget with chat open
          </label>
          <label className="m-2 flex gap-2">
            <input
              type="checkbox"
              checked={isFallback}
              onChange={() => {
                setIsFallback(x => !x);
              }}
            />{" "}
            Unknown user flow
          </label>

          <HighlightCode className="language-js rounded">
            {`import { FogbenderProvider, FogbenderConfig, FogbenderIsConfigured,
  FogbenderHeadlessWidget, FogbenderFloatingWidget } from "fogbender-react";

const token = ${tokenReadable};

<FogbenderProvider>
  <FogbenderConfig token={token} />
  <FogbenderIsConfigured>
    <FogbenderHeadlessWidget />
    <FogbenderFloatingWidget${isVerbose ? " verbose={true}" : ""}${
              isClosable ? " closeable={true}" : ""
            }${openInNewTab ? " openInNewTab={true}" : ""}${
              defaultOpen ? " defaultOpen={true}" : ""
            } />
  </FogbenderIsConfigured>
</FogbenderProvider>
`}
          </HighlightCode>
        </div>
        <FBShowcase
          headless={true}
          unreadCount={unreadCount}
          verbose={isVerbose}
          openInNewTab={openInNewTab}
          closeable={isClosable}
          defaultOpen={defaultOpen}
          isFallback={isFallback}
        />
      </div>
    </div>
  );
};

const clientUrl = getClientUrl();

export const FBShowcase = ({
  headless,
  unreadCount,
  verbose,
  openInNewTab,
  closeable,
  defaultOpen,
  isFallback,
}: {
  headless?: boolean;
  unreadCount?: number;
  verbose?: boolean;
  openInNewTab?: boolean;
  closeable?: boolean;
  defaultOpen: boolean;
  isFallback?: boolean;
}) => {
  const fogbender = React.useRef(createNewFogbender());
  const token = useToken();
  const fallbackToken = React.useMemo(() => {
    return {
      widgetId: token.widgetId,
      widgetKey: token.widgetKey,
    };
  }, [token]);
  React.useEffect(() => {
    const f = fogbender.current;
    // @ts-ignore
    f._privateData.events.emit("fogbender.unreadCount", { unreadCount });
  }, [unreadCount, verbose]);
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={isFallback ? fallbackToken : token} />
      <FogbenderIsConfigured>
        {/* {headless ? <FogbenderHeadlessWidget /> : <FogbenderWidget />} */}
        {headless ? (
          <FogbenderFloatingWidget
            key={`${verbose}:${openInNewTab}:${closeable}:${defaultOpen}:${isFallback}`}
            verbose={verbose}
            openInNewTab={openInNewTab}
            closeable={closeable}
            defaultOpen={defaultOpen}
          />
        ) : null}
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

export const FBCounter = ({ unreadCount }: { unreadCount?: number }) => {
  const fogbender = React.useRef(createNewFogbender());
  const token = useToken();
  React.useEffect(() => {
    const f = fogbender.current;
    // @ts-ignore
    f._privateData.events.emit("fogbender.unreadCount", { unreadCount });
  }, [unreadCount]);
  return (
    <FogbenderProvider fogbender={fogbender.current}>
      <FogbenderConfig clientUrl={clientUrl} token={token} />
      <FogbenderIsConfigured>
        {/* <FogbenderUnreadBadge key={"" + unreadCount} /> */}
        <FogbenderUnreadBadge />
      </FogbenderIsConfigured>
    </FogbenderProvider>
  );
};

function useToken(): Token {
  const token = useUserToken();
  if (token) {
    return token;
  }
  return {
    widgetId: "____________________________",
    widgetKey: "test",
    customerId: "org123",
    customerName: "Org Name",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userName: "User Name",
    userAvatarUrl:
      "https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png", // optional
  };
}
