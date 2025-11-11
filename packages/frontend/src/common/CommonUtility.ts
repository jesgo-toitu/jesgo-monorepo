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
