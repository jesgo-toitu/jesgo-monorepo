import { JSONSchema7 } from 'json-schema';

export interface ShowSaveDialogState {
  showFlg: boolean;
  eventKey: any;
}

export interface ChildTabSelectedFuncObj {
  fnAddDocument: ((isTabSelected: boolean, eventKey: any) => void) | undefined;
  fnSchemaChange: ((isTabSelected: boolean, eventKey: any) => void) | undefined;
}

// validation種別
export enum VALIDATE_TYPE {
  Message, // メッセージ(エラーではない)
  Required, // 必須入力エラー
  MinimumItem, // array最小個数エラー
  MaximumItem, // array最大個数エラー
  MinimumNumber, // 数値最小値エラー
  MaximumNumber, // 数値最大値エラー
  Regex, // 正規表現エラー
  Range, // 数値範囲外エラー
  Constant, // 固定値エラー
  Enum, // リスト外エラー
  Number, // 非数値エラー
  Integer, // 非整数エラー
  Other, // その他エラー
  JesgoError, // jesgo:error
}

export type ValidationItem = {
  message: string;
  validateType: VALIDATE_TYPE;
  jsonpath?: string;
};

export type validationResult = {
  schema: JSONSchema7;
  messages: ValidationItem[];
};

/**
 * validationエラー
 */
export type RegistrationErrors = {
  validationResult: validationResult;
  errDocTitle: string;
  schemaId: number;
  documentId: string;
};
