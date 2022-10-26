import { fogbender, noopCleanup } from "../util";
import { defineComponent, h, inject, onMounted, onUnmounted, ref } from "vue-demi";

export default defineComponent({
  name: "FogbenderUnreadBadge",
  render() {
    return h("div", { ref: "rootDiv" });
  },
  setup() {
    const fb = inject(fogbender);
    let cleanup: () => void = () => {};

    const rootDiv = ref<HTMLElement>();
    /*
        name of reference variable should be same as ref attribute in 
        render function and should also be returned from setup function
        note: for more clarification https://vuejs.org/guide/essentials/template-refs.html#accessing-the-refs
        */

    onMounted(() => {
      if (rootDiv.value && fb) {
        const promise = fb.renderUnreadBadge({ el: rootDiv.value });
        promise.then(cleanup => {
          cleanup = cleanup;
        });
      } else {
        noopCleanup();
      }
    });

    onUnmounted(() => {
      cleanup();
    });
    return {
      rootDiv,
    };
  },
});
