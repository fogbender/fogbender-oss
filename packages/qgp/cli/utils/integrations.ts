/*!
 * Original code by BuilderIO
 * MIT Licensed, Copyright(c) 2021 BuilderIO, see LICENSE.qwik.md for details
 *
 * Credits to the BuilderIO:
 * https://github.com/BuilderIO/qwik/blob/main/packages/qwik/src/cli/utils/integrations.ts
 */
import fs from "node:fs";
import { fileURLToPath } from "url";
import { join } from "node:path";
import { resolve } from "pathe";
import type { IntegrationData, IntegrationType } from "../types";
import { dashToTitlelCase, readPackageJson } from "./utils";

let integrations: IntegrationData[] | null = null;

const __dirname = resolve(fileURLToPath(import.meta.url), "../../src");

export async function loadIntegrations() {
  if (!integrations) {
    const loadingIntegrations: IntegrationData[] = [
      // {
      //   dir: __dirname,
      //   id: "qgp",
      //   docs: [],
      //   name: "QGP (vite based HMR)",
      //   pkgJson: await readPackageJson(join(__dirname, "..")),
      //   priority: -1,
      //   type: "feature",
      // },
      // {
      //   dir: __dirname,
      //   id: "astro",
      //   docs: [],
      //   name: "Astro (for production builds)",
      //   pkgJson: await readPackageJson(join(__dirname, "..")),
      //   priority: -2,
      //   type: "feature",
      // },
    ];

    const integrationsDir = join(__dirname, "../templates");
    const integrationsDirNames = await fs.promises.readdir(integrationsDir);

    await Promise.all(
      integrationsDirNames.map(async integrationsDirName => {
        // eslint-disable-next-line no-constant-condition
        if (true) {
          const dir = join(integrationsDir, integrationsDirName);

          const dirItems = await fs.promises.readdir(dir);
          const stat = await fs.promises.stat(dir);
          if (stat.isDirectory()) {
            const pkgJson = await readPackageJson(dir);
            const integration: IntegrationData = {
              id: integrationsDirName,
              name: pkgJson.__qgp__?.displayName ?? dashToTitlelCase(integrationsDirName),
              type: "feature",
              dir,
              pkgJson,
              docs: pkgJson.__qgp__?.docs ?? [],
              priority: pkgJson?.__qgp__?.priority ?? 0,
            };
            loadingIntegrations.push(integration);
          }
        }
      })
    );

    loadingIntegrations.sort((a, b) => {
      if (a.priority > b.priority) return -1;
      if (a.priority < b.priority) return 1;
      return a.id < b.id ? -1 : 1;
    });

    integrations = loadingIntegrations;
  }

  return integrations;
}
