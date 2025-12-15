import { formatDateStr } from './CommonUtility';
// 共通パッケージからインポート
import { Const as ConstCommon } from '@jesgo/common';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace Const {
  // JESGO Webアプリバージョン
  export const VERSION = '1.5';

  // 共通パッケージからの定数を再エクスポート
  export const JESGO_TAG = ConstCommon.JESGO_TAG;
  export const UI_WIDGET = ConstCommon.UI_WIDGET;
  export const EX_VOCABULARY = ConstCommon.EX_VOCABULARY;
  export const JESGO_UI_LISTTYPE = ConstCommon.JESGO_UI_LISTTYPE;
  export const JSONSchema7Keys = ConstCommon.JSONSchema7Keys;
  export const JSONSchema7Types = ConstCommon.JSONSchema7Types;
  export const JesgoRequiredTypes = ConstCommon.JesgoRequiredTypes;
  export const REQUIRED_FIELD_SYMBOL = ConstCommon.REQUIRED_FIELD_SYMBOL;
  export const INPUT_DATE_MIN = ConstCommon.INPUT_DATE_MIN;
  export const PLUGIN_TIMEOUT_SEC = ConstCommon.PLUGIN_TIMEOUT_SEC;

  /**
   * 日付入力コントロールの最大値
   */
  export const INPUT_DATE_MAX = () => formatDateStr(new Date().toString(), '-'); // 現在日を最大とする
}
