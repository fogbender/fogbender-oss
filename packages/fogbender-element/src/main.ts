import { createNewFogbender, Fogbender, Env, Snapshot } from "fogbender";

type WidgetType = "simple" | "floatie";

class FogbenderElement extends HTMLElement {
  // These are the properties of the class fogbender
  fogbender: Fogbender;

  token: string | undefined;
  env: Env | undefined;
  clientUrl: string;

  verbose: boolean;
  openInNewTab: boolean;

  widgetType: WidgetType = "simple";
  wrapper: HTMLElement;

  isClientConfigured: boolean = false;
  unsub = [] as (() => void)[];

  cleanup: () => void;

  constructor() {
    super();
    this.fogbender = this.fogbender || createNewFogbender();
    this.wrapper = document.createElement("div");
  }

  _render() {
    this._setClientUrl();
    this._setToken();
    this._setEnv();

    this.appendChild(this.wrapper);

    this._getConfigurationSnapshot(async () => {
      return this.fogbender.isClientConfigured();
    })
      .then(() => {
        if (this.isClientConfigured) {
          this._renderSelectedWidget();
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  _renderSelectedWidget() {
    switch (this.widgetType) {
      case "simple":
        this._renderSimpleWidget();
        break;
      case "floatie":
        this._renderFloatie();
        break;
      default:
        this._renderSimpleWidget();
        break;
    }
  }

  _renderSimpleWidget() {
    this.fogbender.renderIframe({ rootEl: this.wrapper }).then(cleanup => {
      this.cleanup = cleanup;
    });
  }

  _renderFloatie() {
    this.fogbender
      .createFloatingWidget({ verbose: this.verbose, openInNewTab: this.openInNewTab })
      .then(cleanup => {
        this.cleanup = cleanup;
      });
  }

  _setClientUrl() {
    if (this.hasAttribute("client-url")) {
      const clientUrl = this.getAttribute("client-url") as string | undefined;
      this.fogbender.setClientUrl(clientUrl);
    }
  }

  _setToken() {
    this.fogbender.setToken(this.token ? JSON.parse(this.token) : undefined);
  }

  _setEnv() {
    if (this.hasAttribute("env")) {
      this.fogbender.setEnv(this.getAttribute("env") as Env | undefined);
    }
  }

  async _getConfigurationSnapshot(snapshotGen: () => Promise<Snapshot<boolean>>) {
    const snapshot = await snapshotGen();

    this.isClientConfigured = snapshot.getValue();

    this.unsub.push(
      snapshot.subscribe(s => {
        this.isClientConfigured = s.getValue();
      })
    );
  }

  // This function will be automatically executed by javascript when custom element is mounted on the DOM.
  connectedCallback() {
    console.log("called connected callback");
  }

  // This function will be executed when custom element is removed from the DOM.
  disconnectedCallback() {
    this.fogbender.setClientUrl(undefined);
    this.fogbender.setToken(undefined);
    this.fogbender.setEnv(undefined);
    this.unsub.forEach(u => u());
  }

  //This function will be executed when the value of the attributes defined in observedAttributes method is changed.
  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (
      name === "token" &&
      oldValue !== newValue &&
      ((this.token && !newValue) || (!this.token && newValue))
    ) {
      this.token = newValue;
      this.unsub.forEach(u => u());
      this._updateWidget();
    } else if (name === "floatie") {
      this.widgetType = "floatie";
      this._updateWidget();
    }
  }

  _updateWidget() {
    if (this.cleanup) {
      this.cleanup();
    }
    this._render();
  }

  //This is a static method which returns array of attributes whose changes will be watched by javascript.
  static get observedAttributes() {
    return ["token", "client-url", "floatie"];
  }
}

customElements.define("fogbender-element", FogbenderElement);
