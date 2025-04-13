import classNames from "classnames";
import { createRoot } from "react-dom/client";
import React from "react";
import {
  FogbenderSimpleRoomyWidget,
  FogbenderRoomyWidget,
  FogbenderProvider,
  FogbenderConfig,
  FogbenderIsConfigured,
  // FogbenderFloatyWidget,
  // FogbenderUnreadBadge,
  // FogbenderHeadlessWidget,
} from "fogbender-react";

const buttonClass =
  "cursor-pointer text-lg font-medium text-gray-500 h-8 border-none bg-white px-4 my-2 rounded";

const clientUrl = "https://main--fb-client.netlify.app";

const token = {
  widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
  customerId: "org123",
  customerName: "Customer Firm",
  userId: "example_PLEASE_CHANGE",
  userJWT:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJjdXN0b21lcklkIjoib3JnMTIzIiwiY3VzdG9tZXJOYW1lIjoiQ3VzdG9tZXIgRmlybSIsInVzZXJFbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJ1c2VyTmFtZSI6IkN1c3RvbWVyIFVzZXIifQ.upRXqWj7WOb-DcjqtJ_jJ96WShbx6npL8hboAurBhYg",
  userEmail: "user@example.com",
  userName: "Customer User",
  userAvatarUrl: "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png", // optional
};

const SimpleRoomyWidget = () => {
  const [show, setShow] = React.useState(true);
  const hide = () => {
    setShow(!show);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-gray-300 w-full mx-auto flex gap-3 border-b-1 border-dashed border-gray-500 justify-center">
        <button className={buttonClass} id="show-button" onClick={hide}>
          {show ? "Unmount" : "Remount"}
        </button>
      </div>
      {show && (
        <FogbenderSimpleRoomyWidget
          clientUrl={clientUrl} // this is optional, default is https://client.fogbender.com
          token={token}
        />
      )}
    </div>
  );
};

const RoomyWidget = () => {
  const [show, setShow] = React.useState(true);
  const [mode, setMode] = React.useState<"light" | "dark">("light");

  const hide = () => {
    setShow(!show);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-gray-300 w-full mx-auto flex gap-3 border-b-1 border-dashed border-gray-500 justify-center">
        <button className={buttonClass} id="show-button" onClick={hide}>
          {show ? "Unmount" : "Remount"}
        </button>
        <button
          className={buttonClass}
          id="mode-button"
          onClick={() => setMode(x => (x === "dark" ? "light" : "dark"))}
        >
          {mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        </button>
      </div>
      {show && (
        <FogbenderProvider>
          <FogbenderConfig clientUrl={clientUrl} mode={mode} token={token} />
          <FogbenderIsConfigured>
            <FogbenderRoomyWidget />
          </FogbenderIsConfigured>
        </FogbenderProvider>
      )}
    </div>
  );
};

const App = () => {
  const [widget, setWidget] = React.useState<"simple-roomy" | "roomy">("simple-roomy");

  const navButtonClass = (id: string) =>
    classNames("cursor-pointer", "text-left px-4 py-2 rounded w-full font-medium transition", {
      "bg-sky-600 text-white": widget === id,
      "bg-white text-gray-700 hover:bg-gray-200": widget !== id,
    });

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col px-2 py-12 bg-gray-300 border-r border-dashed gap-2">
        <button
          onClick={() => setWidget("simple-roomy")}
          className={navButtonClass("simple-roomy")}
        >
          FogbenderSimpleRoomyWidget
        </button>

        <button onClick={() => setWidget("roomy")} className={navButtonClass("roomy")}>
          FogbenderRoomyWidget
        </button>
      </div>

      <div className="flex flex-1">
        {widget === "simple-roomy" && <SimpleRoomyWidget />}
        {widget === "roomy" && <RoomyWidget />}
      </div>
    </div>
  );
};

createRoot(document.getElementById("app")).render(<App />);
