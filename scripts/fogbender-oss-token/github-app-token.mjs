#!/usr/bin/env node

const command = process.argv[2];

if (command === "help") {
  console.log("Usage: ./scripts/fogbender-oss-token/github-app-token.mjs");
  process.exit(0);
} else if (command === "get-token") {
  const { getToken } = await import("github-app-installation-token");
  console.log("Fetching token...");
  const res = await getToken({
    appId: process.env.APP_ID_unencrypted,
    installationId: process.env.INSTALLATION_ID_unencrypted,
    // this is pretty sad, but I have no idea why sops adds quotes to values stores in env vars
    privateKey: JSON.parse(process.env.PRIVATE_KEY),
  });
  console.log("Done!");
  console.log();
  console.log("Go to https://github.com/fogbender/fogbender-oss/settings/secrets/actions");
  console.log("And set FOG_OSS_GITHUB_TOKEN to", res.token);
  process.exit(0);
} else {
  // check if github-app-installation-token npm is installed
  try {
    await import("github-app-installation-token");
  } catch (e) {
    console.log(
      "Oops, it looks like dependencies are not installed yet. Let me fix that for you..."
    );
    const child_process = await import("child_process");
    child_process.execSync("cd ./scripts/fogbender-oss-token; yarn", { stdio: [0, 1, 2] });
    console.log("");
    console.log("");
    console.log("Done! Please run the script again.");
    process.exit(128);
  }
  const { $ } = await import("zx");
  // check if we are inside nix shell (that has sops installed)
  if (command === "sops" || process.env.IN_NIX_SHELL) {
    // call sops to decrypt the secrets
    await $`sops exec-env nix/secrets/admin/github.env './scripts/fogbender-oss-token/github-app-token.mjs get-token'`;
  } else {
    // wrap the script in nix shell to get access to sops cli
    await $`nix develop --command ./scripts/fogbender-oss-token/github-app-token.mjs sops`;
  }
  process.exit(0);
}
