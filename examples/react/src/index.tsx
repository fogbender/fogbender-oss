import { createRoot } from "react-dom/client";
import React from "react";
import { FogbenderSimpleWidget } from "fogbender-react";

const MyFogbender = () => {
  const clientUrl = "https://main--fb-client.netlify.app";
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Org Name",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "User Name",
    userAvatarUrl:
      "https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png", // optional
  };

  return <FogbenderSimpleWidget clientUrl={clientUrl} token={token} />;
};

const App = () => {
  const [show, setShow] = React.useState(true);
  const hide = () => {
    setShow(!show);
  };
  return (
    <>
      <button id="button" onClick={hide}>
        {show ? "Unmount" : "Remount"}
      </button>
      {show && <MyFogbender />}
    </>
  );
};

createRoot(document.getElementById("app")).render(<App />);
