import classNames from "classnames";
import { Icons, ThickButton, ThinButton } from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Select } from "fogbender-client/src/shared/ui/Select";
import { stringifyUrl } from "query-string";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { defaultEnv, getClientUrl, getDemoUrl, getServerUrl } from "../../config";
import { type Workspace } from "../../redux/adminApi";
import { apiServer } from "../client";
import { useServerApiGet, useServerApiPost } from "../useServerApi";
import { useDedicatedVendorId, useVendorById } from "../useVendor";

import { useFullScreenClientUrl } from "./HeadlessForSupport";
import { HighlightCode, HighlightCodeWithMask, type MaskMode } from "./HighlightCode";
import { ServerSnippetTabs, SnippetTabs } from "./snippet/SnippetTabs";

const clientUrl = getClientUrl();

const signatures = [
  ["hmac", "HMAC-SHA-256", "(simplest)"],
  ["paseto", "Paseto", ""],
  ["jwt", "JWT", "(recommended)"],
] as const;

const signatureOptions = signatures.map(([id, v1, v2]) => ({ id, option: `${v1} ${v2}` }));

export const SnippetControlsNew: React.FC<{
  workspace: Workspace;
}> = ({ workspace }) => {
  type SignatureType = (typeof signatures)[number][0];

  const [selectedSignatureOption, setSelectedSignatureOption] = React.useState<
    (typeof signatureOptions)[number] | undefined
  >(undefined);

  const [refetchCounter, refetch] = React.useReducer(s => s + 1, 0);

  const [loading, err, data] = useServerApiGet<
    | { error_msg: "signature_not_set" }
    | {
        widget_id: string;
        widget_key: string;
        forward_email_address: string;
        signature_secret: string;
        signature_type: SignatureType;
        visitor_key: string;
        visitors_enabled: boolean;
        user_data: {
          userId: string;
          customerId: string;
        };
        user_hash: string;
        user_jwt: string;
        user_paseto: string;
      }
  >(`/api/workspaces/${workspace.id}/signature_secret`, refetchCounter);

  const serverData = (!loading && data && "signature_type" in data && data) || undefined;
  const serverSignature = (serverData && serverData.signature_type) || undefined;
  const serverSecret = (serverData && serverData.signature_secret) || undefined;

  const visitorsEnabled = (serverData && serverData.visitors_enabled) || false;

  const signature = selectedSignatureOption?.id || serverSignature;
  const selectedOption = selectedSignatureOption ?? signatureOptions.find(o => o.id === signature);

  const [res, call] = useServerApiPost<void>(
    `/api/workspaces/${workspace.id}/reset_signature_secret`,
    {
      signature_secret: serverSecret,
    }
  );

  const [res2, call2] = useServerApiPost<void>(`/api/workspaces/${workspace.id}/signature_secret`, {
    signature_type: signature,
  });

  const setVisitorConfigMutation = useMutation({
    mutationFn: () => {
      return apiServer
        .url(`/api/workspaces/${workspace.id}/visitor_config`)
        .post({ enabled: !visitorsEnabled })
        .text();
    },
    onSuccess: () => {
      // TODO: replace this with query keys
      refetch();
    },
  });

  const resetVisitorKeyMutation = useMutation({
    mutationFn: () => {
      return apiServer.url(`/api/workspaces/${workspace.id}/visitor_key_reset`).post().text();
    },
    onSuccess: () => {
      // TODO: replace this with query keys
      refetch();
    },
  });

  const title = <h2 className="fog:text-header3">Embed and configure the messaging widget</h2>;

  if (res.error || res2.error || err) {
    return (
      <>
        {title}
        <div>Failed to load data, please try again later.</div>
      </>
    );
  }
  const {
    widget_id: widgetId,
    widget_key: widgetKey,
    visitor_key: visitorKey,
    user_data: { userId, customerId },
    user_jwt: userJWT,
    user_hash: userHMAC,
    user_paseto: userPaseto,
  } = serverData || { user_data: {} };

  const x = (signature &&
    (
      {
        hmac: ["userHMAC", userHMAC],

        jwt: ["userJWT", userJWT],
        paseto: ["userPaseto", userPaseto],
      } as const
    )[signature]) || ["", ""];

  const constTokenWithoutSignature = `const token = {
    widgetId: "${widgetId}",
    customerId: "${customerId}",
    customerName: "Netflix",
    userId: "${userId}",
    userEmail: "jim@netflix.com",
    userName: "Jim Lee", // Don’t know the name? Reuse email here
    userAvatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}" // optional
  };`;

  const toMask = (x: string | undefined, visible?: number) =>
    x
      ? x
          .split("")
          .map((x, i) => (i >= (visible ?? 0) ? "*" : x))
          .join("")
      : "";

  const constTokenWithKeyWithMask = (mode: MaskMode) => {
    return constTokenWithoutSignature.replace(
      "customerId",
      `widgetKey: "${
        mode === "clear" ? widgetKey : toMask(widgetKey)
      }", // 🚩 NOT SECURE! SEE STEP 2
    customerId`
    );
  };

  const queryParams = new URLSearchParams(window.location.search);
  return (
    <>
      <div className="flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white">
        {title}

        <p className="mt-2">
          Workspace configuration for{" "}
          <span className="py-0.5 px-1 bg-green-100 dark:text-black rounded">{workspace.name}</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-6 fog:text-body-m">
        <div className="flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white relative">
          <p className="mb-4 fog:text-header4">widgetId</p>
          <div className="flex items-center gap-2">
            <code className="font-bold py-0.5 px-1 bg-green-100 dark:text-black rounded">
              {widgetId}
            </code>
            <div className="py-0.5">
              <ClipboardCopy text={widgetId}>
                <Icons.Clipboard />
              </ClipboardCopy>
            </div>
          </div>
          <p className="mt-4">
            This is your widgetId for creating a token client-side in Step 1 below.
          </p>
          <div className="absolute bottom-2">
            <DemoButton widgetId={widgetId} widgetKey={widgetKey} visitorKey={visitorKey}>
              <span className="text-[4rem]">🕵️</span> Try a live demo!
            </DemoButton>{" "}
          </div>
        </div>

        {(serverSignature === "hmac" ||
          serverSignature === "paseto" ||
          queryParams.has("hmac")) && (
          <div className="flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white">
            <p className="mb-4 fog:text-header4">Server signature type</p>
            <div className="sm:flex gap-4 mb-2">
              <div className="flex-1">
                <div className="mb-4">
                  <Select
                    onChange={setSelectedSignatureOption}
                    options={signatureOptions}
                    selectedOption={selectedOption}
                  />
                </div>
                <p className="my-4">
                  Note: if you change the algorithm after configuring your server-side signature
                  routine, user authentication will stop working until you update your backend code
                  to match the chosen method.
                </p>
                <p className="my-4">
                  <ThinButton
                    disabled={serverSignature === signature}
                    onClick={() => {
                      call2().finally(() => refetch());
                    }}
                  >
                    Change signature type
                  </ThinButton>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white">
          <p className="mb-4 fog:text-header4">Secret</p>
          <div className="flex items-center gap-2">
            <code className="font-bold py-0.5 px-1 bg-green-100 dark:text-black rounded">
              ••••••••••••••••••••••••••••••••
            </code>
            <div className="py-0.5">
              <ClipboardCopy text={serverSecret}>
                <Icons.Clipboard />
              </ClipboardCopy>
            </div>
          </div>
          <p className="my-4">
            This is your secret for signing user data server-side in Step 2 below.
          </p>
          <p className="my-4">Do not publish this secret and never pass it to the browser.</p>
          <p>
            If your secret is compromised, you can generate a new one by clicking the "RESET SECRET"
            button below. Make sure to update your backend code to use the new secret.
          </p>
          <div className="my-4">
            <ThinButton
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure? ALL customer support widgets using this workspace will stop working intil you update your backend code with the new secret"
                  ) === true
                ) {
                  call().finally(() => refetch());
                }
              }}
            >
              Reset secret
            </ThinButton>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white fog:text-body-m">
        <p className="mb-4 fog:text-header4">Visitor key</p>
        <div className="flex gap-2 items-center">
          <code className="font-bold py-0.5 px-1 bg-green-100 dark:text-black rounded">
            ••••••••••••••••••••••••••••••••
          </code>
          <div className="py-0.5">
            <ClipboardCopy text={visitorKey}>
              <Icons.Clipboard />
            </ClipboardCopy>
          </div>
        </div>
        <p className="my-4">
          The visitor widget can be used by unauthenticated users&mdash;for example, on your landing
          page.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center fog:text-body-m gap-2">
            <span className="font-medium">Status: </span>
            <span className="flex items-center gap-1">
              <div
                className={classNames(
                  "inline-block h-3 w-3 rounded-full",
                  visitorsEnabled ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span>{visitorsEnabled ? "Enabled" : "Disabled"} </span>
            </span>
          </div>
          <div>
            <div>
              <ThinButton
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to ${
                        visitorsEnabled ? "DISABLE" : "ENABLE"
                      } the visitor widget?`
                    ) === true
                  ) {
                    setVisitorConfigMutation.mutate();
                  }
                }}
              >
                {visitorsEnabled ? "Disable" : "Enable"}
              </ThinButton>
              <ThinButton
                className="ml-4"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure? This will break your visitor support widget for this workspace until you update your code with the new visitorKey"
                    ) === true
                  ) {
                    resetVisitorKeyMutation.mutate();
                  }
                }}
              >
                Reset key
              </ThinButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {import.meta.env.NODE_ENV === "development" && (
          <ThickButton
            onClick={() =>
              window.open(
                stringifyUrl({
                  url: "http://localhost:3200/support",
                  query: {
                    widgetId,
                    userId,
                    customerId,
                    userJWT,
                  },
                }),
                "_blank"
              )
            }
          >
            Test
          </ThickButton>
        )}
      </div>

      <div className="mt-8 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white fog:text-body-m">
        <h3 className="pb-2 fog:text-header4">Step 1: Install the JavaScript widget (Client)</h3>
        <>
          <div className="pb-2">
            <b>Assumptions:</b>
          </div>
          <div className="pb-2">
            ✅ You’re installing Fogbender for authenticated users (not your landing page)
          </div>
          <div className="pb-2">
            ✅ In your client sessions you have access to your authenticated user’s user id, email,
            customer id, and customer name
          </div>
          <div className="mt-2 pb-2">
            <b>Example:</b>
          </div>
          <div className="pb-2">
            👉 Netflix is one of your customers, multiple people at Netflix use your product
          </div>
          <div className="pb-2">👉 Netflix’s customer id in your system is {customerId}</div>
          <div className="pb-2">
            👉 One of your Netflix users is Jim Lee, his email is jim@netflix.com, and user id{" "}
            {userId}
          </div>
        </>
        <SnippetTabs
          react={
            <>
              <div className="pb-2">
                1️⃣ Install the Fogbender React library, with{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  npm install fogbender-react
                </code>{" "}
                or{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  yarn add fogbender-react
                </code>
              </div>
              <div className="pb-2">
                2️⃣ Create a user token, then render the FogbenderSimpleWidget with the token (see
                example for Jim Lee at Netflix below)
              </div>
              <div className="pb-2">
                3️⃣ (Optional) To learn about our Intercom-style floating support widget, check out{" "}
                {
                  <DemoButton
                    widgetId={widgetId}
                    widgetKey={widgetKey}
                    visitorKey={visitorKey}
                    path="showcase"
                  >
                    our interactive showcase
                  </DemoButton>
                }
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `  import { FogbenderSimpleWidget } from "fogbender-react";

  ${constTokenWithKeyWithMask(mode)}

  <FogbenderSimpleWidget${defaultEnv === "prod" ? "" : ` clientUrl="${clientUrl}"`} token={token} />
                                 `;
                };

                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          javascript={
            <>
              <div className="pb-2">
                1️⃣ Install the Fogbender JavaScript library, with{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  npm install --save fogbender
                </code>{" "}
                or{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  yarn add fogbender
                </code>
                .
              </div>
              <div className="pb-2">
                2️⃣ Call the Fogbender widget with your user token (see example for Jim Lee at
                Netflix below)
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `import { createNewFogbender } from "fogbender";

${constTokenWithKeyWithMask(mode)}

const fogbender = createNewFogbender();${
                    defaultEnv === "prod" ? "" : `\nfogbender.setClientUrl("${clientUrl}")`
                  }
fogbender.setToken(token);

const rootEl = document.getElementById("app");
fogbender.renderIframe({ rootEl });`;
                };

                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          script={
            <>
              <div className="mt-2 mb-4">
                1️⃣ Paste the following snippet into the{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  {"<head>"}
                </code>{" "}
                tag of your website (300 bytes gzipped), but make sure it’s placed before any
                scripts that utilize the Fogbender widget
              </div>
              <HighlightCode className="rounded language-html">
                {`<script async src="${clientUrl}/loader.js"></script>
<script>
  !function(e){var n="fogbender",o=new Proxy({_queue:[],_once:!1},{get:function(e,o){var r=e["_"+n];return"_"===o[0]?e[o]:r?r[o]:function(){var n=arguments;return new Promise((function(r,u){e._queue.push([o,n,r,u])}))}}}),r=e[n]=e[n]||o;r._once?console.error(n+" snippet included twice."):(r._once=!0,r.setVersion("snippet","0.2.0"))}(window);
</script>`}
              </HighlightCode>
              <div className="mt-2 mb-4">
                2️⃣ Call the widget with your user token (see example for Jim Lee at Netflix below)
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `${constTokenWithKeyWithMask(mode)}
${defaultEnv === "prod" ? "" : `\nfogbender.setClientUrl("${clientUrl}")`}
fogbender.setToken(token);

const rootEl = document.getElementById("app");
fogbender.renderIframe({ rootEl });`;
                };

                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          more={
            <>
              <div className="w-full">
                <div className="pb-2">
                  1️⃣ Install the Fogbender React library, with{" "}
                  <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                    npm install fogbender-react
                  </code>{" "}
                  or{" "}
                  <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                    yarn add fogbender-react
                  </code>
                </div>
                <div className="pb-2">
                  2️⃣ Create a user token, see code samples below and{" "}
                  <DemoButton
                    widgetId={widgetId}
                    widgetKey={widgetKey}
                    visitorKey={visitorKey}
                    path="showcase"
                  >
                    our interactive showcase
                  </DemoButton>{" "}
                  for possible widget options
                </div>
                {(() => {
                  const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                  const text = (mode: MaskMode) => {
                    return `${constTokenWithKeyWithMask(mode)}

/* Intercom-style chat widget */
import { FogbenderSimpleFloatie } from "fogbender-react";
<FogbenderSimpleFloatie${defaultEnv === "prod" ? "" : ` clientUrl="${clientUrl}"`} token={token} />

/* unread message counter */
import { FogbenderProvider, FogbenderConfig, FogbenderIsConfigured,
  FogbenderHeadlessWidget, FogbenderUnreadBadge } from "fogbender-react";
<FogbenderProvider>
  <FogbenderConfig${defaultEnv === "prod" ? "" : ` clientUrl="${clientUrl}"`} token={token} />
  <FogbenderIsConfigured>
    <FogbenderHeadlessWidget />
    <FogbenderUnreadBadge />
  </FogbenderIsConfigured>
</FogbenderProvider>

/* mix between plain JavaScript and React */
import { FogbenderProvider, FogbenderWidget, createNewFogbender } from "fogbender-react";
const fogbender = createNewFogbender();${
                      defaultEnv === "prod" ? "" : `\nfogbender.setClientUrl("${clientUrl}")`
                    }
fogbender.setToken(token);

<FogbenderProvider fogbender={fogbender}>
  <FogbenderWidget />
</FogbenderProvider>
                               `;
                  };

                  return (
                    <HighlightCodeWithMask
                      onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                      className="rounded language-js "
                      clearText={text("clear")}
                      visibleText={text(maskMode)}
                    />
                  );
                })()}
              </div>
            </>
          }
        />

        <div className="my-4 pb-2">
          🥷 At this point&mdash;try it! If it’s working, move onto Step 2 below, otherwise ping us
          in <SupportLink />.
        </div>
      </div>

      <div className="mt-8 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:bg-brand-dark-bg dark:text-white fog:text-body-m">
        <h3 className="pb-2 fog:text-header4">
          Step 2: Secure the widget with user signature (Server)
        </h3>
        <>
          <div className="pb-2">
            <b>Important:</b>
          </div>
          <div className="pb-2">
            🚩 If you stop at Step 1, all your user tokens will be re-using the same{" "}
            <code>widgetKey</code>
          </div>
          <div className="pb-2">
            🚩 This means{" "}
            <u>
              any user can potentially modify token values manually to gain access to the history of
              other users or customers
            </u>
          </div>
          <div className="pb-2">
            🚩 To prevent this,{" "}
            <b>
              you must replace <code className="text-blue-600">widgetKey</code> in your token from
              Step 1 with a unique <code className="text-blue-600">{x[0]}</code> generated on your
              server
            </b>{" "}
            for each user token. Make sure to replace the key "widgetKey" with "{x[0]}", not just
            the value. The{" "}
            <b>
              <code className="text-blue-600">userJWT</code> must be
            </b>{" "}
            a JWT signed using the HS256 algorithm.
          </div>
          <div className="pb-2">
            🚩 If you need help, we will help you&mdash;please reach out to us in <SupportLink />
          </div>
        </>
        <ServerSnippetTabs
          jwt={
            <>
              <div className="pb-2">
                ​1️⃣ Sign your user’s data with your secret (you may need to run{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  npm install jsonwebtoken
                </code>{" "}
                or{" "}
                <code className="py-0.5 px-1 rounded bg-yellow-200 dark:text-black">
                  yarn add jsonwebtoken
                </code>{" "}
                first)
              </div>
              <div className="pb-2">2️⃣ Pass the signature to the client</div>
              <div className="pb-2">
                3️⃣ Replace{" "}
                <code>
                  widgetKey: <span className="relative inline-block">{toMask(widgetKey, 4)}</span>
                </code>{" "}
                in your token with <code>{x[0]}: [signature]</code>
              </div>
              <div className="mb-4">
                Below is sample code that generates a signature in Node.js:
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  if (signature === "hmac") {
                    return `import { createHmac } from "crypto";

const secret = "${mode === "mask" ? toMask(serverSecret) : serverSecret}";
const userId = "${userId}";

const userHMAC = createHmac("sha256", secret)
  .update(userId)
  .digest("hex");

console.log(userHMAC); // is "${userHMAC}"

// test
console.assert(userHMAC === "${userHMAC}");`;
                  } else if (signature === "paseto") {
                    return `const { V2 } = require("paseto"); // npm install --save paseto@1

const secret = "${mode === "mask" ? toMask(serverSecret) : serverSecret}";
const userId = "${userId}";
const customerId = "${customerId}";

(async () => {
  const userPaseto = await V2.encrypt({ userId, customerId }, Buffer.from(secret, "utf8"));
  console.log(userPaseto); // like "${userPaseto}"

  // test
  const x = await V2.decrypt(userPaseto, secret);
  console.assert(x.userId === userId && x.customerId === customerId);
})();`;
                  } else if (signature === "jwt") {
                    return `const { sign, verify } = require("jsonwebtoken");

const secret = "${mode === "mask" ? toMask(serverSecret) : serverSecret}";
const userId = "${userId}"; // Jim Lee’s user id; REPLACE
const customerId = "${customerId}"; // Netflix customer id; REPLACE

// 🙋 NOTE: you can optionally also sign customerName, userEmail, and userName here for a stronger check
const userJWT = sign({ userId, customerId }, secret, {
  algorithm: "HS256",
});
console.log(userJWT); // like "${userJWT}"

// test
const x = verify(userJWT, secret);
console.assert(x.userId === userId && x.customerId === customerId);`;
                  } else {
                    return "N/A";
                  }
                };

                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          fetch={
            <>
              <div className="pb-2">1️⃣ Sign your user’s data with your secret</div>
              <div className="pb-2">2️⃣ Pass the signature to the client</div>
              <div className="pb-2">
                3️⃣ Replace{" "}
                <code>
                  widgetKey:{" "}
                  <span className="relative inline-block">
                    {widgetKey}
                    <span className="absolute inset-0 mx-4 backdrop-blur-sm backdrop-filter rounded pointer-events-none" />
                  </span>
                </code>{" "}
                in your token with <code>userJWT: [signature]</code>
              </div>
              <div className="mb-4">
                Below is sample code that gets a signature from our <code>/signatures</code> API in
                Node.js:
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `import fetch from "node-fetch";

const secret = "${mode === "mask" ? toMask(serverSecret) : serverSecret}";
const userId = "${userId}"; // Jim Lee’s user id; REPLACE
const customerId = "${customerId}"; // Netflix customer id; REPLACE

(async () => {
  const res = await fetch("${getServerUrl()}/signatures", {
    method: "POST",
    // Bearer token is your secret
    headers: { Authorization: \`Bearer $\{secret}\` },
    // 🙋 NOTE: you can optionally also sign customerName, userEmail, and userName here for a stronger check
    body: JSON.stringify({ userId, customerId }),
  });
  if (res.ok) {
    const userJWT = (await res.json()).signatures.userJWT;
    console.log(userJWT); // like "${userJWT}"
    // test
    const x = await JSON.parse(atob(userJWT.split(".")[1]));
    console.assert(x.userId === userId && x.customerId === customerId);
  }
})();`;
                };
                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          curl={
            <>
              <div className="mb-4 pb-2">
                If you’re looking for the simplest possible way to generate the value of the{" "}
                <code>{x[0]}</code> field, you can use <code>curl</code> with our{" "}
                <code>/signatures</code> API to generate a signature:
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `
# 🙋 NOTE: you can optionally also sign customerName, userEmail, and userName here for a stronger check
# (Bearer token is your secret)

curl -X POST -H "Authorization: Bearer ${mode === "mask" ? toMask(serverSecret) : serverSecret}" \\
     -d '{"userId":"${userId}","customerId":"${customerId}"}' \\
     ${getServerUrl()}/signatures`;
                };
                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
          fullstack={
            <>
              <div className="pb-2">
                Another option is to compose the user token entirely on your server with the
                following steps:
              </div>
              <div className="pb-2">1️⃣ Form an unsigned token for your user</div>
              <div className="pb-2">
                2️⃣ Call our <code>/signatures</code> API to sign the token
              </div>
              <div className="pb-2">3️⃣ Pass the signed token to the client</div>
              <div className="mb-4">
                Below is sample code that generates such a token in Node.js:
              </div>
              {(() => {
                const [maskMode, setMaskMode] = React.useState<MaskMode>("mask");
                const text = (mode: MaskMode) => {
                  return `import fetch from "node-fetch";

const secret = "${mode === "mask" ? toMask(serverSecret) : serverSecret}";
${constTokenWithoutSignature.replace("const token", "const unsignedToken")}

(async () => {
  const res = await fetch("${getServerUrl()}/signatures", {
    method: "POST",
    // Bearer token is your secret
    headers: { Authorization: \`Bearer \${secret}\` },
    body: JSON.stringify(unsignedToken),
  });
  if (!res.ok) {
    throw new Error(\`\${res.status} \${res.statusText}\`);
  }
  const signatures = (await res.json()).signatures;
  if (!signatures) {
    throw new Error("No signatures returned");
  }

  const { userJWT } = signatures;

  console.log(userJWT); // like "${userJWT}"

  // Now just pass this \`userJWT\` to your web app
  return userJWT;
})();`;
                };
                return (
                  <HighlightCodeWithMask
                    onMaskToggle={(mode: MaskMode) => setMaskMode(mode)}
                    className="rounded language-js "
                    clearText={text("clear")}
                    visibleText={text(maskMode)}
                  />
                );
              })()}
            </>
          }
        />
      </div>
    </>
  );
};

export const SnippetControls: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  return <SnippetControlsNew workspace={workspace} />;
};

const SupportLink = () => {
  const designatedVendorId = useDedicatedVendorId();
  const supportUrl = useFullScreenClientUrl(designatedVendorId);

  return (
    <a
      href={supportUrl}
      target={`_fogbender_${designatedVendorId}`}
      className={[
        "pt-4 pb-3 border-b-5 border-brand-orange-500",
        "no-underline cursor-default",
        "border-opacity-0 cursor-pointer fog:text-link",
      ].join(" ")}
    >
      Support
    </a>
  );
};

const DemoButton = ({
  children,
  widgetId,
  widgetKey,
  visitorKey,
  path = "login",
}: {
  children: React.ReactNode;
  widgetId?: string;
  widgetKey?: string;
  visitorKey?: string;
  path?: string;
}) => {
  const demoUrl = getDemoUrl();
  const vendorName = useVendorById(useDedicatedVendorId())?.name;
  const redirectToDemo0 = useSearchParams()[0].get("demo");
  const redirectToDemo = redirectToDemo0?.replace(/^\//, "");
  const params = React.useMemo(() => {
    if (widgetId && widgetKey) {
      const p = new URLSearchParams([["override", "true"]]);
      p.set("widgetId", widgetId);
      p.set("widgetKey", widgetKey);
      if (vendorName) {
        p.set("vendorName", vendorName);
      }
      if (visitorKey) {
        p.set("visitorKey", visitorKey);
      }
      return p;
    }
    return "";
  }, [widgetId, widgetKey, visitorKey, vendorName]);
  const supportUrl = `${demoUrl}/${redirectToDemo || path}?${params}`;

  React.useEffect(() => {
    // if redirect to demo is set and we have loaded params, redirect to the demo
    if (redirectToDemo && params) {
      window.location.href = supportUrl;
    }
  }, [params, redirectToDemo, supportUrl]);

  if (!widgetId || !widgetKey) {
    return <span>{redirectToDemo ? "Loading..." : children}</span>;
  }

  return (
    <a
      href={supportUrl}
      target="_blank"
      rel="noopener"
      className={classNames(
        "pt-4 pb-3 border-b-5 border-brand-orange-500",
        "no-underline cursor-default",
        "border-opacity-0 cursor-pointer fog:text-link font-medium"
      )}
    >
      {children}
    </a>
  );
};
