/// <reference path="../.astro/types.d.ts" />
//https://docs.astro.build/en/guides/integrations-guide/image/#picture-

/// <reference types="@astrojs/image/client" />

declare module "smartypants" {
  export function smartypants(text: string, attr?: number): string;
}

declare module "node:child_process" {
  export function execSync(command: string): Buffer;
}

interface Window {
  _fog_version: string | undefined;
}
