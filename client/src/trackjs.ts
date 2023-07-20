import { TrackJS } from "trackjs";

TrackJS.install({
  token: "ba977fd623e2447289ee72eb8bbb231e",
  application: import.meta.env.PUBLIC_TRACK_JS_APP,
  enabled: import.meta.env.PROD,
});

// cat storefront/src/trackjs.ts | tee client/src/trackjs.ts | cat > vendor-demo/src/trackjs.ts
