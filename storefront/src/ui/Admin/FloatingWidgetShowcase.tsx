import classNames from "classnames";
import { FogbenderSimpleFloatie, Token } from "fogbender-react";

import { defaultEnv, getClientUrl } from "../../config";

import { HighlightCode } from "./HighlightCode";

export const Customize = () => {
  const tokenReadable =
    "{\n" +
    Object.entries(token)
      .filter(([key, value]) => key !== "versions" && value !== undefined)
      .map(([key, value]) => `  ${key}: "${value}"`)
      .join(",\n") +
    "\n}";
  return (
    <div className="h-full shadow">
      <div className={classNames("h-full flex-col justify-center bg-white")}>
        <div className="w-full p-4">
          <HighlightCode className="language-js rounded">
            {`import { FogbenderSimpleFloatie, FogbenderUnreadBadge} from "fogbender-react";

const token = ${tokenReadable};

<FogbenderProvider>
  <FogbenderSimpleFloatie${
    defaultEnv === "prod" ? "" : ` clientUrl="${clientUrl}"`
  } token={token} />
</FogbenderProvider>
`}
          </HighlightCode>
        </div>
        <FogbenderSimpleFloatie token={token} clientUrl={clientUrl} />
      </div>
    </div>
  );
};

const clientUrl = getClientUrl();

const token: Token = {
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
