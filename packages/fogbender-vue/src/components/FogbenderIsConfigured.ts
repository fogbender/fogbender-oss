import { Snapshot } from "fogbender";
import { defineComponent, h, inject, onMounted, onUnmounted, ref, VNode } from "vue-demi";
import { fogbender, slot } from "../util";
export default defineComponent({
  name: "FogbenderIsConfigured",
  setup(props, { slots }) {
    let isConfigured = ref(false);

    const unsub = [] as (() => void)[];

    onMounted(() => {
      const fb = inject(fogbender);
      if (fb) {
        getConfiguredFromSnapshot(async () => {
          return fb.isClientConfigured();
        }, false);
      }
    });

    const getConfiguredFromSnapshot = (
      snapshotGen: () => Promise<Snapshot<boolean>>,
      initialValue: boolean
    ) => {
      let value = initialValue;

      const run = async () => {
        const snapshot = await snapshotGen();

        value = snapshot.getValue();

        isConfigured.value = value;

        unsub.push(
          snapshot.subscribe(s => {
            value = s.getValue();
            isConfigured.value = value;
          })
        );
      };
      run();
    };

    onUnmounted(() => {
      unsub.forEach(u => u());
    });

    return () => h("div", [isConfigured.value ? slot(slots.default) : null]);
  },
});
