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
      type: String as PropType<Env>,
      required: false,
    },
    token: {
      type: Object as PropType<Token | undefined>,
      required: true,
    },
  },
  setup(props) {
    const fb = inject(fogbender);

    onMounted(() => {
      fb?.setClientUrl(props.clientUrl);
      fb?.setEnv(props.env);
      fb?.setToken(addVersion(props.token));
    });

    const unwatchToken = watch(
      () => props.token,
      newToken => {
        fb?.setToken(addVersion(newToken));
      }
    );

    const unwatchClientUrl = watch(
      () => props.clientUrl,
      newClientUrl => {
        fb?.setClientUrl(newClientUrl);
      }
    );

    const unwatchEnv = watch(
      () => props.env,
      newEnv => {
        fb?.setEnv(newEnv);
      }
    );

    onUnmounted(() => {
      fb?.setClientUrl(undefined);
      fb?.setEnv(undefined);
      fb?.setToken(undefined);

      unwatchToken();
      unwatchClientUrl();
      unwatchEnv();
    });
  },
  render() {
    return null;
  },
});
