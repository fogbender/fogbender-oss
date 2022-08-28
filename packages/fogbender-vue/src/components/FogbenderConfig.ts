import { Env, Token } from "fogbender";
import { defineComponent, inject, onMounted, onUnmounted, PropType, watch } from "vue-demi";
import { addVersion, fogbender } from "../util";
export default defineComponent({
  name: "FogbenderConfig",
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
  },
  setup(props) {
    const fb = inject(fogbender);

    let unwatch = () => {};

    onMounted(() => {
      fb?.setClientUrl(props.clientUrl);
      fb?.setEnv(props.env);
      fb?.setToken(addVersion(props.token));
    });

    unwatch = watch(
      () => props.token,
      value => {
        fb?.setToken(addVersion(value));
      }
    );

    onUnmounted(() => {
      fb?.setClientUrl(undefined);
      fb?.setEnv(undefined);
      fb?.setToken(undefined);
      unwatch();
    });
  },
  render() {
    return null;
  },
});
