/**
 * ステータス文字列の定数定義
 * フロントエンド・バックエンドで共通使用されるステータス文字列
 */
export const STATUS_STRINGS = {
  /** 死亡 */
  DEATH: 'death',
  /** 手術療法 */
  SURGERY: 'surgery',
  /** 化学療法（薬物療法） */
  CHEMO: 'chemo',
  /** 放射線療法 */
  RADIO: 'radio',
  /** 支持療法 */
  SUPPORTIVECARE: 'supportivecare',
  /** 再発 */
  RECURRENCE: 'recurrence',
  /** エラー有無 */
  HAS_ERROR: 'has_error',
  /** 合併症 */
  COMPLICATIONS: 'complications',
  /** 登録拒否 */
  DECLINE: 'decline',
  /** 登録完了 */
  COMPLETED: 'completed',
  /** 登録未完了 */
  NOT_COMPLETED: 'not_completed',
  /** 未入力 */
  NO_INPUT: 'no_input',
} as const;

/**
 * ステータス文字列の型定義
 */
export type StatusString = typeof STATUS_STRINGS[keyof typeof STATUS_STRINGS];

