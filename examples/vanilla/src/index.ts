import { createNewFogbender } from "fogbender";

const addFogbender = async (rootEl: HTMLElement) => {
  const clientUrl = "https://master--fb-client.netlify.app";
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

  const fogbender = createNewFogbender();
  fogbender.setClientUrl(clientUrl);
  fogbender.setToken(token);
  const cleanup = await fogbender.renderIframe({ rootEl, headless: false });
  return cleanup;
};

const run = async () => {
  const rootEl = document.getElementById("app");
  const cleanup = await addFogbender(rootEl);
  document.getElementById("button").onclick = () => {
    cleanup();
  };
};

run();
