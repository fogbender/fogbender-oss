import { createNewFogbender, type Fogbender, type FogbenderLoader } from "fogbender";

// create Fogbender
const newFogbenderInstance = createNewFogbender();
newFogbenderInstance.setVersion("loader", "0.1.1");

const { fogbender } = window as typeof window & { fogbender: FogbenderLoader };
// Fogbender is already defined that means loader.ts was used by new proxy based snippet
if (fogbender && fogbender._queue) {
  // link it with snippet proxy
  fogbender._fogbender = newFogbenderInstance;
  // clear the queue
  fogbender._queue.forEach(([methodName, args, resolve, reject]) => {
    // @ts-ignore
    newFogbenderInstance[methodName](...args)
      // @ts-ignore
      .then(resolve)
      .catch(reject);
  });
} else {
  // loader.js was used without snippet, let's just export it as a global
  (window as typeof window & { fogbender: Fogbender }).fogbender = newFogbenderInstance;
}
