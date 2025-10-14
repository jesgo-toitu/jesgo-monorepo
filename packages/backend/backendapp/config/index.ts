import * as fs from 'fs';
import * as path from 'path';
import {
  ServerConfig,
  loadBackendConfig,
  getConfigPathFromPackageJson,
  mergeConfigWithEnv,
} from '@jesgo/common';

/**
 * Backend環境変数の型定義（拡張）
 */
export type EnvVariables = ServerConfig & {
  privateKey: string;
  publicKey: string;
};

/**
 * 鍵ファイルを読み込む
 */
const loadKeys = (): { privateKey: string; publicKey: string } => {
  try {
    const privateKey = fs.readFileSync('./backendapp/config/keys/private.key', 'utf-8');
    const publicKey = fs.readFileSync('./backendapp/config/keys/public.key', 'utf-8');
    return { privateKey, publicKey };
  } catch (error) {
    console.error('Failed to load keys:', error);
    throw new Error('Keys not found. Please generate keys first.');
  }
};

/**
 * 設定ファイルのパスを探す（フォールバック付き）
 */
const findConfigPath = (): string => {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production';
  
  // 候補パスのリスト（優先順位順）
  const candidatePaths = [
    // 1. package.jsonで指定されたパス
    getConfigPathFromPackageJson('./package.json', env),
    // 2. デフォルトのconfig.json
    './backendapp/config/config.json',
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

  throw new Error('設定ファイルが見つかりません。config.json または config.template.json を配置してください。');
};

/**
 * 設定を読み込む
 */
const loadConfig = (): EnvVariables => {
  // 設定ファイルのパスを探す
  const configPath = findConfigPath();

  // 設定ファイルを読み込む
  const serverConfig = loadBackendConfig({
    configPath,
    allowEnvOverride: true,
  });

  if (!serverConfig) {
    throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath}`);
  }

  // 環境変数でマージ（Docker環境対応）
  const mergedConfig = mergeConfigWithEnv(serverConfig);

  // 鍵を読み込む
  const keys = loadKeys();

  return {
    ...mergedConfig,
    ...keys,
  };
};

// 設定を読み込んでエクスポート
const envVariables = loadConfig();
export default envVariables;
