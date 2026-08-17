// 共通パッケージからインポート
import { StaffErrorMessage, LOGINID_PATTERN, PASSWORD_PATTERN } from '@jesgo/common';

// 共通パッケージからの再エクスポート
export { StaffErrorMessage, LOGINID_PATTERN, PASSWORD_PATTERN };

export type RollMaster = {
  roll_id: number;
  title: string;
};

export const Roll = {
  ROLL_ID_SYSTEM: 0,
  ROLL_ID_OPERATOR: 1,
  ROLL_ID_ADVANCED: 100,
} as const;

/** プリセット管理画面へ遷移できるロール（メニュー自体は全員に表示する） */
export const PRESET_MANAGER_ROLL_IDS: readonly number[] = [
  Roll.ROLL_ID_SYSTEM,
  Roll.ROLL_ID_ADVANCED,
];

export const DISPLAYNAME_MAX_LENGTH = 20;

export const loginIdCheck = (value: string): boolean => {
  const regex = new RegExp(LOGINID_PATTERN);
  return regex.test(value);
};

export const passwordCheck = (value: string): boolean => {
  const regex = new RegExp(PASSWORD_PATTERN);
  return regex.test(value);
};

export const isStaffEditEnable = (roolId: string | null): boolean => {
  let ret = false;

  if (roolId != null) {
    const roll = Number(roolId);
    if (roll === Roll.ROLL_ID_SYSTEM) ret = true;
  }
  return ret;
};
