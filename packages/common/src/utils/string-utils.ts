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

