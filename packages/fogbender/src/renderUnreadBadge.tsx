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
        className={tw`absolute text-white rounded-full bg-brand-red-500 text-xs`}
        style={{
          display: unreadCounter() === 0 ? "none" : "block",
          right: "-10px",
          bottom: "-5px",
          padding: "0px 5px",
        }}
      >
        {unreadCounter() === -1 ? "@" : unreadCounter()}
      </button>
    );
  }, el.shadowRoot!);
  return () => {
    x();
    el.innerHTML = "";
  };
}
