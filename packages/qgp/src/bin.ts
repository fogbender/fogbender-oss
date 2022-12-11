#!/usr/bin/env node

import { runCli } from "../cli/index";

runCli();

// // import { fileURLToPath } from "url";
// import { createServer } from "vite";
// // import { resolve } from "pathe";

// // const clientDist = resolve(fileURLToPath(import.meta.url), "../../src");
// // const __dirname = process.cwd();
// // const __dirname = "/Users/jlarky/x/e/f/fogbender/dev-storefront";
// // console.log("cwd", __dirname, clientDist, resolve(clientDist, "index.html"));

// (async () => {
//   const server = await createServer({
//     // any valid user config options, plus `mode` and `configFile`
//     cacheDir: "node_modules/.qgp",
//     configFile: "qgp.config.ts",
//     // build: {
//     //   rollupOptions: {
//     //     input: { index: resolve(clientDist, "index.html") },
//     //   },
//     // },
//     // root: clientDist,
//   });
//   await server.listen();

//   server.printUrls();
// })();
