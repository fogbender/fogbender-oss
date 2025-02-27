import HyperDX from "@hyperdx/browser";

if (!import.meta.env.DEV) {
  HyperDX.init({
    apiKey: "dfad399b-975f-4da6-8022-aac8c75aedc1",
    service: "client",
    consoleCapture: true,
    advancedNetworkCapture: true,
    maskAllInputs: true,
    maskAllText: true,
  });
}
