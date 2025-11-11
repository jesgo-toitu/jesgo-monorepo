"use strict";

const path = require("path");

const config = {
  mode: "production",
  entry: './src/index.js',
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    // publicPath: "/"
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
    fallback: {
      // Node.js組み込みモジュールのfallback設定（ブラウザ環境用）
      "fs": false,
      "path": false,
      "crypto": false,
    },
  },
};

module.exports = config;