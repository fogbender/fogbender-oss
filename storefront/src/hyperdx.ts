import HyperDX from "@hyperdx/browser";

export function initHyperDx() {
  !import.meta.env.DEV &&
    HyperDX.init({
      apiKey: "dfad399b-975f-4da6-8022-aac8c75aedc1",
      service: "admin-app",
      consoleCapture: true,
      advancedNetworkCapture: true,
      maskAllInputs: true,
      maskAllText: true,
    });
}
