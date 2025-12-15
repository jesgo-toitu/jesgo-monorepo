/**
 * 表示用文字列の定数定義
 * フロントエンド・バックエンドで共通使用される表示文字列
 */
export const DISPLAY_STRINGS = {
  /** 未入力 */
  NOT_ENTERED: '未',
  /** 無 */
  NONE: '無',
  /** 済 */
  COMPLETED: '済',
  /** 有 */
  EXISTS: '有',
  /** 拒否 */
  DECLINE: '拒否',
} as const;

/**
 * 表示文字列の型定義
 */
export type DisplayString = typeof DISPLAY_STRINGS[keyof typeof DISPLAY_STRINGS];

