import React from "react";
import "../index.css";
import reportWebVitals from "../reportWebVitals";
import ReactSPA from "../App";

export const App = () => {
  return (
    <React.StrictMode>
      <ReactSPA />
    </React.StrictMode>
  );
};

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
