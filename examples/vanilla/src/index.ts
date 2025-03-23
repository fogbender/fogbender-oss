import { createNewFogbender } from "fogbender";

const addFogbender = async (rootEl: HTMLElement) => {
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
