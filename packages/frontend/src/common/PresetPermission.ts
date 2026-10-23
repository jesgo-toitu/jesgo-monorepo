import { PRESET_UPDATE_PERMISSION } from '@jesgo/common';

/**
 * プリセット機能更新権限の端末（localStorage）での保持
 * 他の権限と同じく、ログイン時にサーバの値を保持し、ログアウトで消す。
 * 画面の表示（プリセット管理画面の追加・編集・コピー・削除ボタン）にだけ使い、
 * 保存・削除の可否は API 側で必ず判定する。
 */

/**
 * プリセット機能更新権限を端末に保持する
 * @param value サーバから受け取った値（真偽値以外・未設定は権限なし）
 */
export const storePresetUpdatable = (value: unknown): void => {
  localStorage.setItem(
    PRESET_UPDATE_PERMISSION.STORAGE_KEY,
    (value === true).toString()
  );
};

/**
 * プリセット機能更新権限を持っているか否か（端末に保持している値）
 * @returns 権限があれば true
 */
export const hasPresetUpdatePermission = (): boolean =>
  localStorage.getItem(PRESET_UPDATE_PERMISSION.STORAGE_KEY) === 'true';

/**
 * プリセット機能更新権限を端末から消す（ログアウト時）
 */
export const clearPresetUpdatable = (): void => {
  localStorage.removeItem(PRESET_UPDATE_PERMISSION.STORAGE_KEY);
};
