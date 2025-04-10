import "fogbender-element";
import { html, render } from "lit-html";

const app = document.getElementById("app");

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

const clientUrl = "https://main--fb-client.netlify.app";

let widget = "simple-roomy";
let show = true;
let mode = "light";

const rerender = () => {
  render(template(), app);
};

const button = (label, onclick, selected = false) => html`
  <button
    style="
      cursor: pointer;
      padding: 0.5rem 1rem;
      margin: 0.25rem 0;
      border: none;
      border-radius: 4px;
      font-weight: 500;
      background: ${selected ? "#0284c7" : "#fff"};
      color: ${selected ? "#fff" : "#374151"};
    "
    @click=${onclick}
  >
    ${label}
  </button>
`;

const template = () => html`
  <div style="display: flex; min-height: 100vh">
    <div
      style="padding: 2rem 1rem; background: #d1d5db; display: flex; flex-direction: column; gap: 0.5rem;"
    >
      ${button(
        "FogbenderSimpleRoomyWidget",
        () => {
          widget = "simple-roomy";
          rerender();
        },
        widget === "simple-roomy"
      )}
      ${button(
        "FogbenderRoomyWidget",
        () => {
          widget = "roomy";
          rerender();
        },
        widget === "roomy"
      )}
      ${button(
        "FogbenderRoomyWidget\nwith room creation ON",
        () => {
          widget = "roomy-with-room-creation";
          rerender();
        },
        widget === "roomy-with-room-creation"
      )}
    </div>

    <div style="flex: 1; display: flex; flex-direction: column">
      <div
        style="display: flex; justify-content: center; gap: 1rem; background: #d1d5db; padding: 0.5rem"
      >
        ${button(show ? "Unmount" : "Remount", () => {
          show = !show;
          rerender();
        })}
        ${["roomy", "roomy-with-room-creation"].includes(widget)
          ? button(mode === "dark" ? "Switch to light mode" : "Switch to dark mode", () => {
              mode = mode === "dark" ? "light" : "dark";
              rerender();
            })
          : null}
      </div>

      <div style="flex: 1; display: flex;">
        ${show
          ? widget === "simple-roomy"
            ? html`<fogbender-simple-roomy-widget
                client-url=${clientUrl}
                .token=${token}
              ></fogbender-simple-roomy-widget>`
            : html`
                <fogbender-provider>
                  <fogbender-config
                    client-url=${clientUrl}
                    mode=${mode}
                    .token=${token}
                    ?room-creation-enabled=${widget === "roomy-with-room-creation"}
                  ></fogbender-config>
                  <fogbender-is-configured style="display: flex; flex: 1;">
                    <fogbender-roomy-widget></fogbender-roomy-widget>
                  </fogbender-is-configured>
                </fogbender-provider>
              `
          : null}
      </div>
    </div>
  </div>
`;

rerender();
