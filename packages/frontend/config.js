const common = require('@jesgo/common');
const env = process.env.NODE_ENV || 'development';
const configPath = common.getConfigPathFromPackageJson('./package.json', env);
const webAppConfig = common.loadFrontendConfig({
  configPath,
  allowEnvOverride: true,
});
if (!webAppConfig) {
  throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath}`);
}
exports.default = webAppConfig;
