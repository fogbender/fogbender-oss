const path = require("path");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: "./src/loader.ts",
  output: {
    path: path.join(__dirname, "public"),
    filename: "loader.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            compilerOptions: {
              importsNotUsedAsValues: undefined,
              noEmit: false,
            },
          },
        },
      },
    ],
  },
};
