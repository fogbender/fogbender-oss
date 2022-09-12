import { createNewFogbender, Env, Token } from "fogbender";
import { defineComponent, h, PropType } from "vue-demi";
import { addVersion, renderWidget } from "../util";
export default defineComponent({
  name: "FogbenderSimpleWidget",
  props: {
    clientUrl: {
      type: String,
      required: false,
    },
    env: {
      type: String as PropType<Env>,
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
      fb: createNewFogbender(),
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
    this.fb.setClientUrl(this.clientUrl);
    this.fb.setEnv(this.env);
    this.fb.setToken(addVersion(this.token));

    renderWidget(
      this.fb,
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
