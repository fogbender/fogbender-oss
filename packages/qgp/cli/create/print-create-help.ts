/*!
 * Original code by BuilderIO
 * MIT Licensed, Copyright(c) 2021 BuilderIO, see LICENSE.qwik.md for details
 *
 * Credits to the BuilderIO:
 * https://github.com/BuilderIO/qwik/blob/main/packages/qwik/src/cli/add/print-add-help.ts
 */
import color from "kleur";
import { loadIntegrations } from "../utils/integrations";
import { pmRunCmd } from "../utils/utils";

export async function printAddHelp() {
  const integrations = await loadIntegrations();
  const app = integrations.filter(i => i.type === "app");
  const pmRun = pmRunCmd();

  console.log(``);
  console.log(`${pmRun} qwik ${color.magenta(`create`)} [template]`);
  console.log(``);

  console.log(`  ${color.cyan("Starter templates")}`);
  for (const s of app) {
    console.log(`    ${s.id}  ${color.dim(s.pkgJson.description)}`);
  }
  console.log(``);
}
