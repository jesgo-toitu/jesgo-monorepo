"use strict";
const path = require('path');  //path モジュールの読み込み
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
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

// --- Bootstrap（画面全体の土台となるスタイル）の供給元 -----------------------
// JESGO の画面は react-bootstrap（Bootstrap 3 系）を前提としており、その CSS は
// 従来 index.html から CDN を参照していた。稼働施設は完全な閉域でありブラウザも
// 外部に到達できないため、CDN 参照のままでは画面が崩れる。
// そこで npm パッケージ `bootstrap`（3.3.7 固定）を唯一の供給元とし、ビルドが
// dist/bootstrap-dist/ へ出力する。リリース資源作成時の後処理は不要である。
// glyphicons（アイコン用フォント）は bootstrap.min.css が `../fonts/…` で参照する
// ため、css と同じ階層構造（bootstrap-dist/css・bootstrap-dist/fonts）で配置する。
const bootstrapDistDir = path
  .join(path.dirname(require.resolve('bootstrap/package.json')), 'dist')
  .replace(/\\/g, '/');

// --- 本文フォント（BIZ UDPGothic）の供給元 -----------------------------------
// v1.5 までは src/biz-udpgothic.css が local() でのみ参照しており、リポジトリに置いた
// TTF は一度も使われず、実際には OS にインストールされた BIZ UDPGothic が使われていた。
// そのためフォントが入っていない端末では表示が変わっていた。
// v1.6.0 以降は同梱の TTF を dist/fonts/ へ出力し、CSS から url('/fonts/…') で参照する。
// Bootstrap と同じ copy-webpack-plugin 方式に揃えており、css-loader（url: false）を
// 経由しないため、他の CSS の url() 解決に影響しない。
// ライセンス（SIL Open Font License 1.1）の全文も同じ場所へ出力し、配布物に必ず同梱する。
const fontsSrcDir = path.resolve(__dirname, 'src/assets/fonts').replace(/\\/g, '/');

// 配布資源には *.map を含めない（リリース資源作成時に除外されるため、
// sourceMappingURL を残すと参照先の無いソースマップ要求が発生する）。
const stripSourceMappingURL = (content) =>
  Buffer.from(
    content.toString('utf8').replace(/\s*\/\*#\s*sourceMappingURL=[^*]*\*\/\s*$/, '\n'),
    'utf8'
  );

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
    // Bootstrap の CSS とアイコン用フォントをビルド成果物へ出力する
    new CopyWebpackPlugin({
      patterns: [
        {
          from: `${bootstrapDistDir}/css/bootstrap.min.css`,
          to: 'bootstrap-dist/css/bootstrap.min.css',
          transform: stripSourceMappingURL,
        },
        {
          from: `${bootstrapDistDir}/css/bootstrap-theme.min.css`,
          to: 'bootstrap-dist/css/bootstrap-theme.min.css',
          transform: stripSourceMappingURL,
        },
        {
          // glyphicons-halflings-regular.{eot,svg,ttf,woff,woff2}
          from: `${bootstrapDistDir}/fonts`,
          to: 'bootstrap-dist/fonts',
        },
        // 本文フォント（BIZ UDPGothic Regular）と、その配布に必要なライセンス全文。
        // Bold は CSS で定義していないため出力しない（合成太字で v1.5 と同じ見た目になる）。
        {
          from: `${fontsSrcDir}/BIZUDPGothic-Regular.ttf`,
          to: 'fonts/BIZUDPGothic-Regular.ttf',
        },
        {
          // SIL Open Font License 1.1。フォントを再配布する以上、必ず同梱する。
          from: `${fontsSrcDir}/OFL.txt`,
          to: 'fonts/OFL.txt',
        },
      ],
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
    setupMiddlewares: (middlewares, devServer) => {
      // packages/settings/config.jsonを/config.jsonとして公開
      devServer.app.get('/config.json', (req, res) => {
        res.sendFile(
          path.join(__dirname, '../settings/config.template.json')
        );
      });
      return middlewares;
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
      }
    ],
  }
};