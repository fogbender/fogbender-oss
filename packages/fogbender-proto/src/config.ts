const config = {
  prod: {
    serverApiUrl: "https://api.fogbender.com/api",
  },
  staging: {
    serverApiUrl: "https://api.fogbender-test.com/api",
  },
  dev: {
    serverApiUrl: process.env.REACT_APP_SERVER_API_URL || "http://localhost:8000/api",
  },
};

const defaultEnvValue = process.env.REACT_APP_DEFAULT_ENV;

export const defaultEnv =
  defaultEnvValue === "prod" ? "prod" : defaultEnvValue === "staging" ? "staging" : "dev";

export type Env = typeof defaultEnv;

export function getConfig(env: Env = defaultEnv) {
  const envCfg = config[env];
  return {
    ...envCfg,
    /* overwrite: "some value" */
  };
}

export function getServerApiUrl(env?: Env) {
  return getConfig(env).serverApiUrl;
}

export function getServerWsUrl(env?: Env) {
  const { serverApiUrl } = getConfig(env);
  const wsPath = serverApiUrl.replace("https://", "wss://").replace("http://", "ws://");
  return `${wsPath}/ws/v2`;
}

export function getVersion(env?: Env) {
  const { REACT_APP_SHA, REACT_APP_BRANCH, REACT_APP_VERSION } = process.env;
  const version = REACT_APP_VERSION || "0.0.0";
  const sha = (REACT_APP_SHA || "000000").substring(0, 6);
  const niceVersion = `${version}-${sha}`;
  const meta: string[] = [defaultEnv];
  if (env && defaultEnv !== env) {
    meta.unshift(env);
  }
  if (REACT_APP_BRANCH) {
    meta.push(REACT_APP_BRANCH);
  }
  const debugVersion = `${version}-${sha} (${meta.join(", ")})`;
  return { version, niceVersion, debugVersion };
}
