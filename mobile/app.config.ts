export default ({ config }: { config: any }) => ({
  ...config,
  extra: {
    serverUrl: process.env.PUBLIC_SERVER_URL,
    serverApiUrl: process.env.PUBLIC_API_SERVER_URL
      ? process.env.PUBLIC_API_SERVER_URL + "/api"
      : "http://localhost:8000/api",
  },
});
