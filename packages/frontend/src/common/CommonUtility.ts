/* eslint-disable import/prefer-default-export */

import Encoding from 'encoding-japanese';
import { NavigateFunction } from 'react-router-dom';
import store from '../store';
// 共通パッケージからインポート
import {
  calcAge,
  isDate,
  formatDate,
  formatTime,
  formatDateStr,
  generateUuid,
  isPointerWithArray,
  getPointerArrayNum,
  getPointerTrimmed,
  getArrayWithSafe,
} from '@jesgo/common';

// 共通パッケージからの再エクスポート
export { calcAge, isDate, formatDate, formatTime, formatDateStr, generateUuid, isPointerWithArray, getPointerArrayNum, getPointerTrimmed, getArrayWithSafe };

/* ここには画面機能に依存しない共通関数などを記述する */

/**
 * ページunloadイベント
 * @param e {BeforeUnloadEvent} - event
 */
const beforeunloadEvent = (e: BeforeUnloadEvent) => {
  e.returnValue = '';
};

/**
 * ページunloadイベント追加
 */
export const AddBeforeUnloadEvent = () => {
  window.addEventListener('beforeunload', beforeunloadEvent);
};

/**
 * ページunloadイベント削除
 */
export const RemoveBeforeUnloadEvent = () => {
  window.removeEventListener('beforeunload', beforeunloadEvent);
};

export const fTimeout = (timeoutSec: number) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject('timeout');
    }, timeoutSec * 1000);
  });

/**
 * タイムアウト処理
 * @param promiseFunc 実行するPromise
 * @param timeoutSec タイムアウトの秒数
 * @returns
 */
export const setTimeoutPromise = async (
  promiseFunc: () => Promise<unknown>,
  timeoutSec = 15 * 60 // デフォルト15分
) => Promise.race([fTimeout(timeoutSec), promiseFunc()]);

/**
 * Sjis変換処理
 * @param utf8String UTF8(標準)形式のString
 * @returns SJIS形式のString
 */
export const toShiftJIS = (utf8String: string) => {
  const unicodeList = [];

  for (let i = 0; i < utf8String.length; i += 1) {
    unicodeList.push(utf8String.charCodeAt(i));
  }

  const sjisArray = Encoding.convert(unicodeList, {
    to: 'SJIS',
    from: 'AUTO',
  });
  return new Uint8Array(sjisArray);
};

export const toUTF8 = (sjisString: string) => {
  const unicodeList = [];

  for (let i = 0; i < sjisString.length; i += 1) {
    unicodeList.push(sjisString.charCodeAt(i));
  }
  const sjisArray = Encoding.convert(unicodeList, {
    to: 'UTF8',
    from: 'AUTO',
  });
  return new Uint8Array(sjisArray);
};


/**
 * 患者リストに戻る
 * @param navigate
 */
export const backToPatientsList = (navigate: NavigateFunction) => {
  // 遷移前の検索条件のパラメータを付与する
  const topMenuInfo = store.getState().commonReducer.topMenuInfo;
  if (topMenuInfo && topMenuInfo.paramString) {
    navigate(`/Patients${topMenuInfo.paramString}`);
  } else {
    navigate('/Patients');
  }
};

/**
 * ローマ数字を数値に変換
 * @param roman ローマ数字文字列（例: "I", "II", "III", "IV", "V" など）
 * @returns 数値。ローマ数字でない場合はnullを返す
 */
export const romanToNumber = (roman: string): number | null => {
  if (!roman || typeof roman !== 'string') {
    return null;
  }

  const trimmed = roman.trim().toUpperCase();
  // ローマ数字のマッピング
  const romanMap: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  // ローマ数字パターンの検証（基本的なローマ数字のみ対応）
  const romanPattern = /^[IVXLCDM]+$/;
  if (!romanPattern.test(trimmed)) {
    return null;
  }

  let result = 0;
  let prevValue = 0;

  for (let i = trimmed.length - 1; i >= 0; i--) {
    const currentValue = romanMap[trimmed[i]];
    if (!currentValue) {
      return null;
    }

    if (currentValue < prevValue) {
      result -= currentValue;
    } else {
      result += currentValue;
    }
    prevValue = currentValue;
  }

  return result;
};

/**
 * ソート用の値取得と型判定
 * @param value ソート対象の値
 * @returns ソート可能な値（数値、ローマ数字の数値、文字列）
 */
export const getSortableValue = (value: unknown): number | string => {
  if (value === null || value === undefined) {
    return '';
  }

  // 数値の場合
  if (typeof value === 'number') {
    return value;
  }

  // 文字列の場合
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // 空文字列
    if (trimmed === '') {
      return '';
    }

    // 数値として解析できるか確認
    const numericValue = Number(trimmed);
    if (!isNaN(numericValue) && isFinite(numericValue) && trimmed === numericValue.toString()) {
      return numericValue;
    }

    // ローマ数字として解析できるか確認
    const romanValue = romanToNumber(trimmed);
    if (romanValue !== null) {
      return romanValue;
    }

    // 文字列として返す
    return trimmed;
  }

  // その他の型は文字列に変換
  return String(value);
};

/**
 * ソート比較関数
 * @param a 比較対象A
 * @param b 比較対象B
 * @param ascending trueの場合は昇順、falseの場合は降順
 * @returns 比較結果
 */
export const compareValues = (a: unknown, b: unknown, ascending: boolean): number => {
  const valueA = getSortableValue(a);
  const valueB = getSortableValue(b);

  // null/undefined/空文字列の処理
  if (valueA === '' && valueB === '') {
    return 0;
  }
  if (valueA === '') {
    return 1; // 空は後ろに
  }
  if (valueB === '') {
    return -1; // 空は後ろに
  }

  let result: number;

  // 数値同士の比較
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    result = valueA - valueB;
  }
  // 文字列同士の比較
  else if (typeof valueA === 'string' && typeof valueB === 'string') {
    result = valueA.localeCompare(valueB, 'ja', { numeric: true, sensitivity: 'base' });
  }
  // 異なる型の比較（数値を優先）
  else if (typeof valueA === 'number') {
    result = -1; // 数値が優先
  } else if (typeof valueB === 'number') {
    result = 1; // 数値が優先
  } else {
    result = String(valueA).localeCompare(String(valueB), 'ja', { numeric: true });
  }

  return ascending ? result : -result;
};
