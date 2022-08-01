import { render } from "solid-js/web";
import { Accessor, createMemo, createSignal } from "solid-js";
import { css } from "twind/css";
import { tw } from "twind";
import { Events } from "./createIframe";
import { getTwind } from "./twind";

export function createFloatingWidget(
  { events }: { events: Events },
  openWindow: () => void,
  renderIframe: (el: HTMLElement) => () => void,
  opts: { verbose?: boolean; openInNewTab?: boolean; closeable?: boolean }
) {
  const container = document.createElement("div");
  container.attachShadow({ mode: "open" });
  const { attach } = getTwind();
  attach(container.shadowRoot);
  document.body.appendChild(container);
  const cleanup = render(
    () => (
      <Container
        events={events}
        verbose={opts.verbose}
        openWindow={opts.openInNewTab ? openWindow : undefined}
        renderIframe={renderIframe}
        closeable={opts.closeable}
      />
    ),
    container.shadowRoot!
  );
  return () => {
    cleanup();
    document.body.removeChild(container);
  };
}

type Open = "open" | "closed" | "hidden";

function Container(props: {
  events: Events;
  verbose?: boolean;
  openWindow?: () => void;
  renderIframe: (el: HTMLElement) => () => void;
  closeable?: boolean;
}) {
  const [open, setIsOpen] = createSignal("closed" as Open);
  const isOpen = createMemo(() => open() === "open");
  const close = () => {
    setIsOpen("hidden");
  };
  const [closed, setClosed] = createSignal(false);
  const showOnHover = () =>
    tw(
      css({
        "@media (hover: hover)": {
          "&": {
            opacity: 0,
            pointerEvents: "none",
            transitionProperty: "none",
          },
          "*:hover &": {
            opacity: 1,
            pointerEvents: "auto",
            transitionProperty: "opacity",
          },
        },
      })
    );
  return (
    <div
      className={tw(
        closed() ? "hidden" : "flex",
        "pointer-events-none",
        isOpen() ? "top-2 h-[98vh]" : "h-full bottom-0",
        "fixed sm:top-auto sm:bottom-0 right-0 flex-col-reverse w-full sm:h-auto sm:w-auto items-center",
        props.verbose && "sm:mr-4 mb-4"
      )}
      style="z-index: 9999;"
    >
      <button
        onClick={() => {
          if (props.openWindow) {
            props.openWindow();
          } else {
            setIsOpen(x => (x === "open" ? "hidden" : "open"));
          }
        }}
        title="Customer support"
        className={tw`active:outline-none focus:outline-none outline-none self-end overflow-hidden pointer-events-auto`}
      >
        <Floatie isOpen={isOpen} events={props.events} verbose={props.verbose} />
      </button>
      {open() !== "closed" && (
        <Talky
          isOpen={isOpen}
          close={close}
          verbose={props.verbose}
          renderIframe={props.renderIframe}
        />
      )}
      {props.closeable && !props.verbose && !isOpen() && (
        <div
          className={
            tw(
              "absolute bottom-[28px] right-[24px] top-auto w-8 h-8 flex items-center justify-center rounded-full bg-white transition duration-700"
            ) +
            " " +
            showOnHover()
          }
          style={{ "box-shadow": "0px 3px 10px rgba(19, 29, 118, 0.1)" }}
        >
          <button
            onClick={() => setClosed(true)}
            className={tw`w-4 h-4 active:outline-none focus:outline-none outline-none overflow-hidden pointer-events-auto text-black hover:text-red-500`}
          >
            <FloatingCloseButton />
          </button>
        </div>
      )}
    </div>
  );
}

function Talky(props: {
  isOpen: Accessor<boolean>;
  verbose: boolean | undefined;
  close: () => void;
  renderIframe: (el: HTMLElement) => () => void;
}) {
  return (
    <div
      className={tw(
        "pointer-events-auto",
        props.isOpen() ? "flex flex-col" : "hidden",
        props.verbose ? "sm:h-[calc(60vh+30px)]" : "-mb-[48px] sm:h-[calc(60vh+60px)] sm:mr-8",
        "z-10 shadow-md w-full h-full rounded-xl bg-white min-w-[340px] sm:min-w-[480px] max-w-[90vw] sm:max-h-screen"
      )}
    >
      <Iframe renderIframe={props.renderIframe} />
    </div>
  );
}

function Iframe(props: { renderIframe: (el: HTMLElement) => () => void }) {
  let cleanup = () => {};
  return (
    <div
      className={tw("flex-1 rounded-xl overflow-hidden")}
      ref={el => {
        if (el) {
          cleanup = props.renderIframe(el);
        } else {
          cleanup();
        }
      }}
    />
  );
}

