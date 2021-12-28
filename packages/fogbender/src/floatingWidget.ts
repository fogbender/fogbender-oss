import { Badge, Token } from ".";

function on<T>(element: HTMLElement, event: string, callback: (data: CustomEvent<T>) => void) {
  element.addEventListener(event, ((e: CustomEvent<T>) => {
    callback(e);
  }) as any);
}

export function createFloatingWidget(rootEl: HTMLElement, url: string, token: Token) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.width = "60px";
  container.style.height = "60px";
  container.style.bottom = "0";
  container.style.right = "0";
  container.style.backgroundColor = "white";
  container.style.zIndex = "9999";
  container.style.margin = "0 20px 20px 0";
  container.style.boxShadow = "0 2px 10px 1px #b5b5b5";
  container.style.borderRadius = "60px";
  const button = document.createElement("button");
  button.style.display = "flex";
  button.style.flexDirection = "column";
  button.style.width = "60px";
  button.style.height = "60px";
  container.style.borderRadius = "60px";
  button.style.justifyContent = "center";
  button.style.alignItems = "center";
  button.innerHTML = `
    <svg width="45" height="45" viewBox="0 0 83 99" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.8439 0L0 60.4379L17.8439 98.1693L36.6156 60.4379L17.8439 0Z" fill="#FE346E"/>
  <path d="M32.3394 79.8936L40.9807 98.1659L59.2716 61.4007L40.9807 0L32.3623 30.4349L41.8109 60.8557L32.3394 79.8936Z" fill="#FF7315"/>
  <path d="M55.474 79.8937L64.1153 98.1659L82.4062 61.4007L64.1153 0L55.3008 31.1277L64.4521 61.8477L55.474 79.8937Z" fill="#7E0CF5"/>
  </svg>`;
  let chatWindow: null | Window = null;
  button.onclick = () => {
    if (!chatWindow || chatWindow.closed) {
      chatWindow = window.open(
        url + "?token=" + encodeURIComponent(JSON.stringify(token)),
        "_blank"
      );
    }
    chatWindow?.focus();
  };
  const style = document.createElement("style");
  style.innerHTML = `
    @-webkit-keyframes "fogbender-blink" {
      from, to {
        background-color: #fff;
      }
      50% {
        background-color: #ff000030;
      }
    }
    .has-badges {
      animation: 1s fogbender-blink ease infinite;
    }`;
  const body = document.getElementsByTagName("body")[0];
  container.appendChild(button);
  container.appendChild(style);
  body.appendChild(container);

  on<{ badges: { [roomId: string]: Badge } }>(rootEl, "fogbender.badges", e => {
    const unreadCount = Object.values(e.detail.badges).reduce((acc, b) => acc + b.count, 0);
    container.classList.toggle("has-badges", unreadCount > 0);
    // container.style.backgroundColor = unreadCount > 0 ? "rgba(255, 0, 0, 0.5)" : "white";
  });
}
