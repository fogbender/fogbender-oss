import Constants from "expo-constants";
import { Platform } from "react-native";

const envConfig = {
  prod: {
    serverUrl: "https://api.fogbender.com",
    serverApiUrl: "https://api.fogbender.com/api",
  },
  staging: {
    serverUrl: "https://api.fogbender-test.com",
    serverApiUrl: "https://api.fogbender-test.com/api",
  },
  dev: {
    serverUrl:
      Constants.manifest.extra?.serverUrl ||
      (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000"),
    serverApiUrl:
      Constants.manifest.extra?.serverApiUrl ||
      (Platform.OS === "android" ? "http://10.0.2.2:8000/api" : "http://localhost:8000/api"),
  },
};

type Env = "dev" | "staging" | "prod";

export function getEnv(): Env {
  const releaseChannel = Constants.manifest.releaseChannel;
  if (releaseChannel && releaseChannel.indexOf("prod") !== -1) {
    return "prod";
  } else if (releaseChannel && releaseChannel.indexOf("staging") !== -1) {
    return "staging";
  }
  return "dev";
}

export function getEnvConfig(env?: Env) {
  const envCfg = envConfig[env || getEnv()];
  return {
    ...envCfg,
  };
}
