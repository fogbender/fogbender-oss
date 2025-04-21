import { render } from "solid-js/web";
import { type Accessor, createMemo, createSignal, createEffect } from "solid-js";
import { tw } from "twind";
import { css } from "twind/css";
import type { Events } from "./createIframe";
import { getTwind } from "./twind";
import FloatyCloseButton from "./floatyCloseButton";
import FloatySvgOpen from "./floatySvgOpen";
import FloatySvg from "./floatySvg";

export function createFloatingWidget(
  { events }: { events: Events },
  openWindow: () => void,
  renderIframe: (el: HTMLElement) => () => void,
  opts: {
    openInNewTab?: boolean;
    closeable?: boolean;
    defaultOpen?: boolean;
  } = {}
) {
  // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
  window.isMobile = function () {
    let check = false;
    (function (a) {
      if (
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
          a
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
          a.substr(0, 4)
        )
      )
        check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };

  const container = document.createElement("div");
  container.attachShadow({ mode: "open" });
  const { attach } = getTwind();
  attach(container.shadowRoot);
  document.body.appendChild(container);
  const cleanup = render(
    () => (
      <Container
        events={events}
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

  const originalOverflow = createMemo(() => {
    const body = window?.top?.document?.body;

    if (body) {
      const style = getComputedStyle(body);

      if (style) {
        return style["overflow"];
      }
    }

    return undefined;
  });

  createEffect(() => {
    const onOpenChange = (_open: string) => {
      if (window.isMobile()) {
        if (open() === "open") {
          if (window.top) {
            window.top.document.body.style.overflow = "hidden";
          }
        } else if (window.top) {
          window.top.document.body.style.overflow = originalOverflow() ?? "auto";
        }
      }
    };
    onOpenChange(open());
  });
  props.events.on("fogbender.closeFloaty", () => {
    setIsOpen("closed");
  });
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

  const heightClasses = createMemo(() => {
    if (isOpen()) {
      if (window.isMobile()) {
        return "top-0 h-full";
      } else {
        return "top-2 h-[98vh] sm:h-auto";
      }
    } else {
      return "h-full bottom-0 sm:h-auto";
    }
  });

  const widthClasses = createMemo(() => {
    if (window.isMobile()) {
      return "w-full";
    } else {
      return "w-full sm:w-auto";
    }
  });

  const talkyOpacity = createMemo(() => {
    if (isOpen()) {
      return "transition-opacity duration-500 opacity-100";
    } else {
      return "opacity-0";
    }
  });

  return (
    <div
      class={tw(
        closed() ? "hidden" : "flex",
        "pointer-events-none",
        heightClasses(),
        "fixed sm:top-auto sm:bottom-0 right-0 flex-col-reverse items-center group",
        widthClasses()
      )}
      style="z-index: 9999;"
      id="fogbender-floaty"
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
        <Floaty isOpen={isOpen} events={props.events} />
      </button>
      {open() !== "closed" && (
        <div class={tw("h-full w-full", talkyOpacity())}>
          <Talky isOpen={isOpen} close={close} renderIframe={props.renderIframe} />
        </div>
      )}
      {props.closeable && !isOpen() && (
        <div
          class={tw(
            props.closeable ? "bottom-[28px] right-[24px]" : "bottom-2 right-4 sm:right-0",
            "absolute top-auto w-8 h-8 flex items-center justify-center rounded-none bg-white transition duration-700 group-hover:opacity-100",
            alwaysVisibleOnTouchDevice()
          )}
          style={{ "box-shadow": "0px 3px 10px rgba(19, 29, 118, 0.1)" }}
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

function Talky(props: {
  isOpen: Accessor<boolean>;
  close: () => void;
  renderIframe: (el: HTMLElement) => () => void;
}) {
  const mrClasses = createMemo(() => {
    if (!window.isMobile()) {
      return "sm:mr-8";
    } else {
      return "";
    }
  });
  const heightClasses = createMemo(() => {
    if (window.isMobile()) {
      return "h-full";
    } else {
      return "-mb-[48px] sm:h-[calc(60vh+60px)] h-full sm:max-h-screen";
    }
  });
  const widthClasses = createMemo(() => {
    if (window.isMobile()) {
      return "w-full";
    } else {
      return "w-full min-w-[340px] sm:min-w-[480px] max-w-[90vw]";
    }
  });

  return (
    <div
      class={tw(
        "pointer-events-auto",
        props.isOpen() ? "flex flex-col" : "hidden",
        heightClasses(),
        mrClasses(),
        widthClasses(),
        "z-10 shadow-md rounded-none"
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
      class={tw("flex-1 rounded-none overflow-hidden bg-[#161616]")}
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

function Floaty(props: { isOpen: Accessor<boolean>; events: Events }) {
  const [unreadCounter, setUnreadCount] = createSignal(
    props.events.unreadCount === undefined ? 0 : props.events.unreadCount
  );

  props.events.on("fogbender.unreadCount", e => {
    setUnreadCount(e.unreadCount);
  });

  return (
    <div class={tw("relative w-32 h-32", props.isOpen() && window.isMobile() && "hidden")}>
      <div class={tw("absolute inset-0")}>
        <FloatySvg />
      </div>
      <div
        class={tw("absolute inset-0 duration-300", props.isOpen() ? "opacity-100" : "opacity-0")}
      >
        <FloatySvgOpen />
      </div>
      <div
        class={tw`absolute text-white rounded-lg bg-brand-red-500 text-xs leading-none`}
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


