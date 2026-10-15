import { configure, getLogger, Configuration } from 'log4js';
import * as fs from 'fs';

export const LOGTYPE = {
  FATAL: 1,
  ERROR: 2,
  WARN: 3,
  INFO: 4,
  DEBUG: 5,
};

/** log4jsの設定ファイル（プロセスのカレントディレクトリからの相対パス） */
const LOG_CONFIG_PATH = 'logConfig.json';

/** LOG_LEVELに指定可能な値 */
const VALID_LOG_LEVELS = [
  'all',
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'mark',
  'off',
];

/**
 * 出力するログレベルを決定する
 * 1. 環境変数 LOG_LEVEL が有効な値であればそれを使う
 * 2. 本番環境(NODE_ENV=production)は info とし、DEBUGログを出力しない
 * 3. それ以外は設定ファイルの値をそのまま使う
 * @param configuredLevel 設定ファイルに記載されたログレベル
 * @returns 実際に適用するログレベル
 */
const resolveLogLevel = (configuredLevel: string): string => {
  const envLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (envLevel) {
    if (VALID_LOG_LEVELS.includes(envLevel)) {
      return envLevel;
    }
    console.warn(
      `環境変数 LOG_LEVEL の値が不正なため無視します: ${process.env.LOG_LEVEL ?? ''}`
    );
  }
  if (process.env.NODE_ENV === 'production') {
    return 'info';
  }
  return configuredLevel;
};

/**
 * log4jsを初期化する
 */
const setupLogger = (): void => {
  try {
    const config = JSON.parse(
      fs.readFileSync(LOG_CONFIG_PATH, 'utf-8')
    ) as Configuration;
    const defaultCategory = config.categories?.default;
    if (defaultCategory) {
      defaultCategory.level = resolveLogLevel(defaultCategory.level);
    }
    configure(config);
  } catch (e) {
    // 設定ファイルを読めない場合は従来どおりファイル指定で初期化する
    console.error(
      `ログ設定の読み込みに失敗しました: ${(e as Error).message}`
    );
    configure(LOG_CONFIG_PATH);
  }
};

setupLogger();

export const logging = (
  type: number,
  message: string,
  displayName?: string,
  functionName?: string,
  loginName?: string
): void => {
  let section = '[共通]';
  if (displayName) {
    if (functionName) {
      if (loginName) {
        section = `[${displayName}-${functionName}][${loginName}]`;
      } else {
        section = `[${displayName}-${functionName}]`;
      }
    } else {
      section = `[${displayName}]`;
    }
  }
  const logger = getLogger(section);
  switch (type) {
    case LOGTYPE.FATAL:
      logger.fatal(message);
      break;

    case LOGTYPE.ERROR:
      logger.error(message);
      break;

    case LOGTYPE.WARN:
      logger.warn(message);
      break;

    case LOGTYPE.INFO:
      logger.info(message);
      break;

    case LOGTYPE.DEBUG:
      logger.debug(message);
      break;

    default:
  }
};
