import { Config } from "@stencil/core";

export const config: Config = {
  namespace: "udemy-webcomponents",
  outputTargets: [
    {
      type: "dist",
    },
    // {
    //   type: 'www',
    //   serviceWorker: null
    // }
  ],
};