function Floatie(props: { isOpen: Accessor<boolean>; events: Events; verbose?: boolean }) {
  const [unreadCounter, setUnreadCount] = createSignal(0);

  props.events.on("fogbender.unreadCount", e => {
    setUnreadCount(e.unreadCount);
  });

  return props.verbose ? (
    <div
      className={tw`w-36 mb-4 py-2 px-4 flex items-center justify-center gap-x-2 rounded-full bg-white transform origin-bottom-right scale-75`}
      style={{ "box-shadow": "0px 6px 20px rgba(19, 29, 118, 0.15)" }}
    >
      <div>
        <FloatingVerboseSvg />
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
    <div className={tw("relative w-32 h-32")}>
      <div className={tw("absolute inset-0")}>
        <FloatingSvg />
      </div>
      <div
        className={tw(
          "absolute inset-0 duration-300",
          props.isOpen() ? "opacity-100" : "opacity-0"
        )}
      >
        <FloatingSvgOpened />
      </div>
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
}

function FloatingVerboseSvg() {
  return (
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
  );
}

function FloatingSvg() {
  return (
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
  );
}

function FloatingSvgOpened() {
  return (
    <svg
      className={tw`text-black fill-white hover:text-white hover:fill-blue-500 transition-colors`}
      width="120"
      height="120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#a)">
        <path d="M87.026 33.083c-7.775-9.336-11.662-14.005-15.981-16.273a24.514 24.514 0 0 0-23.33.29c-4.26 2.374-8.055 7.167-15.643 16.753-6.296 7.953-9.443 11.93-10.805 16a24.514 24.514 0 0 0 2.43 20.724c2.266 3.645 6.224 6.767 14.14 13.01 6.218 4.904 9.327 7.356 12.643 8.676a24.515 24.515 0 0 0 17.568.215c3.346-1.238 6.538-3.63 12.922-8.417 8.516-6.385 12.774-9.577 15.167-13.318a24.515 24.515 0 0 0 2.493-21.29c-1.464-4.193-4.844-8.252-11.604-16.37Z" />
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
            fill="currentColor"
          />
        </mask>
        <g mask="url(#b)">
          <path
            d="m41.365 63-1.719-5.6h-.044c.062 1.139.093 1.899.093 2.28V63h-1.352v-7.139h2.06l1.69 5.46h.029l1.792-5.46h2.06V63h-1.41v-3.379c0-.16 0-.343.004-.552.007-.208.03-.761.069-1.66h-.044L42.752 63h-1.387Zm6.23-6.87c0-.485.27-.728.811-.728.54 0 .81.243.81.728 0 .231-.068.412-.205.542-.133.127-.335.19-.605.19-.54 0-.81-.244-.81-.732ZM49.148 63h-1.49v-5.459h1.49V63Zm6.607 0h-1.49v-3.188c0-.394-.07-.689-.21-.884-.14-.199-.362-.298-.669-.298-.416 0-.717.14-.903.42-.185.277-.278.737-.278 1.382V63h-1.49v-5.459h1.138l.2.698h.084a1.56 1.56 0 0 1 .683-.595c.293-.137.625-.206.996-.206.635 0 1.117.173 1.445.518.33.342.494.837.494 1.484V63Zm1.47-6.87c0-.485.27-.728.81-.728s.81.243.81.728c0 .231-.068.412-.205.542-.133.127-.335.19-.605.19-.54 0-.81-.244-.81-.732ZM58.776 63h-1.49v-5.459h1.49V63Zm6.455 0h-1.49v-3.188c0-.394-.066-.689-.2-.884-.13-.199-.336-.298-.62-.298-.38 0-.657.14-.83.42-.172.28-.258.74-.258 1.382V63h-1.49v-5.459h1.138l.2.698h.083c.147-.25.358-.446.635-.586.277-.143.594-.215.952-.215.817 0 1.37.267 1.66.801h.132c.147-.254.362-.45.645-.59.286-.14.608-.21.967-.21.618 0 1.085.159 1.401.478.319.316.478.824.478 1.523V63h-1.494v-3.188c0-.394-.066-.689-.2-.884-.13-.199-.337-.298-.62-.298-.364 0-.638.13-.82.39-.18.26-.269.674-.269 1.24V63Zm4.873-6.87c0-.485.27-.728.81-.728.541 0 .811.243.811.728 0 .231-.068.412-.205.542-.133.127-.335.19-.605.19-.54 0-.81-.244-.81-.732ZM71.658 63h-1.49v-5.459h1.49V63Zm5.366 0h-4.311v-.879l2.529-3.442h-2.378V57.54h4.072v.967l-2.46 3.354h2.548V63Zm3.345-4.502c-.316 0-.563.101-.742.303-.18.198-.282.482-.308.85h2.09c-.007-.368-.103-.652-.288-.85-.186-.202-.436-.303-.752-.303Zm.21 4.6c-.879 0-1.566-.243-2.06-.728-.496-.485-.743-1.172-.743-2.06 0-.915.228-1.622.684-2.12.459-.5 1.092-.752 1.9-.752.77 0 1.371.22 1.8.66.43.44.645 1.046.645 1.82v.724h-3.52c.016.423.142.753.376.99.234.238.563.357.986.357.329 0 .64-.034.933-.102.293-.069.599-.178.918-.327v1.152a3.42 3.42 0 0 1-.835.288 5.136 5.136 0 0 1-1.084.098Z"
            fill="currentColor"
          />
        </g>
      </g>
      <path d="m67.34 73-7 7-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
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
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_3861_7231" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow_3861_7231" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

function FloatingCloseButton() {
  return (
    <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m3.333 3.333 9.334 9.334M3.333 12.667l9.334-9.334"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
