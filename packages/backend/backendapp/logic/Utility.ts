import { formatDateStr } from '../services/JsonToDatabase';
import { logging, LOGTYPE } from './Logger';
import crypto from 'crypto';
import { ParseStream } from 'unzipper';
import envVariables from '../config';
// 共通パッケージからインポート
import {
  Const,
  jesgo_tagging,
  escapeText,
  isPointerWithArray,
  getPointerArrayNum,
  getPointerTrimmed,
  formatDate,
  formatTime,
  isAgoYearFromNow as isAgoYearFromNowCommon,
  isDateStr,
} from '@jesgo/common';

// 共通パッケージからの再エクスポート
export { Const, jesgo_tagging, escapeText, isPointerWithArray, getPointerArrayNum, getPointerTrimmed, formatDate, formatTime, isDateStr };

export interface Obj {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;
}

// 現在日付と満N年経過しているかを確認する（ログ付きラッパー）
export const isAgoYearFromNow = (date: Date, year: number): boolean => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Utility', 'isAgoYearFromNow');
  return isAgoYearFromNowCommon(date, year);
};

/**
 * 一時展開用のディレクトリパスを削除したファイルパスを返す
 * もともと一時展開用のディレクトリパスが付いていなければファイルパスをそのまま返す
 * @param tempPath 一時展開用のディレクトリパス
 * @param filePath ファイルパス
 * @returns 一時展開用のディレクトリパスを削除したファイルパス
 */
export const cutTempPath = (tempPath: string, filePath: string): string => {
  if (filePath.startsWith(tempPath)) {
    return filePath.slice(tempPath.length);
  }
  return filePath;
};

// 患者特定ハッシュ値生成
export const GetPatientHash = (birthday: Date | string, his_id: string) => {
  let birthdayStr = '';
  if (birthday) {
    birthdayStr = formatDateStr(birthday.toString(), '');
  }

  // his_id + 生年月日(yyyyMMdd) + ソルトで生成
  return crypto
    .createHash('sha256')
    .update(
      `${his_id}${birthdayStr}${envVariables.hashSalt}`.replace(/\s+/g, ''),
      'utf8'
    )
    .digest('hex');
};

export const streamPromise = async (stream: ParseStream) => {
  return new Promise((resolve, reject) => {
    stream.on('close', () => {
      resolve('close');
    });
    stream.on('error', (error) => {
      reject(error);
    });
  });
};
