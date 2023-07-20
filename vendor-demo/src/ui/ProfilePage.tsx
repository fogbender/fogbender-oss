import classNames from "classnames";
import { useAtom } from "jotai";
import React from "react";
import { useNavigate } from "react-router-dom";

import { tokenAtom, vendorNameAtom } from "../store";

export const Profile = () => {
  const navigate = useNavigate();
  const [localToken, setTokenLS] = useAtom(tokenAtom);

  const [vendorNameLs, setVendorNameLs] = useAtom(vendorNameAtom);
  const [vendorName, setVendorName] = React.useState(vendorNameLs);
  const [widgetId, setWidgetId] = React.useState(() => localToken.widgetId || "");
  const [widgetKey, setwidgetKey] = React.useState(() => localToken.widgetKey || "");
  const [userName, setUserName] = React.useState(() => localToken.userName || "");
  const [customerName, setCustomerName] = React.useState(() => localToken.customerName || "");
  const [customerId0, setCustomerId0] = React.useState(() => localToken.customerId || "");
  const [userEmail, setuserEmail] = React.useState(() => localToken.userEmail || "");

  const customerId = customerId0 || customerName.toLowerCase().replace(/\W+/g, "-");
  const safeUserName = (userName || "john_doe").toLowerCase().replace(/\W+/g, "+");
  const defaultEmail = `${safeUserName}+${customerId}@example.com`;
  const userId = `${userEmail}`;
  // const userAvatarUrl = `https://avatars.dicebear.com/api/pixel-art/${userId}.svg`;
  const userAvatarUrl = undefined;

  const submitDisabled =
    vendorName.trim().length === 0 &&
    widgetId.trim().length === 0 &&
    widgetKey.trim().length === 0 &&
    userName.trim().length === 0 &&
    customerName.trim().length === 0 &&
    customerId.trim().length === 0 &&
    userEmail.trim().length === 0;

  return (
    <form
      className="pb-32"
      onSubmit={e => {
        e.preventDefault();
        if (submitDisabled) {
          return;
        }
        const token = {
          widgetKey,
          widgetId,
          customerId,
          customerName,
          userId,
          userName,
          // userAvatarUrl,
          userEmail: userEmail || defaultEmail,
        };
        console.info("Token saved", token);
        setTokenLS(token);
        setVendorNameLs(vendorName);
        navigate(`/support`);
      }}
    >
      <div className="mt-8 flex flex-col space-y-4">
        <div className="text-lg">Connect to...</div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            Vendor name
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            value={vendorName}
            onChange={x => setVendorName(x.currentTarget.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            widgetId
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            value={widgetId}
            onChange={x => setWidgetId(x.currentTarget.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            widgetKey
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            value={widgetKey}
            onChange={x => setwidgetKey(x.currentTarget.value)}
          />
        </div>

        <div className="text-lg">Connect as...</div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            User name
          </span>
          <div className="flex w-full items-center">
            <input
              className="flex-1 rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
              value={userName}
              onChange={x => setUserName(x.currentTarget.value)}
            />
            {userAvatarUrl && (
              <img src={userAvatarUrl} alt="Generated Avatar" className="ml-2 h-8 w-8" />
            )}
          </div>
        </div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            Customer name
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            value={customerName}
            onChange={x => setCustomerName(x.currentTarget.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            Customer ID
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            value={customerId0}
            onChange={x => setCustomerId0(x.currentTarget.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute top-0 left-2 origin-top-left scale-75 transform text-xs">
            Email
          </span>
          <input
            className="w-full rounded bg-gray-200 px-2 pt-3 pb-1 text-black"
            placeholder={defaultEmail}
            value={userEmail !== defaultEmail ? userEmail : undefined}
            onChange={x => setuserEmail(x.currentTarget.value)}
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          className={classNames(
            "rounded px-2 py-1 text-white",
            submitDisabled ? "cursor-not-allowed bg-gray-400" : "bg-orange-600 hover:bg-orange-500"
          )}
          type="submit"
        >
          Update
        </button>
      </div>
    </form>
  );
};
