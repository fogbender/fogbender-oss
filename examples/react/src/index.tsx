import { createRoot } from "react-dom/client";
import React from "react";
import { FogbenderSimpleWidget } from "fogbender-react";

const MyFogbender = () => {
  const clientUrl = "https://main--fb-client.netlify.app";
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Customer Firm",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "Customer User",
    userAvatarUrl:
      "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png", // optional
  };

  return <FogbenderSimpleWidget clientUrl={clientUrl} token={token} />;
};

const App = () => {
  const [show, setShow] = React.useState(true);
  const hide = () => {
    setShow(!show);
  };
  return (
    <div style={{ display: "flex", flex: "1" }}>
      <div style={{ display: "flex", flex: "1", flexDirection: "column" }}>
        <button
          style={{
            height: "24px",
            border: "none",
            borderBottom: "1px dashed gray",
          }}
          id="button"
          onClick={hide}
        >
          {show ? "Unmount" : "Remount"}
        </button>
        {show && <MyFogbender />}
      </div>
    </div>
  );
};

createRoot(document.getElementById("app")).render(<App />);
