import path from "path";
import type { UserConfigExport, ConfigEnv } from "vite";
import { name } from "./package.json";
import dts from "vite-plugin-dts";
// https://vitejs.dev/config/
export default ({ command }: ConfigEnv): UserConfigExport => {
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
      }),
    ],
    build: {
      lib: {
        name,
        fileName: "index",
        entry: path.resolve(__dirname, "src/index.ts"),
      },
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: ["vue", "vue-demi", "fogbender"],
        // Provide global variables to use in the UMD build
        // for externalized deps
        output: {
          globals: {
            "vue": "Vue",
            "vue-demi": "VueDemi",
            fogbender: "Fogbender",
          },
        },
      },
    },
  };
};
