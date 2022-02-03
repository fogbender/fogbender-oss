import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { tw } from "twind";
import { Events } from "./createIframe";
import { getTwind } from "./twind";

export function createFloatingWidget({ events }: { events: Events }, openWindow: () => void) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.bottom = "0";
  container.style.right = "0";
  container.style.zIndex = "9999";
  const button = document.createElement("button");
  button.title = "Customer support";
  button.style.display = "block";
  button.style.outline = "none";
  button.style.marginRight = "1rem";
  button.style.marginBottom = "1rem";

  button.onclick = openWindow;
  const body = document.getElementsByTagName("body")[0];
  container.attachShadow({ mode: "open" });
  container.shadowRoot?.appendChild(button);
  const { attach } = getTwind();
  attach(container.shadowRoot);
  body.appendChild(container);
  const cleanup = render(() => {
    const [unreadCounter, setUnreadCount] = createSignal(0);

    events.on("fogbender.unreadCount", e => {
      setUnreadCount(e.unreadCount);
    });

    return (
      <div
        className={tw`w-36 py-2 px-4 flex items-center justify-center gap-x-2 rounded-full bg-white transform origin-bottom-right scale-75`}
        style={{ "box-shadow": "0px 6px 20px rgba(19, 29, 118, 0.15)" }}
      >
        <div>
          <svg width="33" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.999.75 0 24.453 6.999 39.25l7.362-14.797L7 .75Z" fill="#FE346E" />
            <path
              d="m12.684 32.083 3.39 7.166 7.173-14.419L16.073.75l-3.38 11.936 3.706 11.93-3.715 7.467Z"
              fill="#FF7315"
            />
            <path
              d="m21.757 32.083 3.39 7.166L32.32 24.83 25.147.75 21.69 12.958l3.589 12.047-3.522 7.078Z"
              fill="#7E0CF5"
            />
          </svg>
        </div>
        <div className={tw`text-left text-sm font-semibold`}>Customer support</div>
        <div
          className={tw`absolute top-0 right-0 text-white rounded-full bg-brand-red-500 text-xs leading-none`}
          style={{
            display: unreadCounter() === 0 ? "none" : "block",
            padding: unreadCounter() === -1 ? "2px 3px" : "2px 5px",
          }}
        >
          {unreadCounter() === -1 ? "@" : unreadCounter()}
        </div>
      </div>
    );
  }, button);
  return () => {
    cleanup();
    body.removeChild(container);
  };
}
