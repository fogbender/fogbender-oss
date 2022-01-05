/* eslint-disable no-new */
import { ResizeSensor } from "css-element-queries/";
import { Badge, Token } from ".";

export function renderIframe({
  rootEl,
  url,
  token,
  headless,
  onBadges,
}: {
  rootEl: HTMLElement;
  url: string;
  token: Token;
  headless: boolean;
  onBadges?: (badges: Badge[]) => void;
}) {
  const iFrame = document.createElement("iframe");

  iFrame.src = url;
  iFrame.style.display = "block";
  iFrame.style.width = "100%";

  function emit(event: string, data: any) {
    const myEvent = new CustomEvent(event, {
      detail: data,
      bubbles: false,
      cancelable: true,
      composed: false,
    });
    rootEl?.dispatchEvent(myEvent);
  }

  window.addEventListener("message", e => {
    if (e.origin !== url) {
      return;
    }
    if (e.data?.type === "APP_IS_READY") {
      iFrame.contentWindow?.postMessage({ initToken: token, headless }, url);
      iFrame.contentWindow?.postMessage({ notificationsPermission: Notification.permission }, url);
    } else if (e.data?.type === "REQUEST_NOTIFICATIONS_PERMISSION") {
      Notification.requestPermission().then(function (permission) {
        iFrame.contentWindow?.postMessage({ notificationsPermission: permission }, url);
      });
    } else if (e.data?.type === "BADGES" && e.data?.badges !== undefined) {
      onBadges !== undefined && onBadges(JSON.parse(e.data.badges));
      emit("fogbender.badges", { badges: JSON.parse(e.data.badges) });
    } else if (
      e.data?.type === "NOTIFICATION" &&
      e.data.notification !== undefined &&
      token !== undefined
    ) {
      if (Notification.permission === "granted") {
        const { body, roomId } = JSON.parse(e.data.notification);
        const notification = new Notification(token.customerName, { body });
        notification.onclick = () => {
          window.parent.focus();
          iFrame.contentWindow?.postMessage({ roomIdToOpen: roomId }, url);
        };
      }
    }
  });

  rootEl.innerHTML = "";
  rootEl.append(iFrame);

  function adaptIFrame() {
    if (!rootEl) {
      return;
    }
    const height = headless
      ? 0
      : Math.min(window.innerHeight, window.innerHeight - rootEl.getBoundingClientRect().top);
    iFrame.style.height = height + "px";
  }

  adaptIFrame();

  new ResizeSensor(rootEl, adaptIFrame);
  new ResizeSensor(document.body, adaptIFrame);
  window.addEventListener("resize", adaptIFrame);
  return iFrame;
}
