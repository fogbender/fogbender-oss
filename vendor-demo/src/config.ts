const config = {
  prod: {
    clientUrl: "https://client.fogbender.com",
    storefrontUrl: "https://fogbender.com",
    widgetId: "",
    widgetKey: "",
  },
  staging: {
    clientUrl: "https://master--fb-client.netlify.app",
    storefrontUrl: "https://fogbender-test.com",
    widgetId: "dzAwMjQ4ODUxMDAwMTMwMDE1MjMy",
    widgetKey: "0ac47c847422d17ad2e",
  },
  dev: {
    clientUrl: import.meta.env.PUBLIC_CLIENT_URL || "http://localhost:3300",
    storefrontUrl: "http://localhost:3100",
    widgetId: import.meta.env.PUBLIC_WIDGET_ID || "",
    widgetKey: import.meta.env.PUBLIC_WIDGET_KEY || "",
  },
};

const defaultEnvValue = import.meta.env.PUBLIC_DEFAULT_ENV;

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

export function getClientUrl(env?: Env) {
  return getConfig(env).clientUrl;
}

export function getStorefrontUrl(env?: Env) {
  return getConfig(env).storefrontUrl;
}

export function getWidgetIdAndKey(env?: Env) {
  const { widgetId, widgetKey } = getConfig(env);
  return { widgetId, widgetKey };
}
