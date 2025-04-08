<template>
  <div style="height: 100vh; display: flex; flex-direction: column;">
    <button @click="toggleMount">{{ !mounted ? "mount" : "unmount" }}</button>
    <div style="flex: 1; display: flex;">
      <FogbenderSimpleRoomyWidget
        v-if="mounted"
        clientUrl="https://main--fb-client.netlify.app"
        :token="token"
      />
    </div>
  </div>
</template>

<style>
  body {
    margin: 0;
  }
</style>

<script>
  import { FogbenderSimpleRoomyWidget } from "fogbender-vue";
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Customer Firm",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userJWT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJjdXN0b21lcklkIjoib3JnMTIzIiwiY3VzdG9tZXJOYW1lIjoiQ3VzdG9tZXIgRmlybSIsInVzZXJFbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJ1c2VyTmFtZSI6IkN1c3RvbWVyIFVzZXIifQ.upRXqWj7WOb-DcjqtJ_jJ96WShbx6npL8hboAurBhYg",
    userName: "Customer User",
    userAvatarUrl:
      "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png", // optional
  };
  export default {
    name: "App",
    components: {
      FogbenderSimpleRoomyWidget: FogbenderSimpleRoomyWidget,
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
