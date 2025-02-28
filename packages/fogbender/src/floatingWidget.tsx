import { render } from "solid-js/web";
import { type Accessor, createMemo, createSignal, createEffect } from "solid-js";
import { tw } from "twind";
import { css } from "twind/css";
import { type Events } from "./createIframe";
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
        widthClasses(),
        props.verbose && "sm:mr-4 mb-4"
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
        <Floatie isOpen={isOpen} events={props.events} verbose={props.verbose} />
      </button>
      {open() !== "closed" && (
        <div class={tw("h-full w-full", talkyOpacity())}>
          <Talky
            isOpen={isOpen}
            close={close}
            verbose={props.verbose}
            renderIframe={props.renderIframe}
          />
        </div>
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
  const mrClasses = createMemo(() => {
    if (props.verbose) {
      return "sm:mr-2.5";
    } else {
      if (!window.isMobile()) {
        return "sm:mr-8";
      } else {
        return "";
      }
    }
  });
  const heightClasses = createMemo(() => {
    if (props.verbose) {
      return "sm:h-[calc(60vh+30px)] h-full sm:max-h-screen";
    } else {
      if (window.isMobile()) {
        return "h-full";
      } else {
        return "-mb-[48px] sm:h-[calc(60vh+60px)] h-full sm:max-h-screen";
      }
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

  if (props.verbose) {
    return (
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
    );
  } else {
    return (
      <div class={tw("relative w-32 h-32", props.isOpen() && window.isMobile() && "hidden")}>
        <div class={tw("absolute inset-0")}>
          <FloatingSvg />
        </div>
        <div
          class={tw("absolute inset-0 duration-300", props.isOpen() ? "opacity-100" : "opacity-0")}
        >
          <FloatingSvgOpened />
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
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_d_995_19)">
        <path
          d="M87.026 33.0832C79.2513 23.7467 75.3639 19.0785 71.0446 16.8104C63.7179 12.9631 54.9448 13.0719 47.7158 17.0997C43.4541 19.4742 39.66 24.2673 32.0718 33.8535C25.7765 41.8063 22.6289 45.7827 21.2669 49.8536C18.9499 56.7784 19.8406 64.3756 23.6964 70.5767C25.9631 74.2222 29.9208 77.3436 37.8362 83.5863C44.0551 88.491 47.1645 90.9434 50.4796 92.2626C56.108 94.5025 62.3663 94.5791 68.0479 92.4778C71.3943 91.2401 74.5862 88.8471 80.97 84.0611C89.4861 77.6765 93.7442 74.4842 96.1372 70.7427C100.191 64.4046 101.11 56.5561 98.6299 49.453C97.1658 45.2598 93.7859 41.201 87.026 33.0832Z"
          fill="white"
        />
        <mask
          id="mask0_995_19"
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
        <g mask="url(#mask0_995_19)">
          <path
            d="M66.6078 79.0674C64.5118 79.9924 62.42 80.7315 60.1652 80.9621C59.0418 81.0769 57.958 80.9201 56.8899 80.6368C56.188 80.4506 55.859 79.8348 55.9959 79.1464C56.1198 78.5235 56.7219 78.0472 57.3875 78.203C60.2691 78.8777 62.8621 77.9823 65.3812 76.7955C69.3644 74.9189 72.9107 72.4488 75.8972 69.2123C77.5701 67.3994 78.3092 65.3085 78.3583 62.891C78.4386 58.9407 78.2777 54.9983 78.0326 51.06C77.8714 48.4705 77.5702 45.8894 77.3317 43.3045C77.3208 43.1864 77.3118 43.0675 77.0632 42.9142C73.7573 45.9357 70.596 49.1288 67.7646 52.7646C69.033 53.0026 70.2022 53.2092 71.3654 53.4446C72.2639 53.6265 73.1285 53.9189 73.9235 54.3777C75.2266 55.1297 75.6093 56.2689 75.045 57.6517C74.8166 58.2113 74.4816 58.7136 74.0254 59.0971C71.7158 61.0389 69.0536 61.9657 66.0211 61.4622C63.4023 61.0274 62.127 58.8686 62.8499 56.3292C63.2441 54.9444 63.2441 54.9414 61.7381 54.9391C60.0789 54.9367 58.4196 54.938 56.7604 54.9437C56.4541 54.9448 56.1288 54.8927 55.8606 55.1498C55.8103 55.5123 56.0283 55.8198 56.1271 56.1507C56.9774 58.9997 55.4829 61.3095 52.484 61.5628C49.735 61.795 47.2577 60.9982 45.1365 59.23C44.5578 58.7476 44.143 58.1408 43.8911 57.4337C43.4594 56.2222 43.8143 55.1776 44.9156 54.4826C46.1789 53.6854 47.6266 53.4204 49.0656 53.145C49.7412 53.0157 50.4249 52.9272 51.2541 52.7967C48.4551 49.1145 45.2492 45.988 41.9216 42.8654C41.5057 43.5363 41.6009 44.1981 41.5257 44.8043C41.3253 46.4193 41.1873 48.0435 41.0779 49.6675C40.8177 53.5328 40.6761 57.4015 40.584 61.2759C40.5077 64.4866 41.3884 67.1589 43.7311 69.4603C45.9131 71.6038 48.0263 73.8147 50.6911 75.3776C52.7948 76.6115 52.5278 76.528 54.3326 75.1696C55.326 74.4219 56.2284 73.5699 57.1294 72.7158C57.5525 72.3146 57.5893 72.05 57.1389 71.6373C56.2392 70.8126 55.492 69.8523 54.8309 68.8324C54.6383 68.5353 54.4512 68.2228 54.3347 67.8923C54.0291 67.0252 54.4538 66.3289 55.3725 66.1587C55.678 66.102 55.9932 66.0731 56.3041 66.072C58.4923 66.0648 60.6806 66.0667 62.8688 66.07C63.1087 66.0704 63.351 66.0818 63.588 66.1162C64.673 66.2735 65.1464 67.1232 64.647 68.0917C64.0647 69.2208 63.1208 70.0892 62.3253 71.0643C62.1618 71.2648 61.9385 71.4244 61.8662 71.7786C62.4351 72.2608 63.1743 72.3484 63.8964 72.427C64.7911 72.5243 65.6636 72.3828 66.5172 72.0832C67.3924 71.776 68.0846 72.0691 68.3391 72.8047C68.5954 73.5455 68.2346 74.17 67.3487 74.4882C65.0285 75.3215 62.7571 75.1288 60.5797 74.0526C59.9514 73.742 59.6047 73.8593 59.1587 74.3127C57.8707 75.6221 56.4786 76.8158 54.9841 77.9023C53.6178 78.8957 52.2383 78.9919 50.7222 78.2939C49.3386 77.6568 48.0871 76.8319 46.9051 75.8945C44.4439 73.9428 42.2539 71.7327 40.2574 69.3193C38.8091 67.5684 38.2054 65.585 38.0866 63.3748C37.8973 59.8514 38.047 56.3344 38.2601 52.8226C38.5059 48.7733 38.8649 44.7304 39.3997 40.7055C39.4245 40.5187 39.4723 40.3345 39.5167 40.1507C39.7829 39.0483 40.6887 38.6778 41.6491 39.3035C42.494 39.8539 43.2215 40.5517 43.95 41.2359C47.5694 44.6348 51.0992 48.1164 54.0036 52.1522C54.2037 52.4303 54.4179 52.5346 54.7836 52.5175C57.9316 52.3697 61.0815 52.3862 64.2294 52.5112C64.6773 52.529 64.8792 52.3389 65.1008 52.0398C68.5157 47.4291 72.5542 43.3914 76.9074 39.6443C77.1049 39.4743 77.3201 39.312 77.5527 39.1959C78.3966 38.7746 79.2255 39.1261 79.4575 40.0344C79.7975 41.3657 79.8636 42.7387 80.0093 44.0976C80.3942 47.6886 80.6786 51.2902 80.8312 54.8959C80.9848 58.5249 81.2016 62.1645 80.6097 65.784C80.2913 67.7313 79.2162 69.2934 77.9556 70.7345C74.8179 74.3216 70.945 76.96 66.6078 79.0674ZM49.6719 58.7959C50.4639 58.9923 51.2589 59.1782 52.0849 59.0801C53.5866 58.9018 54.0971 58.1184 53.6045 56.7288C53.4631 56.3297 53.2632 55.9504 53.085 55.5643C52.9584 55.29 52.7421 55.2142 52.4391 55.2472C51.0101 55.4029 49.5818 55.5666 48.1892 55.9287C47.5766 56.0881 46.9294 56.2011 46.3839 56.7091C47.1367 57.8957 48.3416 58.3395 49.6719 58.7959ZM70.0825 55.7688C69.2066 55.6293 68.3351 55.4467 67.4539 55.3599C65.9435 55.2111 65.8849 55.2742 65.423 56.7265C64.9537 58.202 65.5227 59.0468 67.0978 59.087C68.9129 59.1333 70.5481 58.5679 71.9904 57.481C72.1411 57.3675 72.2687 57.2203 72.3917 57.076C72.6611 56.7599 72.5952 56.523 72.2027 56.3709C71.553 56.1191 70.8883 55.9175 70.0825 55.7688ZM58.2276 69.0166C58.5186 69.3271 58.8028 69.6442 59.1032 69.9457C59.2808 70.1239 59.5085 70.252 59.7271 70.0266C60.1299 69.6112 60.6095 69.2508 60.8956 68.5717C59.9867 68.5717 59.1602 68.5646 58.3341 68.5757C58.0511 68.5794 58.015 68.7326 58.2276 69.0166Z"
            fill="#5E5E5E"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_995_19"
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
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_995_19" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_995_19"
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
