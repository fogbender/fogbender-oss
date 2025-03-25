module.exports = {
  devServer: {
    allowedHosts: "all",
    hot: false,
    liveReload: false,
    client: {
      webSocketURL: {
        protocol: "wss",
        hostname: process.env.CODESANDBOX_HOST || "localhost",
        port: 443,
        pathname: "/ws",
      },
      overlay: false,
    },
  },
};
