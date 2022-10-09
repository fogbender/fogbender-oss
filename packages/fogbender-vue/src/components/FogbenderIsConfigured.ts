import { Snapshot } from "fogbender";
import { defineComponent, h, inject, onMounted, onUnmounted, ref, VNode } from "vue-demi";
import { fogbender, slot } from "../util";
export default defineComponent({
  name: "FogbenderIsConfigured",
  setup(props, { slots }) {
    let isConfigured = ref(false);

    const unsub: (() => void)[] = [];

    onMounted(async () => {
      const fb = inject(fogbender);
      if (fb) {
        const snapshot = await fb.isClientConfigured();
        unsub.push(
          snapshot.subscribe(v => {
            isConfigured.value = v;
          })
        );
      }
    });

    onUnmounted(() => {
      unsub.forEach(u => u());
    });

    return () => h("div", [isConfigured.value ? slot(slots.default) : null]);
  },
});
