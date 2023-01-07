// @ts-check
import react from "@vitejs/plugin-react";
import { defineCommon, defineVite } from "qgp";

export const common = defineCommon({
  vite: {
    build: {
      sourcemap: true,
    },
  },
});

export default defineVite(common, {
  plugins: [react()],
});
