/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付の妥当性チェック
 * @param v 日付文字列
 * @returns 妥当な日付の場合true
 */
export const isDate = (v: string): boolean => !Number.isNaN(Date.parse(v));

/**
 * 日付文字列判定
 * @param dateStr 日付文字列
 * @returns 妥当な日付の場合true
 */
export const isDateStr = (dateStr: string): boolean =>
  !Number.isNaN(new Date(dateStr).getTime());

/**
 * 日付(Date形式)をyyyy/MM/ddなどの形式に変換
 * @param dateObj Date オブジェクト
 * @param separator 区切り文字（デフォルト: ''）
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (dateObj: Date, separator = ''): string => {
  try {
    const y = dateObj.getFullYear();
    const m = `00${dateObj.getMonth() + 1}`.slice(-2);
    const d = `00${dateObj.getDate()}`.slice(-2);
    return `${y}${separator}${m}${separator}${d}`;
  } catch {
    return '';
  }
};

/**
 * 日付(Date形式)から時刻を取り出しhh:mm:ssなどの形式に変換
 * @param dateObj Date オブジェクト
 * @param separator 区切り文字（デフォルト: ''）
 * @returns フォーマットされた時刻文字列
 */
export const formatTime = (dateObj: Date, separator = ''): string => {
  try {
    const h = `00${dateObj.getHours()}`.slice(-2);
    const m = `00${dateObj.getMinutes()}`.slice(-2);
    const s = `00${dateObj.getSeconds()}`.slice(-2);
    return `${h}${separator}${m}${separator}${s}`;
  } catch {
    return '';
  }
};

/**
 * 日付文字列をyyyy/MM/ddなどの形式に変換
 * @param dtStr 日付文字列
 * @param separator 区切り文字
 * @returns フォーマットされた日付文字列
 */
export const formatDateStr = (dtStr: string, separator: string): string => {
  if (!dtStr) return '';
  try {
    const dateObj = new Date(dtStr);
    const y = dateObj.getFullYear();
    const m = `00${dateObj.getMonth() + 1}`.slice(-2);
    const d = `00${dateObj.getDate()}`.slice(-2);
    return `${y}${separator}${m}${separator}${d}`;
  } catch {
    return '';
  }
};

/**
 * 年齢計算(現在日時点)
 * @param birthday 生年月日
 * @returns 年齢文字列
 */
export const calcAge = (birthday: string): string => {
  if (!birthday) return '';

  // 生年月日
  const birthdayDateObj = new Date(birthday);
  const birthNum =
    birthdayDateObj.getFullYear() * 10000 +
    (birthdayDateObj.getMonth() + 1) * 100 +
    birthdayDateObj.getDate();

  // 現在日
  const nowDate = new Date();
  const nowNum =
    nowDate.getFullYear() * 10000 +
    (nowDate.getMonth() + 1) * 100 +
    nowDate.getDate();

  return Math.floor((nowNum - birthNum) / 10000).toString();
};

/**
 * 現在日付と満N年経過しているかを確認する
 * @param date 基準日付
 * @param year 経過年数
 * @returns 満N年経過している場合true
 */
export const isAgoYearFromNow = (date: Date, year: number): boolean => {
  const yearDiff = new Date().getFullYear() - date.getFullYear();
  return yearDiff > year;
};

