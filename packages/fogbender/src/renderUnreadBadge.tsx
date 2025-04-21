import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { tw } from "twind";
import type { Events } from "./createIframe";
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

  const root = el.shadowRoot;
  if (!root) throw new Error("No shadow root");

  render(<UnreadButton events={events} openWindow={openWindow} />, root);

  return () => {
    render(null, root);
    el.innerHTML = "";
  };
}

function UnreadButton({ events, openWindow }: { events: Events; openWindow: () => void }) {
  const [unreadCounter, setUnreadCounter] = useState(events.unreadCount);

  useEffect(() => {
    events.on("fogbender.unreadCount", e => {
      setUnreadCounter(e.unreadCount);
    });
  }, []);

  if (!unreadCounter || unreadCounter === 0) return null;

  return (
    <button
      onClick={openWindow}
      class={tw`min-w-1rem min-h-1rem bg-brand-red-500 text-2xs hidden items-center justify-center rounded-full font-bold leading-none text-white`}
      style={{ display: "flex" }}
    >
      {unreadCounter === -1 ? (
        <span class={tw`text-xs`}>@</span>
      ) : (
        <span class={tw`px-1`}>{unreadCounter}</span>
      )}
    </button>
  );
}
