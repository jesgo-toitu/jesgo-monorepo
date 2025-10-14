/**
 * API通信の戻り値オブジェクトの型定義
 */
export interface ApiReturnObject {
  statusNum: number;
  body: unknown;
  userId?: number;
  error?: string;
  extension?: unknown;
}

/**
 * API通信の結果コード
 */
export const RESULT = {
  /** 正常終了 */
  NORMAL_TERMINATION: 0,
  /** 異常終了 */
  ABNORMAL_TERMINATION: -1,
  /** ID重複エラー */
  ID_DUPLICATION: -2,
  /** 症例が見つからないエラー */
  NOT_FOUND_CASE: -3,
  /** トークン期限切れエラー */
  TOKEN_EXPIRED_ERROR: -10,
  /** ネットワークエラー */
  NETWORK_ERROR: -20,
  /** データ転送量超過エラー */
  TOO_LARGE_ERROR: -30,
  /** ユーザー登録済みエラー */
  FAILED_USER_ALREADY_REGISTERED: -100,
  /** ユーザーエラー */
  FAILED_USER_ERROR: -101,
  /** プラグイン更新済みエラー */
  PLUGIN_ALREADY_UPDATED: -201,
  /** プラグインキャッシュ */
  PLUGIN_CACHE: -202,
  /** 権限不足エラー */
  UNAUTHORIZED_OPERATIONS: -900,
};

/**
 * HTTP メソッドタイプ
 */
export const METHOD_TYPE = {
  /** GET メソッド */
  GET: 0,
  /** POST メソッド */
  POST: 1,
  /** DELETE メソッド */
  DELETE: 2,
  /** POST メソッド（ZIP アップロード用） */
  POST_ZIP: 3,
};

