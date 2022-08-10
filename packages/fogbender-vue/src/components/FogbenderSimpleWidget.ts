import { createNewFogbender, Env, Token } from "fogbender";
import { defineComponent, h, PropType } from "vue-demi";
import { configureFogbender, renderWidget } from "../util";
export default defineComponent({
  name: "FogbenderSimpleWidget",
  props: {
    clientUrl: {
      type: String,
      required: false,
    },
    env: {
      type: Object as PropType<Env>,
      required: false,
    },
    token: {
      type: Object as PropType<Token>,
      required: true,
    },
    headless: {
      type: Boolean,
      required: false,
    },
  },
  render() {
    return h("div", { ref: "fogbender-widget" });
  },
  data: function () {
    return {
      fbInstance: createNewFogbender(),
      isMounted: false,
      cleanup: () => {},
    };
  },
  methods: {
    setCleanup: function (componentCleanup: () => void) {
      this.cleanup = componentCleanup;
    },
  },
  mounted() {
    configureFogbender(this.fbInstance, this.token, this.clientUrl, this.env);
    renderWidget(
      this.fbInstance,
      this.$refs["fogbender-widget"],
      this.headless,
      this.isMounted,
      this.setCleanup
    );
  },
  unmounted() {
    this.isMounted = false;
    this.cleanup();
  },
});