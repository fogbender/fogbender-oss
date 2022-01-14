import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { tw } from "twind";
import { Events } from "./createIframe";
import { getTwind } from "./twind";

export function renderUnreadBadge(
  { events }: { events: Events },
  openWindow: () => void,
  { el }: { el: HTMLElement }
) {
  const { attach } = getTwind();

  if (el.shadowRoot) {
    el.shadowRoot.innerHTML = "";
  } else {
    el.attachShadow({ mode: "open" });
    attach(el.shadowRoot);
  }

  const x = render(() => {
    const [unreadCounter, setUnreadCounter] = createSignal(events.unreadCount);

    events.on("fogbender.unreadCount", e => {
      setUnreadCounter(e.unreadCount);
    });

    return (
      <button
        onClick={openWindow}
        className={tw`hidden items-center justify-center py-0.5 px-1 bg-brand-red-500 rounded-full text-white text-xs font-bold leading-none`}
        style={
          !unreadCounter() || unreadCounter() === 0
            ? {
                display: "none",
              }
            : {
                display: "flex",
                minWidth: "1rem",
                minHeight: "1rem",
              }
        }
      >
        {unreadCounter() === -1 ? "@" : <span className={tw`px-0.5`}>{unreadCounter()}</span>}
      </button>
    );
  }, el.shadowRoot!);
  return () => {
    x();
    el.innerHTML = "";
  };
}
