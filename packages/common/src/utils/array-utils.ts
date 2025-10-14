/**
 * 配列関連のユーティリティ関数
 */

/**
 * 配列から安全に要素を取得する
 * @param array 対象の配列
 * @param index 取得するインデックス
 * @returns 要素（範囲外の場合はundefined）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getArrayWithSafe = (
  array: any | undefined,
  index: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any | undefined => {
  // 値が空、配列じゃない場合は無条件でundefined
  if (array === null || array === undefined || !Array.isArray(array)) {
    return undefined;
  }
  // 値が配列の場合、添え字の数が配列の長さを超えてないかを見る
  if (array.length <= index) {
    return undefined;
  }
  return array[index];
};

