window.process = window.process || { env: { NODE_ENV: "production" } };
window.process.env = import.meta.env || {};
import ReactDOM from "react-dom";
import { App } from "./components/ReactSPA";

ReactDOM.render(<App />, document.getElementById("root")!);
