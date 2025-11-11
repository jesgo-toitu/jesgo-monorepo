/**
 * 設定ファイル読み込みユーティリティ
 */

import {
  ServerConfig,
  WebAppConfig,
  BackendConfigFile,
  FrontendConfigFile,
  ConfigEnvironment,
  ConfigLoadOptions,
} from '../types/config';

/**
 * 環境変数から設定を読み込む
 * @param env 環境変数オブジェクト
 * @returns サーバー設定の一部
 */
export const loadConfigFromEnv = (env: ConfigEnvironment = {} as ConfigEnvironment): Partial<ServerConfig & WebAppConfig> => {
  // process.envが利用可能な場合は使用
  const envVars = typeof process !== 'undefined' && process.env ? (process.env as unknown as ConfigEnvironment) : env;
  const config: Partial<ServerConfig & WebAppConfig> = {};

  // データベース設定
  if (envVars.DB_HOST) config.host = envVars.DB_HOST;
  if (envVars.DB_PORT) config.port = parseInt(envVars.DB_PORT, 10);
  if (envVars.DB_NAME) config.database = envVars.DB_NAME;
  if (envVars.DB_USER) config.user = envVars.DB_USER;
  if (envVars.DB_PASSWORD) config.password = envVars.DB_PASSWORD;

  // サーバーポート
  if (envVars.PORT) config.serverPort = parseInt(envVars.PORT, 10);

  // WebApp設定
  if (envVars.REACT_APP_API_URL) config.endPointUrl = envVars.REACT_APP_API_URL;

  return config;
};

/**
 * 設定を環境変数でマージする
 * @param baseConfig 基本設定
 * @param env 環境変数オブジェクト
 * @returns マージされた設定
 */
export const mergeConfigWithEnv = <T extends ServerConfig | WebAppConfig>(
  baseConfig: T,
  env: ConfigEnvironment = {} as ConfigEnvironment
): T => {
  const envConfig = loadConfigFromEnv(env);
  return { ...baseConfig, ...envConfig } as T;
};

/**
 * package.jsonから設定パスを取得
 * @param packageJsonPath package.jsonのパス
 * @param env 環境（development/production）
 * @returns 設定ファイルのパス
 */
export const getConfigPathFromPackageJson = (
  packageJsonPath: string,
  env: 'development' | 'production' = 'development'
): string | null => {
  try {
    // Node.js環境でのみ使用可能
    if (typeof require !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson?.config?.configPath?.[env] || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to read package.json:', error);
    return null;
  }
};

/**
 * 設定ファイルを読み込む（汎用）
 * @param configPath 設定ファイルのパス
 * @returns 設定オブジェクト
 */
export const loadConfigFile = <T = unknown>(configPath: string): T | null => {
  try {
    // Node.js環境でのみ使用可能
    if (typeof require !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configJson) as T;
    }
    return null;
  } catch (error) {
    console.error(`Failed to load config file: ${configPath}`, error);
    return null;
  }
};

/**
 * Backend設定を読み込む
 * @param options 読み込みオプション
 * @returns サーバー設定
 */
export const loadBackendConfig = (options: ConfigLoadOptions = {}): ServerConfig | null => {
  const { configPath, allowEnvOverride = true, defaults = {} } = options;
  
  if (!configPath) {
    console.error('Config path is required');
    return null;
  }

  const configFile = loadConfigFile<BackendConfigFile>(configPath);
  if (!configFile || !configFile.server) {
    console.error('Invalid backend config file');
    return null;
  }

  let config: ServerConfig = { ...defaults as Partial<ServerConfig>, ...configFile.server };

  // 環境変数で上書き
  if (allowEnvOverride) {
    config = mergeConfigWithEnv(config);
  }

  return config;
};

/**
 * Frontend設定を読み込む
 * @param options 読み込みオプション
 * @returns WebApp設定
 */
export const loadFrontendConfig = (options: ConfigLoadOptions = {}): WebAppConfig | null => {
  const { configPath, allowEnvOverride = true, defaults = {} } = options;
  
  if (!configPath) {
    console.error('Config path is required');
    return null;
  }

  const configFile = loadConfigFile<FrontendConfigFile>(configPath);
  if (!configFile || !configFile.webApp) {
    console.error('Invalid frontend config file');
    return null;
  }

  let config: WebAppConfig = { ...defaults as Partial<WebAppConfig>, ...configFile.webApp };

  // 環境変数で上書き
  if (allowEnvOverride) {
    config = mergeConfigWithEnv(config);
  }

  return config;
};

/**
 * 設定の検証
 * @param config 設定オブジェクト
 * @param requiredFields 必須フィールド
 * @returns 検証結果
 */
export const validateConfig = (
  config: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } => {
  const missing = requiredFields.filter(field => !config[field]);
  return {
    valid: missing.length === 0,
    missing,
  };
};

