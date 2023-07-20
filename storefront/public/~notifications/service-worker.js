self.oninstall = () => self.skipWaiting();

self.onactivate = () => self.clients.claim();

self.onmessage = ev => {
  console.log("onmessage", ev);
};

self.onpush = ev => {
  console.log("onpush", ev, ev.data.text());
  const clients = self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.then(tab => {
    console.log("find windows to focus in case of notification", tab);
  });
};
