/* eslint-disable jsx-a11y/anchor-is-valid */
import {
  createNewFogbender,
  FogbenderConfig,
  FogbenderFloatingWidget,
  FogbenderIsConfigured,
  FogbenderProvider,
  FogbenderUnreadBadge,
  Token,
} from "fogbender-react";
import {} from "fogbender";
import React from "react";

import { getClientUrl } from "../config";

import { HighlightCode } from "./HighlightCode";
import { useToken as useUserToken } from "./Support";

export const Showcase = () => {
  const [isFallback, setIsFallback] = React.useState(false);
  const token = useToken();
  const tokenValues = Object.entries(token)
    .filter(([key]) => (isFallback ? key === "widgetId" || key === "widgetKey" : true))
    .filter(([key, value]) => key !== "versions" && value !== undefined);
  const tokenJSONString = JSON.stringify(Object.fromEntries(tokenValues));
  const tokenReadable =
    "{\n" + tokenValues.map(([key, value]) => `  ${key}: "${value}"`).join(",\n") + "\n}";
  const bookmarkletCode = `import("https://esm.sh/fogbender-element");document.body.insertAdjacentHTML('beforeEnd', \`<fogbender-simple-floatie token='${tokenJSONString}' />\`);
`;

  return (
    <div className="h-full shadow sm:m-24">
      <div className="h-full flex-col justify-center bg-white p-4">
        <h3 className="text-xl font-bold">Options:</h3>
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
        <h3 className="text-xl font-bold">For Console in Chrome Dev Tools:</h3>
        <div className="w-full py-2 px-4 sm:p-4">
          <h3 className="text-xl font-bold">Floating widget demo</h3>
          <HighlightCode className="language-js rounded">{bookmarkletCode}</HighlightCode>
          drag&drop bookmarklet to the toolbar:{" "}
          <a href={`javascript:${bookmarkletCode}`} className="text-blue-500">
            Fogbender Demo
          </a>
        </div>
        <h3 className="text-xl font-bold">
          Good to go for a codepen, or just save it to index.html file locally:
        </h3>
        <div className="w-full p-4">
          <h3 className="text-xl font-bold">Floating widget with JSON.stringify</h3>

          <HighlightCode className="language-html rounded">
            {`<script type="module" src="https://esm.sh/fogbender-element"></script>
<fogbender-simple-floatie token='${tokenJSONString}' />`}
          </HighlightCode>
        </div>
        <div className="w-full p-4">
          <h3 className="text-xl font-bold">Floating widget with lit-html</h3>

          <HighlightCode className="language-html rounded">
            {`<script type="module">
  import "https://esm.sh/fogbender-element";
  import { html, render } from "https://unpkg.com/lit-html?module";
  const root = document.createElement("div");
  document.body.appendChild(root);

  const token = ${tokenReadable.replaceAll("\n", "\n  ")};

  const view = html\`<fogbender-simple-floatie .token=\${token} />\`; 
  render(view, root)
</script>`}
          </HighlightCode>
        </div>
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
