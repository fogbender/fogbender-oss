import { TrackJS } from "trackjs";

const config = {
  prod: {
    dashboardUrl: "https://api.fogbender.com",
    clientUrl: "https://client.fogbender.com",
    demoUrl: "https://demo1.fogbender.com",
    webhookUrl: "https://api.fogbender.com/hook",
    cognito: "prod",
  },
  staging: {
    dashboardUrl: "https://api.fogbender-test.com",
    // clientUrl: "https://staging-client--fb-client.netlify.app",
    clientUrl: "https://main--fb-client.netlify.app",
    demoUrl: "https://demo1.fogbender-test.com",
    webhookUrl: "https://api.fogbender-test.com/hook",
    cognito: "staging",
  },
  dev: {
    dashboardUrl: import.meta.env.PUBLIC_API_SERVER_URL || "http://localhost:8000",
    clientUrl: import.meta.env.PUBLIC_CLIENT_WIDGET_URL || "http://localhost:3300",
    demoUrl: import.meta.env.PUBLIC_DEMO_URL || "http://localhost:3200",
    webhookUrl:
      import.meta.env.PUBLIC_HOOK_URL ||
      (import.meta.env.PUBLIC_API_SERVER_URL
        ? `<Use ngrok to point to ${import.meta.env.PUBLIC_API_SERVER_URL}/hook>`
        : "<Use ngrok to point to http://localhost:8000/hook>"),
    cognito: "staging",
  },
};

export function detectBetaEnvironment() {
  if (import.meta.env.SSR) {
    return undefined;
  }
  if (window.location.host === "beta.fogbender.com") {
    return "prod";
  } else if (window.location.host === "beta.fogbender-test.com") {
    return "staging";
  } else {
    return undefined;
  }
}

const defaultEnvValue = detectBetaEnvironment() || import.meta.env.PUBLIC_DEFAULT_ENV;

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

export function getClientUrlWithBeta(env?: Env) {
  // we want to use staging client (i.e. the latest one) on beta
  const envWithBeta = detectBetaEnvironment() ? "staging" : env;
  return getConfig(envWithBeta).clientUrl;
}

export function getClientUrl(env?: Env) {
  return getConfig(env).clientUrl;
}

export function getServerUrl(env?: Env) {
  return getConfig(env).dashboardUrl;
}

export function googleLoginUrl(env?: Env) {
  return getConfig(env).dashboardUrl + "/auth/google";
}

export function getWebhookUrl(env?: Env) {
  return getConfig(env).webhookUrl;
}

export function getCognitoPool(env?: Env) {
  const isStaging = getConfig(env).cognito !== "prod";

  return isStaging
    ? {
        userPoolId: "us-east-1_Mkgm43eko",
        userPoolWebClientId: "4j1d420ld73hnoeu8oc186daa6",
      }
    : {
        userPoolId: "us-west-1_qZyr62u9e",
        userPoolWebClientId: "3a681nuu5reah56mn0dahl94i1",
      };
}

export function getVersion(env?: Env) {
  const { PUBLIC_SHA, PUBLIC_BRANCH, PUBLIC_VERSION } = import.meta.env;
  const version = PUBLIC_VERSION || "0.0.0";
  const sha = (PUBLIC_SHA || "00000000").substring(0, 8);
  const niceVersion = `${sha}`;
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

TrackJS.configure({
  version: getVersion().niceVersion,
});

export function getTrelloDeveloperApiKey() {
  return "7c3baec76bf5908ea9f8789eadfa56a2";
}

export function getDemoUrl(env?: Env) {
  return getConfig(env).demoUrl;
}
