// please move the content of your src/index.js here
import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";

import { App } from "./react";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
