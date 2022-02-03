import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { tw } from "twind";
import { Events } from "./createIframe";
import { getTwind } from "./twind";

export function createFloatingWidget(
  { events }: { events: Events },
  openWindow: () => void,
  style: { verbose?: boolean }
) {
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

    return style.verbose ? (
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
    ) : (
      <div>
        <svg width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#a)">
            <path
              d="M87.026 33.083c-7.775-9.336-11.662-14.005-15.981-16.273a24.514 24.514 0 0 0-23.33.29c-4.26 2.374-8.055 7.167-15.643 16.753-6.296 7.953-9.443 11.93-10.805 16a24.514 24.514 0 0 0 2.43 20.724c2.266 3.645 6.224 6.767 14.14 13.01 6.218 4.904 9.327 7.356 12.643 8.676a24.515 24.515 0 0 0 17.568.215c3.346-1.238 6.538-3.63 12.922-8.417 8.516-6.385 12.774-9.577 15.167-13.318a24.515 24.515 0 0 0 2.493-21.29c-1.464-4.193-4.844-8.252-11.604-16.37Z"
              fill="#fff"
            />
            <mask
              id="b"
              style="mask-type:alpha"
              maskUnits="userSpaceOnUse"
              x="20"
              y="14"
              width="81"
              height="80"
            >
              <path
                d="M87.026 33.083c-7.775-9.336-11.662-14.005-15.981-16.273a24.514 24.514 0 0 0-23.33.29c-4.26 2.374-8.055 7.167-15.643 16.753-6.296 7.953-9.443 11.93-10.805 16a24.514 24.514 0 0 0 2.43 20.724c2.266 3.645 6.224 6.767 14.14 13.01 6.218 4.904 9.327 7.356 12.643 8.676a24.515 24.515 0 0 0 17.568.215c3.346-1.238 6.538-3.63 12.922-8.417 8.516-6.385 12.774-9.577 15.167-13.318a24.515 24.515 0 0 0 2.493-21.29c-1.464-4.193-4.844-8.252-11.604-16.37Z"
                fill="#FE346E"
              />
            </mask>
            <g mask="url(#b)">
              <path d="M48.094 29 39 59.803l9.094 19.23 9.568-19.23L48.094 29Z" fill="#FE346E" />
              <path
                d="m55.481 69.72 4.404 9.312 9.323-18.738L59.885 29l-4.392 15.512 4.815 15.504-4.827 9.703Z"
                fill="#FF7315"
              />
              <path
                d="m67.273 69.72 4.405 9.312L81 60.294 71.678 29l-4.493 15.865 4.664 15.657-4.576 9.197Z"
                fill="#7E0CF5"
              />
            </g>
          </g>
          <defs>
            <filter
              id="a"
              x="0"
              y="0"
              width="120"
              height="120"
              filterUnits="userSpaceOnUse"
              color-interpolation-filters="sRGB"
            >
              <feFlood flood-opacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="6" />
              <feGaussianBlur stdDeviation="10" />
              <feColorMatrix values="0 0 0 0 0.0751563 0 0 0 0 0.113891 0 0 0 0 0.4625 0 0 0 0.15 0" />
              <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_2573_3255" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_2573_3255" result="shape" />
            </filter>
          </defs>
        </svg>
        <div
          className={tw`absolute text-white rounded-full bg-brand-red-500 text-xs leading-none`}
          style={{
            display: unreadCounter() === 0 ? "none" : "block",
            top: "20px",
            left: "78px",
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
