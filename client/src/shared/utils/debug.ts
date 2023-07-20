export function addDebug(tag: string, object: any) {
  const win = window as any;
  win._debug = win._debug || {};
  if (!win._debug[tag]) {
    win._debug[tag] = object;
  }
}

export function updateDebug<T, U>(tag: string, update: (object: T | U) => T, unsetValue: U) {
  const win = window as any;
  win._debug = win._debug || {};
  win._debug[tag] = update(win._debug[tag] || unsetValue);
}
