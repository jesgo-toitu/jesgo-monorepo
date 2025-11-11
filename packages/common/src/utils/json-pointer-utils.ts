/**
 * JSON Pointer関連のユーティリティ関数
 */

/**
 * Jsonpointerの末尾に配列指定系の文字列が含まれているかを返す
 * @param pointer JSON Pointer文字列
 * @returns 配列指定が含まれている場合true
 */
export const isPointerWithArray = (pointer: string): boolean => {
  if (pointer.endsWith('/-')) {
    return true;
  }
  const match = pointer.match(/\/(\d+)$/);
  if (match) {
    return true;
  }
  return false;
};

/**
 * Jsonpointerの末尾から配列位置指定を取得する
 * @param pointer JSON Pointer文字列
 * @returns 配列位置指定の数値（見つからない場合-1）
 */
export const getPointerArrayNum = (pointer: string): number => {
  const match = pointer.match(/\/(\d+)$/);
  if (match) {
    return Number(match.slice(1));
  }
  return -1;
};

/**
 * Jsonpointerの末尾から配列位置指定を削除する
 * @param pointer JSON Pointer文字列
 * @returns 配列位置指定を削除したJSON Pointer文字列
 */
export const getPointerTrimmed = (pointer: string): string => {
  if (pointer.endsWith('/-')) {
    return pointer.slice(0, -2);
  }
  const match = pointer.match(/\/(\d+)$/);
  if (match) {
    return pointer.slice(0, -match.length);
  }
  return pointer;
};

