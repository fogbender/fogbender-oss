import { Fogbender } from "fogbender";
import { defineComponent, inject, onMounted, onUnmounted, ref, watch } from "vue-demi";
import { fogbender, renderComponent } from "../util";
export default defineComponent({
  name: "FogbenderFloatingWidget",
  props: {
    verbose: {
      type: Boolean,
      required: false,
    },
    openInNewTab: {
      type: Boolean,
      required: false,
    },
  },
  setup(props) {
    let isMounted = ref(false);

    let cleanup = () => {};

    const fb = inject(fogbender);

    const setCleanup = (componentCleanup: () => void) => {
      cleanup = componentCleanup;
    };

    const renderSimpleFloatie = (fb: Fogbender, verbose: boolean, openInNewTab: boolean) => {
      renderComponent(
        () => fb.createFloatingWidget({ verbose, openInNewTab }),
        isMounted.value,
        setCleanup
      );
    };

    onMounted(() => {
      isMounted.value = true;
      if (fb) {
        renderSimpleFloatie(fb, props.verbose, props.openInNewTab);
      }
    });

    onUnmounted(() => {
      isMounted.value = false;
      cleanup();
    });
  },
  render() {
    return null;
  },
});
