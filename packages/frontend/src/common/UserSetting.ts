/**
 * 利用者ごとの設定（ログイン中の本人の設定）の保持
 *
 * 設定の正はサーバ（利用者テーブル）にあり、ここではログイン中の本人の設定の写しを
 * localStorage に持つ。写しは次のときに書き換える。
 * - ログイン時（サーバの値で必ず上書きする。前の利用者の値を引き継がない）
 * - 本人がユーザーメニューから設定を確認・変更したとき
 * - 管理者が利用者管理で自分自身の設定を変更したとき
 * ログアウト時には削除する。
 */
import { DEFAULT_USER_SETTING } from '@jesgo/common';

// localStorage のキー
const HIDE_SAVE_CONFIRM_KEY = 'hide_save_confirm';

/**
 * ログイン中の利用者が、保存確認ダイアログを「表示しない」に設定しているか否か
 * 値が無い・不正な場合は既定値（表示する）として扱う
 */
export const isHideSaveConfirm = (): boolean => {
  const value = localStorage.getItem(HIDE_SAVE_CONFIRM_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return DEFAULT_USER_SETTING.hide_save_confirm;
};

/**
 * ログイン中の利用者の保存確認の表示設定を保持する
 * @param hideSaveConfirm 表示しない場合は true。真偽値以外は既定値（表示する）として扱う
 */
export const storeHideSaveConfirm = (hideSaveConfirm: unknown): void => {
  const value =
    typeof hideSaveConfirm === 'boolean'
      ? hideSaveConfirm
      : DEFAULT_USER_SETTING.hide_save_confirm;
  localStorage.setItem(HIDE_SAVE_CONFIRM_KEY, value.toString());
};

/**
 * 保持している利用者ごとの設定を削除する（ログアウト時）
 */
export const clearUserSetting = (): void => {
  localStorage.removeItem(HIDE_SAVE_CONFIRM_KEY);
};
