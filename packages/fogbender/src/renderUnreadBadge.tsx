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
        class={tw`hidden min-w-1rem min-h-1rem items-center justify-center bg-brand-red-500 rounded-full text-white text-2xs font-bold leading-none`}
        style={{
          display: !unreadCounter() || unreadCounter() === 0 ? "none" : "flex",
        }}
      >
        {unreadCounter() === -1 ? (
          <span class={tw`text-xs`}>@</span>
        ) : (
          <span class={tw`px-1`}>{unreadCounter()}</span>
        )}
      </button>
    );
  }, el.shadowRoot!);
  return () => {
    x();
    el.innerHTML = "";
  };
}
