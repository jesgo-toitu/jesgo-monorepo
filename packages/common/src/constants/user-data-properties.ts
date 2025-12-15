/**
 * userDataオブジェクトのプロパティ名の定数定義
 * バックエンド・フロントエンドで共通使用されるプロパティ名
 */
export const USER_DATA_PROPERTIES = {
  /** 患者ID */
  PATIENT_ID: 'patientId',
  /** 患者名 */
  PATIENT_NAME: 'patientName',
  /** 年齢 */
  AGE: 'age',
  /** 初回治療開始日 */
  START_DATE: 'startDate',
  /** 最終更新日 */
  LAST_UPDATE: 'lastUpdate',
  /** 診断 */
  DIAGNOSIS: 'diagnosis',
  /** 進行期 */
  ADVANCED_STAGE: 'advancedStage',
  /** ステータス */
  STATUS: 'status',
} as const;

/**
 * userDataプロパティ名の型定義
 */
export type UserDataProperty = typeof USER_DATA_PROPERTIES[keyof typeof USER_DATA_PROPERTIES];

