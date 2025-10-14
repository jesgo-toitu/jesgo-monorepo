import * as fs from 'fs';
import {
  WebAppConfig,
  loadFrontendConfig,
  getConfigPathFromPackageJson,
  mergeConfigWithEnv,
} from '@jesgo/common';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: WebAppConfig = {
  webAppPort: 3030,
  endPointUrl: 'http://localhost:8000/',
};

/**
 * 設定ファイルのパスを探す（フォールバック付き）
 */
const findConfigPath = (): string | null => {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production';
  
  // 候補パスのリスト（優先順位順）
  const candidatePaths = [
    // 1. package.jsonで指定されたパス
    getConfigPathFromPackageJson('./package.json', env),
    // 2. デフォルトのconfig.json
    './dist/config.json',
    // 3. settingsディレクトリのテンプレート
    '../settings/config.json',
    // ４. settingsディレクトリのテンプレート
    '../settings/config.template.json',
      ].filter((p): p is string => p !== null);

  // 存在するファイルを探す
  for (const candidatePath of candidatePaths) {
    try {
      if (fs.existsSync(candidatePath)) {
        console.log(`✓ 設定ファイルを読み込みました: ${candidatePath}`);
        return candidatePath;
      }
    } catch (error) {
      // 次の候補を試す
      continue;
    }
  }

  console.warn('⚠ 設定ファイルが見つかりません。デフォルト設定を使用します。');
  return null;
};

/**
 * Frontend設定を読み込む
 */
const loadConfig = (): WebAppConfig => {
  // 設定ファイルのパスを探す
  const configPath = findConfigPath();
  
  // 設定ファイルが見つからない場合はデフォルト設定を使用
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  // 設定ファイルを読み込む
  const webAppConfig = loadFrontendConfig({
    configPath,
    allowEnvOverride: true,
    defaults: DEFAULT_CONFIG,
  });

  if (!webAppConfig) {
    console.warn('⚠ 設定ファイルの読み込みに失敗しました。デフォルト設定を使用します。');
    return DEFAULT_CONFIG;
  }

  // 環境変数でマージ
  return mergeConfigWithEnv(webAppConfig);
};

// 設定を読み込んでエクスポート
const configValues = loadConfig();
export default configValues;

