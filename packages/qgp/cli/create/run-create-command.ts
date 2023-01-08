/* eslint-disable no-console */
/*!
 * Original code by BuilderIO
 * MIT Licensed, Copyright(c) 2021 BuilderIO, see LICENSE.qwik.md for details
 *
 * Credits to the BuilderIO:
 * https://github.com/BuilderIO/qwik/blob/main/packages/qwik/src/cli/add/run-add-command.ts
 */
import color from "kleur";
import type { AppCommand } from "../utils/app-command";
import { runCreateInteractive } from "./run-create-interactive";
import { printAddHelp } from "./print-create-help";

export async function runCreateCommand(app: AppCommand) {
  try {
    const id = app.args[1];
    if (id === "help") {
      await printAddHelp();
    } else {
      await runCreateInteractive(app, id);
    }
  } catch (e) {
    console.error(`\n❌ ${color.red(String(e))}\n`);
    await printAddHelp();
    process.exit(1);
  }
}
