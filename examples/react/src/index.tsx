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
    userJWT:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJjdXN0b21lcklkIjoib3JnMTIzIiwiY3VzdG9tZXJOYW1lIjoiQ3VzdG9tZXIgRmlybSIsInVzZXJFbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJ1c2VyTmFtZSI6IkN1c3RvbWVyIFVzZXIifQ.upRXqWj7WOb-DcjqtJ_jJ96WShbx6npL8hboAurBhYg",
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
