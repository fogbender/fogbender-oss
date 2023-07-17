import type { Client } from "./client";

const { PUBLIC_DEFAULT_ENV: defaultEnvValue, PUBLIC_API_SERVER_URL: serverApiUrl } = process.env;

const config = {
  prod: {
    serverApiUrl: "https://api.fogbender.com/api",
  },
  staging: {
    serverApiUrl: "https://api.fogbender-test.com/api",
  },
  dev: {
    serverApiUrl: serverApiUrl ? serverApiUrl + "/api" : "http://localhost:8000/api",
  },
};

export const defaultEnv =
  defaultEnvValue === "prod" ? "prod" : defaultEnvValue === "staging" ? "staging" : "dev";

export type Env = typeof defaultEnv;

export function getConfig(env: Env = defaultEnv, client?: Client) {
  const envCfg = config[env];
  return {
    ...envCfg,
    serverApiUrl: client?.getServerApiUrl?.() || envCfg.serverApiUrl,
    /* overwrite: "some value" */
  };
}

export function getServerApiUrl(env?: Env, client?: Client) {
  return getConfig(env, client).serverApiUrl;
}

export function getServerWsUrl(env?: Env, client?: Client) {
  const serverApiUrl = getServerApiUrl(env, client);
  // we need to have "ws" support for localhost
  // nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
  const wsPath = serverApiUrl.replace("https://", "wss://").replace("http://", "ws://");
  return `${wsPath}/ws/v2`;
}

export function getVersion(env?: Env) {
  const { PUBLIC_SHA, PUBLIC_BRANCH, PUBLIC_VERSION } = process.env;
  const version = PUBLIC_VERSION || "0.0.0";
  const sha = (PUBLIC_SHA || "00000000").substring(0, 8);
  const niceVersion = `${version}-${sha}`;
  const meta: string[] = [defaultEnv];
  if (env && defaultEnv !== env) {
    meta.unshift(env);
  }
  if (PUBLIC_BRANCH) {
    meta.push(PUBLIC_BRANCH);
  }
  const debugVersion = `${version}-${sha} (${meta.join(", ")})`;
  return { version, niceVersion, debugVersion };
}
