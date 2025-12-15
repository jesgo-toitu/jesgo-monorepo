/**
 * 文字列関連のユーティリティ関数
 */

/**
 * テキスト内のダブルクォートをエスケープする
 * @param text エスケープ対象のテキスト
 * @returns エスケープされたテキスト
 */
export const escapeText = (text: string): string => {
  return text.replace(/"/g, '\\"');
};

/**
 * UUID作成
 * @returns UUID文字列
 */
export const generateUuid = (): string => {
  // https://github.com/GoogleChrome/chrome-platform-analytics/blob/master/src/internal/identifier.js
  const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');
  // eslint-disable-next-line no-plusplus
  for (let i = 0, len = chars.length; i < len; i++) {
    switch (chars[i]) {
      case 'x':
        chars[i] = Math.floor(Math.random() * 16).toString(16);
        break;
      case 'y':
        chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
        break;
      default:
    }
  }
  return chars.join('');
};

/**
 * 元となる文字列に区切り文字と新規文字列を追加する
 * 新規文字列が既に含まれている場合は元となる文字列をそのまま返し、
 * 元となる文字列が空であれば区切り文字は追加せず追加文字列のみを返す
 * @param baseString 元となる文字列
 * @param addString 新規文字列
 * @param spacer 区切り文字（指定しない場合は空文字）
 * @returns 追加後の文字列
 */
export const addStatus = (
  baseString: string,
  addString: string,
  spacer = ''
): string => {
  // 新規文字列が空の場合は元の文字列を返す
  if (!addString || addString === '') {
    return baseString;
  }
  
  // 元となる文字列が空の場合は区切り文字なしで新規文字列を返す
  if (baseString === '') {
    return addString;
  }
  
  // 新規文字列が既に含まれていない場合のみ追加
  if (baseString.indexOf(addString) === -1) {
    return baseString + spacer + addString;
  }
  
  // 既に含まれている場合は元の文字列をそのまま返す
  return baseString;
};

/**
 * 元となる文字列に区切り文字と新規文字列を追加する（重複を許可）
 * 元となる文字列が空であれば区切り文字は追加せず追加文字列のみを返す
 * @param baseString 元となる文字列
 * @param addString 新規文字列
 * @param spacer 区切り文字（指定しない場合は空文字）
 * @returns 追加後の文字列
 */
export const addStatusAllowDuplicate = (
  baseString: string,
  addString: string,
  spacer = ''
): string => {
  // 新規文字列が空の場合は元の文字列を返す
  if (!addString || addString === '') {
    return baseString;
  }
  
  // 元となる文字列が空の場合は区切り文字なしで新規文字列を返す
  if (baseString === '') {
    return addString;
  }
  
  // 重複を許可して追加
  return baseString + spacer + addString;
};

