import { createNewFogbender, Fogbender } from "fogbender";

class FogbenderWebComponent extends HTMLElement {
  fogbender: Fogbender;
  wrapper: HTMLElement;
  token: string | undefined;
  cleanup: () => void;
  constructor() {
    super();
    this.fogbender = createNewFogbender();
    this.wrapper = document.createElement("div");
  }

  connectedCallback() {}

  _setClientUrl() {
    if (this.hasAttribute("client-url")) {
      const clientUrl = this.getAttribute("client-url") as string | undefined;
      this.fogbender.setClientUrl(clientUrl);
    }
  }

  _setToken() {
    let token;

    if (this.token) {
      token = JSON.parse(this.token);
    }

    this.fogbender.setToken(token);
  }

  _render() {
    this._setClientUrl();

    this._setToken();

    this.appendChild(this.wrapper);

    this.fogbender.renderIframe({ rootEl: this.wrapper }).then(cleanup => {
      this.cleanup = cleanup;
    });
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (
      name === "token" &&
      oldValue !== newValue &&
      ((this.token && !newValue) || (!this.token && newValue))
    ) {
      this.token = newValue;

      if (this.cleanup) {
        this.cleanup();
      }
      this._render();
    }
  }

  static get observedAttributes() {
    return ["token", "client-url"];
  }
}

customElements.define("fogbender-element", FogbenderWebComponent);
