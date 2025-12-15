/**
 * 区切り文字の定数定義
 * フロントエンド・バックエンドで共通使用される区切り文字
 */
export const SEPARATORS = {
  /** 診断用区切り文字（中点・全角） */
  DIAGNOSIS: '･',
  /** 進行期用区切り文字（中点・全角） */
  STAGE: '・',
} as const;

/**
 * 区切り文字の型定義
 */
export type Separator = typeof SEPARATORS[keyof typeof SEPARATORS];

