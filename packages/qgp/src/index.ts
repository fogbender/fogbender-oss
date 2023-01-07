import { defineConfig, UserConfig, mergeConfig } from "vite";
import envCompatible0 from "vite-plugin-env-compatible";
import tsconfigPaths from "vite-tsconfig-paths";

// javascript modules were a mistake
const envCompatible: typeof envCompatible0 = (envCompatible0 as any).default;

export function testFunction(name: string) {
  return `Hello ${name}`;
}

export type QgpConfig<T extends UserConfig> = {
  skipReactAppEnv?: boolean;
  skipEnvCompatible?: boolean;
  skipTsconfigPaths?: boolean;
  vite: T;
};

export function defineCommon<T extends UserConfig>(config: QgpConfig<T>): T {
  const plugins: UserConfig["plugins"] = [];
  if (!config.skipEnvCompatible) {
    plugins.push(envCompatible());
  }
  if (!config.skipTsconfigPaths) {
    plugins.push(tsconfigPaths());
  }
  const userConfig: UserConfig = { plugins };
  if (!config.skipReactAppEnv) {
    userConfig.envPrefix = "REACT_APP_";
  }
  const conf = mergeConfig(config.vite, userConfig);
  return conf as T;
}

export function defineVite<T extends UserConfig, U extends UserConfig>(
  common: T,
  config: U,
  _opts?: {}
) {
  const conf1 = mergeConfig(
    common,
    defineConfig({
      cacheDir: "node_modules/.qgp",
    })
  );
  const conf2 = mergeConfig(conf1, config);
  return conf2 as U;
}

export function defineAstro<T extends UserConfig, U extends UserConfig>(
  common: T,
  config: U,
  _opts?: {}
) {
  const conf = mergeConfig(common, config);
  return conf as U;
}
