import { createNewFogbender, Fogbender } from "fogbender";
import { defineComponent, h, PropType, provide } from "vue-demi";
import { fogbender, slot } from "../util";
export default defineComponent({
  name: "FogbenderProvider",
  props: {
    fogbender: {
      type: Object as PropType<Fogbender | undefined>,
      required: false,
    },
  },
  setup(props, { slots }) {
    provide(fogbender, props.fogbender || createNewFogbender());

    return () => h("div", [slot(slots.default)]);
  },
});
