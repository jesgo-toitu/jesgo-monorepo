/**
 * 設定ファイルの型定義
 */

/**
 * サーバー設定（Backend用）
 */
export interface ServerConfig {
  /** データベース名 */
  database: string;
  /** データベースユーザー名 */
  user: string;
  /** データベースパスワード */
  password: string;
  /** データベースホスト */
  host: string;
  /** データベースポート */
  port: number;
  /** パスワードソルト */
  passwordSalt: string;
  /** ハッシュソルト */
  hashSalt: string;
  /** サーバーポート */
  serverPort: number;
}

/**
 * Webアプリケーション設定（Frontend用）
 */
export interface WebAppConfig {
  /** Webアプリのポート番号 */
  webAppPort: number;
  /** APIエンドポイントURL */
  endPointUrl: string;
}

/**
 * Backend設定ファイルの構造
 */
export interface BackendConfigFile {
  server: ServerConfig;
}

/**
 * Frontend設定ファイルの構造
 */
export interface FrontendConfigFile {
  webApp: WebAppConfig;
}

/**
 * 統合設定ファイルの構造（両方の設定を含む場合）
 */
export interface IntegratedConfigFile {
  server?: ServerConfig;
  webApp?: WebAppConfig;
}

/**
 * 環境変数の型定義
 */
export interface ConfigEnvironment {
  /** 環境（development/production） */
  NODE_ENV?: 'development' | 'production';
  /** データベースホスト（環境変数で上書き可能） */
  DB_HOST?: string;
  /** データベースポート（環境変数で上書き可能） */
  DB_PORT?: string;
  /** データベース名（環境変数で上書き可能） */
  DB_NAME?: string;
  /** データベースユーザー（環境変数で上書き可能） */
  DB_USER?: string;
  /** データベースパスワード（環境変数で上書き可能） */
  DB_PASSWORD?: string;
  /** サーバーポート（環境変数で上書き可能） */
  PORT?: string;
  /** APIエンドポイントURL（環境変数で上書き可能） */
  REACT_APP_API_URL?: string;
}

/**
 * 設定読み込みオプション
 */
export interface ConfigLoadOptions {
  /** 設定ファイルのパス */
  configPath?: string;
  /** 環境変数で上書きを許可するか */
  allowEnvOverride?: boolean;
  /** デフォルト値 */
  defaults?: Partial<ServerConfig | WebAppConfig>;
}

