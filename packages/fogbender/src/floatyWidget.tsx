// Preact version of the SolidJS floaty widget
import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { tw } from "twind";
import { css } from "twind/css";
import FloatyCloseButton from "./floatyCloseButton";
import FloatySvgOpen from "./floatySvgOpen";
import FloatySvg from "./floatySvg";
import { getTwind } from "./twind";
import type { Events } from "./createIframe";

export function createFloatyWidget(
  state: { events: Events },
  openWindow: () => void,
  renderIframe: (el: HTMLElement) => () => void,
  opts: {
    openInNewTab?: boolean;
    closeable?: boolean;
    defaultOpen?: boolean;
  } = {}
) {
  const { events } = state;

  window.isMobile = function () {
    let check = false;
    (function (a) {
      if (/your-regex/i.test(a) || /your-other-regex/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };

  const container = document.createElement("div");
  container.attachShadow({ mode: "open" });
  const { attach } = getTwind();
  attach(container.shadowRoot);
  document.body.appendChild(container);

  const root = container.shadowRoot;
  if (!root) {
    throw new Error("shadowRoot missing");
  }

  render(
    <Container
      events={events}
      openWindow={opts.openInNewTab ? openWindow : undefined}
      renderIframe={renderIframe}
      closeable={opts.closeable}
      defaultOpen={opts.defaultOpen}
    />,
    root
  );

  return () => {
    render(null, root);
    document.body.removeChild(container);
  };
}

function Container({
  events,
  openWindow,
  renderIframe,
  closeable,
  defaultOpen,
}: {
  events: Events;
  openWindow?: () => void;
  renderIframe: (el: HTMLElement) => () => void;
  closeable?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && !openWindow ? "open" : "closed");
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (openWindow && defaultOpen) openWindow();
  }, []);

  const originalOverflow = useMemo(() => {
    const body = window?.top?.document?.body;
    if (body) {
      const style = getComputedStyle(body);
      return style?.overflow || "auto";
    }
    return "auto";
  }, []);

  useEffect(() => {
    if (window.top?.document?.body) {
      window.top.document.body.style.overflow = open === "open" ? "hidden" : originalOverflow;
    }
  }, [open]);

  useEffect(() => {
    events.on("fogbender.closeFloaty", () => setOpen("closed"));
  }, []);

  const alwaysVisibleOnTouchDevice = tw(
    css({
      "&": { opacity: 1 },
      "@media (hover: hover)": { "&": { opacity: 0 } },
    })
  );

  const heightClasses = window.isMobile()
    ? open === "open"
      ? "top-0 h-full"
      : "h-full bottom-0"
    : open === "open"
    ? "top-2 h-[98vh] sm:h-auto"
    : "h-full bottom-0 sm:h-auto";

  const widthClasses = window.isMobile() ? "w-full" : "w-full sm:w-auto";

  const talkyOpacity =
    open === "open" ? "transition-opacity duration-500 opacity-100" : "opacity-0";

  if (closed) return null;

  return (
    <div
      class={tw(
        "flex pointer-events-none fixed sm:top-auto sm:bottom-0 right-0 flex-col-reverse items-center group",
        heightClasses,
        widthClasses
      )}
      style="z-index: 9999;"
      id="fogbender-floaty"
    >
      <button
        onClick={() =>
          openWindow ? openWindow() : setOpen(o => (o === "open" ? "hidden" : "open"))
        }
        title="Customer support"
        class={tw`active:outline-none focus:outline-none outline-none self-end overflow-hidden pointer-events-auto`}
      >
        <Floaty isOpen={open === "open"} events={events} />
      </button>
      {open !== "closed" && (
        <div class={tw("h-full w-full", talkyOpacity)}>
          <Talky isOpen={open === "open"} renderIframe={renderIframe} />
        </div>
      )}
      {closeable && open !== "open" && (
        <div
          class={tw(
            "absolute top-auto w-8 h-8 flex items-center justify-center rounded-none bg-white transition duration-700 group-hover:opacity-100",
            alwaysVisibleOnTouchDevice
          )}
          style={{
            bottom: "28px",
            right: "24px",
            boxShadow: "0px 3px 10px rgba(19, 29, 118, 0.1)",
          }}
        >
          <button
            onClick={() => setClosed(true)}
            class={tw`w-4 h-4 active:outline-none focus:outline-none outline-none overflow-hidden pointer-events-auto text-black hover:text-red-500`}
          >
            <FloatyCloseButton />
          </button>
        </div>
      )}
    </div>
  );
}

function Talky({
  isOpen,
  renderIframe,
}: {
  isOpen: boolean;
  renderIframe: (el: HTMLElement) => () => void;
}) {
  const heightClasses = window.isMobile()
    ? "h-full"
    : "-mb-[48px] sm:h-[calc(60vh+60px)] h-full sm:max-h-screen";

  const widthClasses = window.isMobile()
    ? "w-full"
    : "w-full min-w-[340px] sm:min-w-[480px] max-w-[90vw]";

  const mrClasses = window.isMobile() ? "" : "sm:mr-8";

  return (
    <div
      class={tw(
        "pointer-events-auto",
        isOpen ? "flex flex-col" : "hidden",
        heightClasses,
        mrClasses,
        widthClasses,
        "z-10 shadow-md rounded-none"
      )}
    >
      <Iframe renderIframe={renderIframe} />
    </div>
  );
}

function Iframe({ renderIframe }: { renderIframe: (el: HTMLElement) => () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  let cleanup: (() => void) | undefined;

  useEffect(() => {
    if (ref.current) cleanup = renderIframe(ref.current);
    return () => cleanup?.();
  }, []);

  return <div ref={ref} class={tw("flex-1 rounded-none overflow-hidden bg-[#161616]")} />;
}

function Floaty({ isOpen, events }: { isOpen: boolean; events: Events }) {
  const [unreadCounter, setUnreadCount] = useState(events.unreadCount ?? 0);

  useEffect(() => {
    events.on("fogbender.unreadCount", e => setUnreadCount(e.unreadCount));
  }, []);

  return (
    <div class={tw("relative w-32 h-32", isOpen && window.isMobile() && "hidden")}>
      <div class={tw("absolute inset-0")}>
        <FloatySvg />
      </div>
      <div class={tw("absolute inset-0 duration-300", isOpen ? "opacity-100" : "opacity-0")}>
        <FloatySvgOpen />
      </div>
      <div
        class={tw`absolute text-white rounded-lg bg-brand-red-500 text-xs leading-none`}
        style={{
          display: unreadCounter === 0 ? "none" : "block",
          top: "20px",
          left: "78px",
          padding: unreadCounter === -1 ? "2px 3px" : "2px 5px",
        }}
      >
        {unreadCounter === -1 ? "@" : unreadCounter}
      </div>
    </div>
  );
}
