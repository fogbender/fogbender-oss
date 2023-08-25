import "fogbender-element";
import { html, render } from "lit-html";

const app = document.getElementById("app");

const template = () => {
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
  return html`<fogbender-simple-widget
    client-url="https://main--fb-client.netlify.app"
    .token=${token}
  />`;
};
render(template(), document.body);
