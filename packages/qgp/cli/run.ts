/* eslint-disable no-console */
/*!
 * Original code by BuilderIO
 * MIT Licensed, Copyright(c) 2021 BuilderIO, see LICENSE.qwik.md for details
 *
 * Credits to the BuilderIO:
 * https://github.com/BuilderIO/qwik/blob/main/packages/qwik/src/cli/run.ts
 */
import color from "kleur";
import { AppCommand } from "./utils/app-command";
import { runAddCommand } from "./add/run-add-command";
import { runCreateCommand } from "./create/run-create-command";
import { panic, pmRunCmd } from "./utils/utils";

export async function runCli() {
  try {
    const app = new AppCommand({
      rootDir: "",
      cwd: process.cwd(),
      args: process.argv.slice(2),
    });
    await runCommand(app);
  } catch (e) {
    panic(String(e));
  }
}

async function runCommand(app: AppCommand) {
  switch (app.task) {
    case "create": {
      await runCreateCommand(app);
      return;
    }
    case "add": {
      await runAddCommand(app);
      return;
    }
    case "help": {
      printHelp();
      return;
    }
    case "version": {
      printVersion();
      return;
    }
  }

  if (typeof app.task === "string") {
    console.log(color.red(`Unrecognized qwik command: ${app.task}`) + "\n");
  }

  printHelp();
  process.exit(1);
}

function printHelp() {
  const pmRun = pmRunCmd();
  console.log(``);
  console.log(color.bgMagenta(` QGP Help `));
  console.log(``);
  console.log(
    `  ${pmRun} qgp ${color.cyan(`create`)}         ${color.dim(
      `Create a new QGP app from a template`
    )}`
  );
  console.log(
    `  ${pmRun} qgp ${color.cyan(`add`)}            ${color.dim(`Add an integration to this app`)}`
  );
  console.log(``);
}

function printVersion() {
  console.log((globalThis as any).QWIK_VERSION);
}
