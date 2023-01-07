/*!
 * Original code by BuilderIO
 * MIT Licensed, Copyright(c) 2021 BuilderIO, see LICENSE.qwik.md for details
 *
 * Credits to the BuilderIO:
 * https://github.com/BuilderIO/qwik/blob/main/packages/qwik/src/cli/add/update-vite-config.ts
 */
import fs from "fs";
import { join } from "path";
import type { Options } from "prettier";
import { updateViteConfig } from "../code-mod/code-mod";
import type { FsUpdates, IntegrationData } from "../types";
import { panic } from "../utils/utils";

export async function updateViteConfigs(
  fileUpdates: FsUpdates,
  integration: IntegrationData,
  rootDir: string
) {
  try {
    const viteConfig = integration.pkgJson.__qgp__?.viteConfig;
    if (viteConfig) {
      const viteConfigPath = join(rootDir, "vite.config.ts");
      const destContent = await fs.promises.readFile(viteConfigPath, "utf-8");

      const ts = (await import("typescript")).default;
      let updatedContent = updateViteConfig(ts, destContent, viteConfig);

      if (updatedContent) {
        try {
          const prettier = (await import("prettier")).default;

          let prettierOpts: Options = {
            filepath: viteConfigPath,
          };

          const opts = await prettier.resolveConfig(viteConfigPath);
          if (opts) {
            prettierOpts = { ...opts, ...prettierOpts };
          }

          updatedContent = prettier.format(updatedContent, prettierOpts);

          updatedContent = updatedContent.replace(`export default`, `\nexport default`);
        } catch (e) {
          console.error(e);
        }

        fileUpdates.files.push({
          path: viteConfigPath,
          content: updatedContent,
          type: "modify",
        });
      }
    }
  } catch (e) {
    panic(String(e));
  }
}
