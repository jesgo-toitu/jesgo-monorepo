/**
 * 固定フィールド名の定数定義
 * フロントエンド・バックエンドで共通使用されるフィールド名
 */
export const FIXED_FIELD_NAMES = {
  /** 患者ID */
  PATIENT_ID: '患者ID',
  /** 患者名 */
  PATIENT_NAME: '患者名',
  /** 年齢 */
  AGE: '年齢',
  /** 初回治療開始日 */
  INITIAL_TREATMENT_DATE: '初回治療開始日',
  /** 最終更新日 */
  LAST_UPDATE: '最終更新日',
  /** 診断 */
  DIAGNOSIS: '診断',
  /** 進行期 */
  ADVANCED_STAGE: '進行期',
  /** ステータス */
  STATUS: 'ステータス',
} as const;

/**
 * 固定フィールド名の型定義
 */
export type FixedFieldName = typeof FIXED_FIELD_NAMES[keyof typeof FIXED_FIELD_NAMES];

