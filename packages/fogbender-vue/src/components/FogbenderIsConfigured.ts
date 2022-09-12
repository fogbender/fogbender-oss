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

        isConfigured.value = snapshot.getValue();

        unsub.push(
          snapshot.subscribe(s => {
            isConfigured.value = s.getValue();
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
