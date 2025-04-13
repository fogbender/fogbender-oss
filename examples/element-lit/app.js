import "fogbender-element";
import { html, render } from "lit-html";

const clientUrl = "https://main--fb-client.netlify.app"; // XXX remove in production

const token = {
  widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
  customerId: "org123",
  customerName: "Customer Firm",
  userId: "example_PLEASE_CHANGE",
  userEmail: "user@example.com",
  userJWT:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJjdXN0b21lcklkIjoib3JnMTIzIiwiY3VzdG9tZXJOYW1lIjoiQ3VzdG9tZXIgRmlybSIsInVzZXJFbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJ1c2VyTmFtZSI6IkN1c3RvbWVyIFVzZXIifQ.upRXqWj7WOb-DcjqtJ_jJ96WShbx6npL8hboAurBhYg",
  userName: "Customer User",
  userAvatarUrl: "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png",
};

const scenarioKeys = ["Simple Roomy", "Roomy"];
let activeScenario = "Simple Roomy";
let show = true;
let mode = "light";

const buttonStyle = (selected = false) =>
  `cursor: pointer; padding: 0.5rem 1rem; margin: 0.25rem; border: none; border-radius: 4px; font-weight: 500; transition: background 0.2s ease; ${
    selected
      ? "background: #0284c7; color: white;"
      : "background: white; color: #374151; border: 1px solid #ccc;"
  }`;

const scenarioTemplates = {
  "Simple Roomy": () =>
    html`<fogbender-simple-roomy-widget
      client-url=${clientUrl}
      .token=${token}
    ></fogbender-simple-roomy-widget>`,
  "Roomy": () =>
    html`
      <fogbender-provider>
        <fogbender-config client-url=${clientUrl} .mode=${mode} .token=${token}></fogbender-config>
        <fogbender-roomy-widget></fogbender-roomy-widget>
      </fogbender-provider>
    `,
};

const rerender = () => {
  const controls = html`
    <div style="padding: 1rem; background: #d1d5db; display: flex; flex-wrap: wrap;">
      ${scenarioKeys.map(
        key => html`
          <button
            style=${buttonStyle(key === activeScenario)}
            @click=${() => {
              activeScenario = key;
              show = true;
              rerender();
            }}
          >
            ${key}
          </button>
        `
      )}
      <button
        style=${buttonStyle()}
        @click=${() => {
          show = !show;
          rerender();
        }}
      >
        ${show ? "Unmount" : "Remount"}
      </button>
      ${activeScenario !== "Simple Roomy"
        ? html`
            <button
              style=${buttonStyle()}
              @click=${() => {
                mode = mode === "light" ? "dark" : "light";
                rerender();
              }}
            >
              Switch to ${mode === "light" ? "dark" : "light"} mode
            </button>
          `
        : ""}
    </div>
  `;

  const content = html`
    <div style="flex: 1; display: flex; min-height: 0; padding: 1rem;">
      ${show ? scenarioTemplates[activeScenario]() : ""}
    </div>
  `;

  render(
    html`
      <div style="display: flex; flex-direction: column; min-height: 100vh;">
        ${controls} ${content}
      </div>
    `,
    document.getElementById("app")
  );
};

rerender();
