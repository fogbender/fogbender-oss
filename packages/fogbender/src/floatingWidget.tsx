import { render } from "solid-js/web";
import { Accessor, createMemo, createSignal } from "solid-js";
import { tw } from "twind";
import { css } from "twind/css";
import { Events } from "./createIframe";
import { getTwind } from "./twind";

export function createFloatingWidget(
  { events }: { events: Events },
  openWindow: () => void,
  renderIframe: (el: HTMLElement) => () => void,
  opts: {
    verbose?: boolean;
    openInNewTab?: boolean;
    closeable?: boolean;
    defaultOpen?: boolean;
  } = {}
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
        defaultOpen={opts.defaultOpen}
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
  defaultOpen?: boolean;
}) {
  const [open, setIsOpen] = createSignal<Open>(
    (props.defaultOpen && !props.openWindow && "open") || "closed"
  );
  if (props.openWindow && props.defaultOpen) {
    props.openWindow();
  }
  const isOpen = createMemo(() => open() === "open");
  const close = () => {
    setIsOpen("hidden");
  };
  const [closed, setClosed] = createSignal(false);
  const alwaysVisibleOnTouchDevice = () =>
    tw(
      css({
        "&": {
          opacity: 1,
        },
        "@media (hover: hover)": {
          "&": {
            opacity: 0,
          },
        },
      })
    );
  return (
    <div
      class={tw(
        closed() ? "hidden" : "flex",
        "pointer-events-none",
        isOpen() ? "top-2 h-[98vh]" : "h-full bottom-0",
        "fixed sm:top-auto sm:bottom-0 right-0 flex-col-reverse w-full sm:h-auto sm:w-auto items-center group",
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
        class={tw`active:outline-none focus:outline-none outline-none self-end overflow-hidden pointer-events-auto`}
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
      {props.closeable && !isOpen() && (
        <div
          class={tw(
            props.closeable && !props.verbose
              ? "bottom-[28px] right-[24px]"
              : "bottom-2 right-4 sm:right-0",
            "absolute top-auto w-8 h-8 flex items-center justify-center rounded-none bg-white transition duration-700 group-hover:opacity-100",
            alwaysVisibleOnTouchDevice()
          )}
          style={{ "box-shadow": "0px 3px 10px rgba(19, 29, 118, 0.1)" }}
        >
          <button
            onClick={() => setClosed(true)}
            class={tw`w-4 h-4 active:outline-none focus:outline-none outline-none overflow-hidden pointer-events-auto text-black hover:text-red-500`}
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
      class={tw(
        "pointer-events-auto",
        props.isOpen() ? "flex flex-col" : "hidden",
        props.verbose
          ? "sm:h-[calc(60vh+30px)] sm:mr-2.5"
          : "-mb-[48px] sm:h-[calc(60vh+60px)] sm:mr-8",
        "z-10 shadow-md w-full h-full rounded-none bg-white min-w-[340px] sm:min-w-[480px] max-w-[90vw] sm:max-h-screen"
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
      class={tw("flex-1 rounded-none overflow-hidden")}
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
  const [unreadCounter, setUnreadCount] = createSignal(
    props.events.unreadCount === undefined ? 0 : props.events.unreadCount
  );

  props.events.on("fogbender.unreadCount", e => {
    setUnreadCount(e.unreadCount);
  });

  return props.verbose ? (
    <div
      class={tw`w-36 mb-4 mr-7 sm:mr-2.5 py-2 px-4 flex items-center justify-center gap-x-2 rounded-none bg-white transform origin-bottom-right scale-75`}
      style={{ "box-shadow": "0px 6px 20px rgba(19, 29, 118, 0.15)" }}
    >
      <div>
        <FloatingVerboseSvg />
      </div>
      <div class={tw`text-left text-sm font-semibold`}>Customer support</div>
      <div
        class={tw`absolute top-0 right-0 text-white rounded-none bg-brand-red-500 text-xs leading-none`}
        style={{
          display: unreadCounter() === 0 ? "none" : "block",
          padding: unreadCounter() === -1 ? "2px 3px" : "2px 5px",
        }}
      >
        {unreadCounter() === -1 ? "@" : unreadCounter()}
      </div>
    </div>
  ) : (
    <div class={tw("relative w-32 h-32")}>
      <div class={tw("absolute inset-0")}>
        <FloatingSvg />
      </div>
      <div
        class={tw("absolute inset-0 duration-300", props.isOpen() ? "opacity-100" : "opacity-0")}
      >
        <FloatingSvgOpened />
      </div>
      <div
        class={tw`absolute text-white rounded-none bg-brand-red-500 text-xs leading-none`}
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
      <g filter="url(#filter0_d_537_156)">
        <path
          d="M87.026 33.0832C79.2513 23.7467 75.3639 19.0785 71.0446 16.8104C63.7179 12.9631 54.9448 13.0719 47.7158 17.0997C43.4541 19.4742 39.66 24.2673 32.0718 33.8535C25.7765 41.8063 22.6289 45.7827 21.2669 49.8536C18.9499 56.7784 19.8406 64.3756 23.6964 70.5767C25.9631 74.2222 29.9208 77.3436 37.8362 83.5863C44.0551 88.491 47.1645 90.9434 50.4796 92.2626C56.108 94.5025 62.3663 94.5791 68.0479 92.4778C71.3943 91.2401 74.5862 88.8471 80.97 84.0611C89.4861 77.6765 93.7442 74.4842 96.1372 70.7427C100.191 64.4046 101.11 56.5561 98.6299 49.453C97.1658 45.2598 93.7859 41.201 87.026 33.0832Z"
          fill="white"
        />
        <mask
          id="mask0_537_156"
          style="mask-type:alpha"
          maskUnits="userSpaceOnUse"
          x="20"
          y="14"
          width="80"
          height="80"
        >
          <path
            d="M87.026 33.0832C79.2513 23.7467 75.3639 19.0785 71.0446 16.8104C63.7179 12.9631 54.9448 13.0719 47.7158 17.0997C43.4541 19.4742 39.66 24.2673 32.0718 33.8535C25.7765 41.8063 22.6289 45.7827 21.2669 49.8536C18.9499 56.7784 19.8406 64.3756 23.6964 70.5767C25.9631 74.2222 29.9208 77.3436 37.8362 83.5863C44.0551 88.491 47.1645 90.9434 50.4796 92.2626C56.108 94.5025 62.3663 94.5791 68.0479 92.4778C71.3943 91.2401 74.5862 88.8471 80.97 84.0611C89.4861 77.6765 93.7442 74.4842 96.1372 70.7427C100.191 64.4046 101.11 56.5561 98.6299 49.453C97.1658 45.2598 93.7859 41.201 87.026 33.0832Z"
            fill="#FE346E"
          />
        </mask>
        <g mask="url(#mask0_537_156)">
          <path
            d="M48.0945 29L39 59.8032L48.0945 79.0337L57.6618 59.8032L48.0945 29Z"
            fill="#A6A6A6"
          />
          <path
            d="M55.481 69.7192L59.8851 79.032L69.2074 60.2939L59.8851 29L55.4927 44.5117L60.3083 60.0162L55.481 69.7192Z"
            fill="#D8D5D5"
          />
          <path
            d="M67.2734 69.7192L71.6775 79.032L80.9998 60.2939L71.6775 29L67.1851 44.8648L71.8492 60.5217L67.2734 69.7192Z"
            fill="#848484"
          />
        </g>
      </g>
      <path
        d="M46.69 65.3V64.55C46.69 63.8433 46.79 63.2567 46.99 62.79C47.19 62.3233 47.4433 61.9333 47.75 61.62C48.0567 61.3 48.3633 61.0133 48.67 60.76C49.0167 60.4733 49.3167 60.1833 49.57 59.89C49.8233 59.59 49.95 59.2133 49.95 58.76C49.95 58.3 49.7933 57.9167 49.48 57.61C49.1667 57.3033 48.7133 57.15 48.12 57.15C47.42 57.15 46.8867 57.36 46.52 57.78C46.16 58.1933 45.98 58.7667 45.98 59.5H43.5C43.5 58.5 43.6933 57.6467 44.08 56.94C44.4667 56.2267 45.0067 55.6867 45.7 55.32C46.3933 54.9467 47.2 54.76 48.12 54.76C49.0533 54.76 49.84 54.9367 50.48 55.29C51.1267 55.6433 51.6133 56.1233 51.94 56.73C52.2733 57.3367 52.44 58.0167 52.44 58.77C52.44 59.3567 52.35 59.85 52.17 60.25C51.9967 60.65 51.7733 60.9933 51.5 61.28C51.2267 61.5667 50.9467 61.8333 50.66 62.08C50.4067 62.3 50.1667 62.5233 49.94 62.75C49.7133 62.9767 49.53 63.2367 49.39 63.53C49.25 63.8233 49.18 64.17 49.18 64.57V65.3H46.69ZM47.95 69.25C47.4833 69.25 47.09 69.0967 46.77 68.79C46.4567 68.4767 46.3 68.0933 46.3 67.64C46.3 67.1933 46.4567 66.81 46.77 66.49C47.09 66.1633 47.4833 66 47.95 66C48.4167 66 48.81 66.1633 49.13 66.49C49.45 66.81 49.61 67.1933 49.61 67.64C49.61 68.0933 49.45 68.4767 49.13 68.79C48.81 69.0967 48.4167 69.25 47.95 69.25Z"
        fill="white"
      />
      <defs>
        <filter
          id="filter0_d_537_156"
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
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="6" />
          <feGaussianBlur stdDeviation="10" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0751563 0 0 0 0 0.113891 0 0 0 0 0.4625 0 0 0 0.15 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_537_156" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_537_156"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}

function FloatingSvgOpened() {
  return (
    <svg
      class={tw`text-black fill-white hover:text-white hover:fill-blue-500 transition-colors`}
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
