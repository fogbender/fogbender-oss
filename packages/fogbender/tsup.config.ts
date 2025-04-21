import { defineConfig } from "tsup";
import * as preset from "tsup-preset-solid";

/*
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  splitting: false,
  sourcemap: true,
  clean: true,
});
*/

const preset_options: preset.PresetOptions = {
  entries: [
    {
      entry: "src/index.ts",
    },
  ],
  cjs: true,
};

export default defineConfig(config => {
  const watching = !!config.watch;

  const parsed_data = preset.parsePresetOptions(preset_options, watching);

  if (!watching) {
    const package_fields = preset.generatePackageExports(parsed_data);

    console.log(`\npackage.json: \n${JSON.stringify(package_fields, null, 2)}\n\n`);

    preset.writePackageJson(package_fields);
  }

  const options = preset.generateTsupOptions(parsed_data);
  options.forEach(option => {
    option.noExternal = ["solid-js/web", "solid-js"];
  });
  return options;
});
