import "fogbender-element";
import { html, render } from "lit-html";

const app = document.getElementById("app");

const template = () => {
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
  return html`<fogbender-simple-roomy-widget
    client-url="https://main--fb-client.netlify.app"
    .token=${token}
  />`;
};
render(template(), document.body);
