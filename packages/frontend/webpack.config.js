"use strict";
const path = require('path');  //path モジュールの読み込み
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
let enviroment = 'development';
const modeIdx = process.argv.findIndex(arg => arg.toLowerCase() === '--mode');
if(modeIdx > -1 && process.argv.length > modeIdx + 1) {
  enviroment = process.argv[modeIdx + 1];
}

// ポート設定（環境変数 PORT > FRONTEND_PORT > デフォルト3000）
const frontendPort = process.env.PORT 
  ? parseInt(process.env.PORT, 10) 
  : process.env.FRONTEND_PORT 
    ? parseInt(process.env.FRONTEND_PORT, 10) 
    : 3000;

// Docker環境でのWebSocket URL設定
const webSocketPort = process.env.WEBPACK_PORT || 3000;
const webSocketHost = process.env.WEBPACK_HOST || 'localhost';

module.exports = {
  mode: 'development',  //モード
  entry: './src/Index.tsx',  //エントリポイント（デフォルトと同じ設定）
  output: {  //出力先（デフォルトと同じ設定）
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',  // webpack-dev-serverで正しく動作させるために必要
  },
  resolve: {
    modules: [ "./node_modules" ],
    extensions: [".js", ".ts", ".tsx"],
    fallback: {
      // Node.js組み込みモジュールのfallback設定（ブラウザ環境用）
      "fs": false,
      "path": false,
      "crypto": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          }
        ]
      },
      {
        // TODO 最終的には不要になるはず
        // Babel のローダーの設定
        //対象のファイルの拡張子
        test: /\.(js|mjs|jsx)$/,
        //対象外とするフォルダ
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
              ]
            }
          }
        ]
      },
      {
        test: /\.css/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: { url: false }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'image/[name][ext]'
        }
      }
    ],
    parser: {
      javascript: { commonjsMagicComments: true },
    },
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, `.env.${enviroment}`)
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      inject: 'body',
    }),
  ],
  devServer: {
    port: frontendPort,
    host: '0.0.0.0',
    historyApiFallback: {
      index: '/index.html',
      disableDotRule: true,
    },
    hot: true,
    liveReload: true,
    allowedHosts: 'all',
    compress: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    webSocketServer: 'ws',
    watchFiles: {
      paths: ['src/**/*', '../common/src/**/*', '../settings/**/*'],
      options: {
        usePolling: true,
        interval: 1000,
      },
    },
    client: {
      webSocketURL: `ws://${webSocketHost}:${webSocketPort}/ws`,
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
      reconnect: true,
    },
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'image'),
        publicPath: '/image',
      },
      {
        directory: path.join(__dirname, 'assets'),
        publicPath: '/assets',
      },
      {
        // packages/settings/config.jsonを/config.jsonとして公開
        directory: path.join(__dirname, '../settings'),
        publicPath: '/',
        serveIndex: false,
        watch: true,
      },
    ],
  }
};