"use strict";
const path = require('path');  //path モジュールの読み込み
const fs = require('fs');
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

// --- 画面の土台となるスタイル（Bootstrap 3.3.7 の CSS とアイコン用フォント） ---
// 稼働施設は外部に到達できないため、CDN は参照せず、vendor/bootstrap-dist/ に置いた
// Bootstrap 3.3.7 の配布ファイルを、ビルドの出力（dist/bootstrap-dist/）へそのまま出す。
// 本番用・開発用のビルドと開発サーバのいずれでも出力され、リリース資源作成時の後処理は不要。
// CSS はフォントを `../fonts/` で参照するため、css と fonts の相対位置を保って出力する。
// CSS をバンドル（main.js）へ取り込むと読み込み順やフォントの参照が変わるため、取り込まない。
// なお、vendor の CSS 2 件は、配布しないソースマップ（.map）を参照しないよう、
// 公式配布物の末尾の `/*# sourceMappingURL=… */` の行だけを取り除いてある（それ以外は 3.3.7 のまま）。
const BOOTSTRAP_SRC_DIR = path.resolve(__dirname, 'vendor/bootstrap-dist');
const BOOTSTRAP_OUT_DIR = 'bootstrap-dist';
const BOOTSTRAP_FILES = [
  'css/bootstrap.min.css',
  'css/bootstrap-theme.min.css',
  'fonts/glyphicons-halflings-regular.eot',
  'fonts/glyphicons-halflings-regular.svg',
  'fonts/glyphicons-halflings-regular.ttf',
  'fonts/glyphicons-halflings-regular.woff',
  'fonts/glyphicons-halflings-regular.woff2',
];

/**
 * 指定したファイルを、内容を変えずにビルドの出力へ加える webpack プラグイン
 * （依存を増やさないため、webpack 標準の機能だけで実装している）
 */
class EmitStaticFilesPlugin {
  constructor(srcDir, outDir, files) {
    this.srcDir = srcDir;
    this.outDir = outDir;
    this.files = files;
  }

  apply(compiler) {
    const pluginName = 'EmitStaticFilesPlugin';
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: pluginName, stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          const srcPaths = this.files.map((file) => path.join(this.srcDir, file));
          // 監視対象に加える（欠けたファイルを戻したときにも開発サーバが再ビルドする）
          srcPaths.forEach((srcPath) => compilation.fileDependencies.add(srcPath));
          // ファイルが 1 件でも無い場合はビルドを失敗させる（スタイルが欠けた資源を作らない）
          const missing = srcPaths.filter((srcPath) => !fs.existsSync(srcPath));
          if (missing.length > 0) {
            throw new Error(
              '画面のスタイル（Bootstrap 3.3.7 の CSS・アイコン用フォント）のファイルが見つからないため、ビルドを中止しました。' +
                `次のファイルを ${path.relative(__dirname, this.srcDir)} に戻してください:\n` +
                missing.map((srcPath) => `  - ${path.relative(this.srcDir, srcPath)}`).join('\n')
            );
          }
          for (const file of this.files) {
            const srcPath = path.join(this.srcDir, file);
            const content = fs.readFileSync(srcPath);
            compilation.emitAsset(
              `${this.outDir}/${file}`,
              new sources.RawSource(content)
            );
          }
        }
      );
    });
  }
}

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
    // Bootstrap 3.3.7 の CSS とアイコン用フォントを dist/bootstrap-dist/ へ出力する
    new EmitStaticFilesPlugin(BOOTSTRAP_SRC_DIR, BOOTSTRAP_OUT_DIR, BOOTSTRAP_FILES),
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