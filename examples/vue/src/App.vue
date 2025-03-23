<template>
  <button @click="toggleMount">{{ !mounted ? "mount" : "unmount" }}</button>
  <FogbenderSimpleWidget
    v-if="mounted"
    clientUrl="https://main--fb-client.netlify.app"
    :token="token"
  />
</template>

<script>
import { FogbenderSimpleWidget } from "fogbender-vue";
const token = {
  widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
  customerId: "org123",
  customerName: "Customer Firm",
  userId: "example_PLEASE_CHANGE",
  userEmail: "user@example.com",
  userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
  userName: "Customer User",
  userAvatarUrl:
    "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png", // optional
};
export default {
  name: "App",
  components: {
    FogbenderSimpleWidget: FogbenderSimpleWidget,
  },
  data() {
    return {
      mounted: true,
      token,
    };
  },
  methods: {
    toggleMount() {
      this.mounted = !this.mounted;
    },
  },
};
</script>
