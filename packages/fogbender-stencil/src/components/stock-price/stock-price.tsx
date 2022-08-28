import { Component, Element, Listen, Prop, State, Watch } from "@stencil/core";
import { API_KEY } from "../global/global";

@Component({
  tag: "uc-stock-price",
  styleUrl: "./stock-price.css",
  shadow: true,
})
export class StockPrice {
  stockInput: HTMLInputElement;
  // initialStockSymbol: string;
  @Element() host: HTMLElement;

  @Prop({ mutable: true, reflectToAttr: true }) stockSymbol: string;

  @Watch("stockSymbol") stockSymbolChanged(newValue: string, oldValue: string) {
    if (newValue !== oldValue) {
      this.stockUserInput = newValue;
      this.stockInputValid = true;
      this.fetchStockPrice(this.stockSymbol);
    }
  }

  @Listen("body:ucSymbolSelected") onStockSymbolSelected(evtData: CustomEvent) {
    console.log("stock symbol selected", evtData);
    if (evtData.detail && evtData.detail !== this.stockSymbol) {
      this.stockSymbol = evtData.detail;
    }
  }

  @State() Price = 0;
  @State() stockUserInput: string;
  @State() stockInputValid = false;
  @State() error: string;
  @State() loading = false;

  componentDidLoad() {
    console.log("component did load");
    // you can make state updating changes not here
    if (this.stockSymbol) {
      this.stockUserInput = this.stockSymbol;
      // this.initialStockSymbol = this.stockSymbol;
      this.stockInputValid = true;
      this.fetchStockPrice(this.stockSymbol);
    }
  }

  componentWillLoad() {
    // you can make state updating changes here
    console.log("component will load");
  }

  componentWillUpdate() {
    console.log("component will update");
  }

  componentDidUpdate() {
    console.log("component did update");
    // if (this.stockSymbol !== this.initialStockSymbol) {
    //   this.fetchStockPrice(this.stockSymbol);
    // }
  }

  componentDidUnload() {
    console.log("component did unload");
  }

  fetchStockPrice(stockSymbol: string) {
    this.loading = true;
    fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${API_KEY}`
    )
      .then((resp: Response) => {
        if (resp.status !== 200) {
          throw new Error("invalid");
        }
        return resp.json();
      })
      .then((parsedResp) => {
        this.loading = false;
        if (!Object.keys(parsedResp["Global Quote"]).length) {
          throw new Error("Invalid Symbol");
        }
        this.Price = parsedResp["Global Quote"]["05. price"];
        this.error = null;
      })
      .catch((err) => {
        this.loading = false;
        this.error = err.message;
      });
  }

  hostData() {
    return {
      class: this.error ? "error" : "",
    };
  }

  render() {
    let dataContentVariable = <p>Please enter a symbol</p>;

    if (this.error) {
      dataContentVariable = <p>{this.error}</p>;
    }

    if (this.Price) {
      dataContentVariable = <p>Price {this.Price}</p>;
    }
    if (this.loading) {
      dataContentVariable = <uc-spinner></uc-spinner>;
    }

    const onFetchStockPrice = (evt: Event) => {
      evt.preventDefault();
      this.loading = true;

      // const stockSymbol = this.stockInput.value;
      // const stockSymbol = (
      //   this.host.shadowRoot.querySelector("#stock-symbol") as HTMLInputElement
      // ).value;
      this.stockSymbol = this.stockUserInput;
      fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${this.stockUserInput}&apikey=${API_KEY}`
      )
        .then((resp: Response) => {
          this.loading = false;
          if (resp.status !== 200) {
            throw new Error("invalid");
          }
          return resp.json();
        })
        .then((parsedResp) => {
          if (!Object.keys(parsedResp["Global Quote"]).length) {
            throw new Error("Invalid Symbol");
          }
          this.Price = parsedResp["Global Quote"]["05. price"];
          this.error = null;
        })
        .catch((err) => {
          this.loading = false;
          console.log(err);

          this.error = err.message;
        });
    };

    const onInputChange = (evt: Event) => {
      this.stockUserInput = (evt.target as HTMLInputElement).value;
      if (this.stockUserInput.trim() !== "") {
        this.stockInputValid = true;
      } else {
        this.stockInputValid = false;
      }
    };

    return [
      <form onSubmit={onFetchStockPrice}>
        <input
          value={this.stockUserInput}
          onInput={onInputChange}
          // ref={(el) => (this.stockInput = el)}
          id="stock-symbol"
        />
        <button disabled={!this.stockInputValid || this.loading} type="submit">
          Fetch
        </button>
      </form>,
      <div>{dataContentVariable}</div>,
    ];
  }
}
