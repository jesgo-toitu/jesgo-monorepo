/**
 * 文書のエラー情報（jesgo:error）から、患者リストの「要確認」「エラーあり」の印を判定する
 *
 * jesgo:error の要素として製品の仕様が定める形は次の 2 つ
 * - 文字列（文書全体に関わるエラー）
 * - { "項目名": "文字列" } の形のオブジェクト（項目に関わるエラー）
 *
 * 読み取れる内容は従来と同じ規則（「要修正」を含めば「エラーあり」、「要確認」を含めば「要確認」）で判定する。
 * 読み取れない値（数値・真偽値・配列の入れ子・値に文字列以外を含むオブジェクト、配列でない jesgo:error）が
 * あるときは、エラー情報が読めないことをエラーが無いことと取り違えないよう「エラーあり」とする。
 * null の要素は判定に使わない。文書は読むだけで変更しない。
 */

/** 「エラーあり」を表す語 */
const ERROR_KEYWORD = '要修正';
/** 「要確認」を表す語 */
const WARN_KEYWORD = '要確認';

export interface JesgoErrorStatus {
  /** 「要確認」の印を付ける */
  hasWarn: boolean;
  /** 「エラーあり」の印を付ける */
  hasError: boolean;
  /** 読み取れない値があった（運用ログ用） */
  hasUnreadableValue: boolean;
}

/** 文字列のメッセージに従来の規則を当てはめる */
const applyMessage = (status: JesgoErrorStatus, message: string): void => {
  if (message.includes(WARN_KEYWORD)) status.hasWarn = true;
  if (message.includes(ERROR_KEYWORD)) status.hasError = true;
};

/** 読み取れない値があったことを記録する（「エラーあり」とする） */
const markUnreadable = (status: JesgoErrorStatus): void => {
  status.hasUnreadableValue = true;
  status.hasError = true;
};

/**
 * jesgo:error の値から印を判定する
 * @param errorProperty 文書の最上位の jesgo:error の値
 * @returns 印の判定結果
 */
export const getJesgoErrorStatus = (errorProperty: unknown): JesgoErrorStatus => {
  const status: JesgoErrorStatus = {
    hasWarn: false,
    hasError: false,
    hasUnreadableValue: false,
  };

  // 未設定・null は印を付けない
  if (errorProperty === undefined || errorProperty === null) return status;

  // 配列でない場合は読み取れない値として扱う
  if (!Array.isArray(errorProperty)) {
    markUnreadable(status);
    return status;
  }

  for (const item of errorProperty as unknown[]) {
    if (item === null || item === undefined) {
      // null の要素は判定に使わない
      continue;
    }
    if (typeof item === 'string') {
      applyMessage(status, item);
    } else if (typeof item === 'object' && !Array.isArray(item)) {
      // { "項目名": "文字列" } の形。値がすべて文字列であれば、それぞれに同じ規則を当てはめる
      const values = Object.values(item as { [key: string]: unknown });
      if (values.every((value) => typeof value === 'string')) {
        (values as string[]).forEach((value) => applyMessage(status, value));
      } else {
        markUnreadable(status);
      }
    } else {
      // 数値・真偽値・配列の入れ子など
      markUnreadable(status);
    }
  }
  return status;
};
