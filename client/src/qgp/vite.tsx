import { useEffect } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./react";

function AppWithCallbackAfterRender() {
  useEffect(() => {
    console.info("rendered");
  });

  return <App />;
}

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(<AppWithCallbackAfterRender />);
