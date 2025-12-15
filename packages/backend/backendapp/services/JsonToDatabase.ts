import { DbAccess } from '../logic/DbAccess';
import { readFileSync, readdirSync, rename } from 'fs';
import { ApiReturnObject, RESULT } from '../logic/ApiCommon';
import { listFilesRecursive } from '../logic/FileUtility';
import lodash from 'lodash';
import { logging, LOGTYPE } from '../logic/Logger';
import { Open } from 'unzipper';
import UUID from 'uuidjs';
import * as fs from 'fs';
import fse from 'fs-extra';
import * as path from 'path';
import {
  Const,
  cutTempPath,
  isDateStr,
  escapeText,
  formatDate,
  formatTime,
  jesgo_tagging,
  streamPromise,
} from '../logic/Utility';

//インターフェース

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
export type JSONSchema7TypeName =
  | 'string' //
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
export type JSONSchema7Type =
  | string //
  | number
  | boolean
  | JSONSchema7Object
  | JSONSchema7Array
  | null;

// Workaround for infinite type recursion
export interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

// Workaround for infinite type recursion
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSONSchema7Array extends Array<JSONSchema7Type> {}

/**
 * Meta schema
 *
 * Recommended values:
 * - 'http://json-schema.org/schema#'
 * - 'http://json-schema.org/hyper-schema#'
 * - 'http://json-schema.org/draft-07/schema#'
 * - 'http://json-schema.org/draft-07/hyper-schema#'
 *
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-5
 */
export type JSONSchema7Version = string;

/**
 * JSON Schema v7
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01
 */
export type JSONSchema7Definition = JSONSchema7 | boolean;
export interface JSONSchema7 {
  $id?: string | undefined;
  $ref?: string | undefined;
  $schema?: JSONSchema7Version | undefined;
  $comment?: string | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
   */
  type?: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined;
  enum?: JSONSchema7Type[] | undefined;
  const?: JSONSchema7Type | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: number | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: number | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchema7Definition | JSONSchema7Definition[] | undefined;
  additionalItems?: JSONSchema7Definition | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  contains?: JSONSchema7 | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: string[] | undefined;
  properties?:
    | {
        [key: string]: JSONSchema7Definition;
      }
    | undefined;
  patternProperties?:
    | {
        [key: string]: JSONSchema7Definition;
      }
    | undefined;
  additionalProperties?: JSONSchema7Definition | undefined;
  dependencies?:
    | {
        [key: string]: JSONSchema7Definition | string[];
      }
    | undefined;
  propertyNames?: JSONSchema7Definition | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: JSONSchema7Definition | undefined;
  then?: JSONSchema7Definition | undefined;
  else?: JSONSchema7Definition | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: JSONSchema7Definition[] | undefined;
  anyOf?: JSONSchema7Definition[] | undefined;
  oneOf?: JSONSchema7Definition[] | undefined;
  not?: JSONSchema7Definition | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
   */
  format?: string | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
   */
  contentMediaType?: string | undefined;
  contentEncoding?: string | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  definitions?:
    | {
        [key: string]: JSONSchema7Definition;
      }
    | undefined;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  title?: string | undefined;
  description?: string | undefined;
  default?: JSONSchema7Type | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: JSONSchema7Type | undefined;

  /**
   * JSONSchema 未対応プロパティ
   */
  $defs?:
    | {
        [key: string]: JSONSchema7Definition;
      }
    | undefined;
  units?: string | undefined;

  /**
   * 拡張ボキャブラリー
   */
  'jesgo:required'?: string[] | undefined;
  'jesgo:set'?: string | undefined;
  'jesgo:get'?: string | undefined;
  'jesgo:tag'?: string | undefined;
  'jesgo:parentschema'?: string[] | undefined;
  'jesgo:unique'?: boolean | undefined;
  'jesgo:copy'?: boolean | undefined;
  'jesgo:subschema'?: string[] | undefined;
  'jesgo:childschema'?: string[] | undefined;
  'jesgo:ref'?: string | undefined;
  'jesgo:ui:visibleWhen'?: JSONSchema7 | undefined;
  'jesgo:ui:subschemastyle'?: string | undefined;
  'jesgo:ui:textarea'?: number | boolean | undefined;
  'jesgo:valid'?: string[] | undefined;
  'jesgo:version'?: string | undefined;
  'jesgo:author'?: string | undefined;
  'jesgo:inheriteventdate'?: string | undefined;
}

type oldSchema = {
  schema_id: number;
  schema_primary_id: number;
  valid_from: Date;
  valid_until: Date | null;
  version_major: number;
  version_minor: number;
  hidden: boolean | null;
};

/** Schema加工用Utility */
type schemaItem = {
  pItems: { [key: string]: JSONSchema7Definition };
  pNames: string[];
};

const dbAccess = new DbAccess();

/**
 * Postgresクエリ用に数値の配列を文字列でカンマ区切りにして返す
 * @param numArray
 * @returns
 */
export const numArrayCast2Pg = (numArray: number[]): string => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'numArrayCast2Pg');
  let isFirst = true;
  let numStr = '';
  for (let index = 0; index < numArray.length; index++) {
    const num = numArray[index];
    if (isFirst) {
      isFirst = false;
    } else {
      numStr += ', ';
    }
    numStr += num.toString();
  }
  return numStr;
};

// 日付文字列をyyyy/MM/ddなどの形式に変換
export const formatDateStr = (dtStr: string, separator: string) => {
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
 * 入力された日付の前日を取得
 * @param date 入力日
 * @returns 入力日の前日
 */
const getPreviousDay = (date: Date): Date => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'getPreviousDay');
  const previousDate = date;
  previousDate.setDate(date.getDate() - 1);
  logging(
    LOGTYPE.DEBUG,
    `${date.toDateString()}の前日として${previousDate.toDateString()}を取得`,
    'JsonToDatabase',
    'getPreviousDay'
  );
  return previousDate;
};

/**
 * undefinedで入ってくるかもしれない数値を検出し、テキスト形式に直す
 * undefinedの場合は"NULL"で返す
 */
export const undefined2Null = (num: number | undefined): string => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'undefined2Null');
  if (num === null || num === undefined) {
    return 'NULL';
  }
  return num.toString();
};

/**
 * 基底スキーマと継承スキーマのIDを入力に、スキーマ同士の関係にエラーがないかを確認する
 * @param id1 継承スキーマのID
 * @param id2 基底スキーマのID
 * @returns エラーがある場合はtrueを返す
 */
export const hasInheritError = async (
  id1: number,
  id2: number
): Promise<boolean> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'hasInheritError');
  const results = (await dbAccess.query(
    `SELECT uniqueness FROM view_latest_schema WHERE schema_id IN (${id1}, ${id2})`
  )) as { uniqueness: boolean; schema_id_string: string }[];
  if (results[0].uniqueness === results[1].uniqueness) {
    // 継承先と基底の間でjesgo:uniqueの値が一緒であればエラー無しを返す
    return false;
  }
  logging(
    LOGTYPE.ERROR,
    `${results[0].schema_id_string}と${results[1].schema_id_string}の間に継承エラー発生`,
    'JsonToDatabase',
    'hasInheritError'
  );
  return true;
};

/**
 * 既に存在するschema_string_idかを確認
 * @param stringId 確認対象のschema_string_id
 * @returns 存在する場合、そのschema_idを、存在しない場合は-1を返す
 */
const getOldSchema = async (stringId: string): Promise<oldSchema[]> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'getOldSchema');
  const query = `SELECT schema_id, valid_from, valid_until, version_major, version_minor, schema_primary_id, hidden
   FROM jesgo_document_schema WHERE schema_id_string = '${stringId}'
   ORDER BY schema_primary_id DESC;`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret: oldSchema[] = (await dbAccess.query(query)) as oldSchema[];
  if (ret.length > 0) {
    // DB内の日付をGMT+0として認識しているので時差分の修正をする
    const offset = new Date().getTimezoneOffset() * 60 * 1000;
    for (let i = 0; i < ret.length; i += 1) {
      ret[i].valid_from = new Date(ret[i].valid_from.getTime() - offset);
      if (ret[i].valid_until) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ret[i].valid_until = new Date(ret[i].valid_until!.getTime() - offset);
      }
    }

    // 既に存在するschema_string_id
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    return ret;
  }
  const newInsertId = await getInsertId();
  // 存在しない場合は新規の構造体を返す
  const newSchema: oldSchema = {
    schema_id: newInsertId,
    schema_primary_id: -1,
    valid_from: new Date('1970/01/01'),
    valid_until: null,
    version_major: 0,
    version_minor: 0,
    hidden: null,
  };
  return [newSchema];
};

/**
 * 次に使用するInsert用のIDを返す
 * 既に存在するschema_string_idかを確認してあればそれのschema_id,
 * なければ現在使用されているschemaIdの最大値+1を返す
 * @param stringId 確認対象のschema_string_id
 * @returns 次に使用するInsert用のID
 */
const getInsertId = async (): Promise<number> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'getInsertId');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret: any[] = (await dbAccess.query(
    `select max(schema_id) from jesgo_document_schema`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as any[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (ret[0].max as number) + 1; //
};

/**
 * アップデート前と後でバージョン遷移が正しいかどうかを確認する
 * @param baseMajor アップデート前のメジャーバージョン
 * @param baseMinor アップデート前のマイナーバージョン
 * @param updateMajor アップデート後のメジャーバージョン
 * @param updateMinor アップデート後のマイナーバージョン
 * @returns 問題があればtrueを返す
 */
const hasVersionUpdateError = (
  baseMajor: number,
  baseMinor: number,
  updateMajor: number,
  updateMinor: number
): boolean => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'hasVersionUpdateError');
  // メジャーバージョンが旧版の方が大きければエラー
  if (updateMajor < baseMajor) {
    logging(
      LOGTYPE.ERROR,
      `呼び出し`,
      'メジャーバージョンが旧版の方が大きい',
      'hasVersionUpdateError'
    );
    return true;
  }
  // メジャーバージョンが旧版と同じかつ、マイナーバージョンが旧版以下(同じも含む)であればエラー
  if (updateMajor === baseMajor && updateMinor <= baseMinor) {
    logging(
      LOGTYPE.ERROR,
      `呼び出し`,
      'マイナーバージョンが旧版以下',
      'hasVersionUpdateError'
    );
    return true;
  }
  // どちらでもなければエラー無し
  return false;
};

const makeInsertQuery = (
  schemaInfoList: oldSchema[],
  json: JSONSchema7,
  dirPath: string,
  fileName: string,
  errorMessages: string[]
): [string, string[], string[]] => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'makeInsertQuery');
  let schemaIdString: string = json.$id ?? '';
  const title: string = json.title ?? '';
  let errorFlag = false;

  const latestSchemaInfo = schemaInfoList[0]; // 有効フラグ関係なく現在の最新スキーマ(バージョンチェック用)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const validSchemaInfo = schemaInfoList.find((p) => !p.hidden)!; // 有効な現在の最新スキーマ

  let subQuery = ['', ''];
  if (schemaIdString === '') {
    logging(
      LOGTYPE.ERROR,
      `[${cutTempPath(dirPath, fileName)}]スキーマIDが未指定です。`,
      'JsonToDatabase',
      'makeInsertQuery'
    );
    errorMessages.push(
      `[${cutTempPath(dirPath, fileName)}]スキーマIDが未指定です。`
    );
    schemaIdString = '未指定';
    errorFlag = true;
  }

  if (title === '') {
    logging(
      LOGTYPE.ERROR,
      `スキーマ(id=${schemaIdString})のタイトルを設定してください。`,
      'JsonToDatabase',
      'makeInsertQuery'
    );
    errorMessages.push(
      `[${cutTempPath(
        dirPath,
        fileName
      )}]スキーマ(id=${schemaIdString})のタイトルを設定してください。`
    );
    errorFlag = true;
  }
  const titles: string[] = title.split(' ', 2) ?? ['', ''];
  let subtitle = '';
  if (titles.length > 1) {
    subtitle = titles[1];
  }
  // INSERT
  let query =
    'INSERT INTO jesgo_document_schema (schema_id, schema_id_string, title, subtitle, document_schema';
  const value = [
    validSchemaInfo.schema_id.toString(),
    schemaIdString,
    titles[0],
    subtitle,
    JSON.stringify(json),
  ];

  if (json['jesgo:unique'] != null) {
    query += ', uniqueness';
    value.push(json['jesgo:unique'].toString());
  }

  // スキーマ有効期限の処理
  if (json['jesgo:valid'] != null) {
    const validDate: (Date | undefined)[] = [undefined, undefined];
    let validFromStr = json['jesgo:valid'][0];
    if (validFromStr != null) {
      // 未設定ならエポック日(1970-01-01)
      if (validFromStr === '') {
        validFromStr = '1970-01-01';
      }

      if (isDateStr(validFromStr)) {
        // 有効期限開始日の指定あり
        query += ', valid_from';
        value.push(validFromStr);

        const newValidFrom = new Date(validFromStr);
        validDate[0] = newValidFrom;
        // 旧スキーマと有効期限開始日が同じか、古い場合はエラー
        if (validSchemaInfo && validSchemaInfo.valid_from >= newValidFrom) {
          logging(
            LOGTYPE.ERROR,
            `スキーマ(id=${schemaIdString})の有効期限開始日は登録済のものより新しくしてください。`,
            'JsonToDatabase',
            'makeInsertQuery'
          );
          errorMessages.push(
            `[${cutTempPath(
              dirPath,
              fileName
            )}]スキーマ(id=${schemaIdString})の有効期限開始日は登録済のものより新しくしてください。`
          );
          errorFlag = true;
        } else {
          // 新スキーマの開始日があれば旧スキーマの有効期限終了日を新スキーマの有効期限開始日前日に設定する

          // schema_primary_idが-1であれば旧スキーマが存在しないので対応しない
          if (validSchemaInfo.schema_primary_id !== -1) {
            logging(
              LOGTYPE.DEBUG,
              `スキーマ(id=${schemaIdString}, Pid=${validSchemaInfo.schema_primary_id})の有効期限終了日を更新`,
              'JsonToDatabase',
              'makeInsertQuery'
            );
            subQuery = [
              formatDate(getPreviousDay(new Date(newValidFrom)), '-'),
              validSchemaInfo.schema_primary_id.toString(),
            ];
          }
        }
      } else {
        logging(
          LOGTYPE.ERROR,
          `スキーマ(id=${schemaIdString})の有効期限開始日はyyyy-MM-ddの形式で記述してください。`,
          'JsonToDatabase',
          'makeInsertQuery'
        );
        errorMessages.push(
          `[${cutTempPath(
            dirPath,
            fileName
          )}]スキーマ(id=${schemaIdString})の有効期限開始日はyyyy-MM-ddの形式で記述してください`
        );
        errorFlag = true;
      }
    }
    const validUntilStr = json['jesgo:valid'][1];
    if (validUntilStr) {
      if (isDateStr(validUntilStr)) {
        query += ', valid_until';
        value.push(validUntilStr);
        validDate[1] = new Date(validUntilStr);
      } else {
        logging(
          LOGTYPE.ERROR,
          `スキーマ(id=${schemaIdString})の有効期限終了日はyyyy-MM-ddの形式で記述してください。`,
          'JsonToDatabase',
          'makeInsertQuery'
        );
        errorMessages.push(
          `[${cutTempPath(
            dirPath,
            fileName
          )}]スキーマ(id=${schemaIdString})の有効期限終了日はyyyy-MM-ddの形式で記述してください`
        );
        errorFlag = true;
      }
    }

    // 開始日と終了日逆転チェック
    if (validDate[0] && validDate[1] && validDate[0] > validDate[1]) {
      logging(
        LOGTYPE.ERROR,
        `スキーマ(id=${schemaIdString})の有効期限終了日は開始日より新しくしてください。`,
        'JsonToDatabase',
        'makeInsertQuery'
      );
      errorMessages.push(
        `[${cutTempPath(
          dirPath,
          fileName
        )}]スキーマ(id=${schemaIdString})の有効期限終了日は開始日より新しくしてください。`
      );
      errorFlag = true;
    }
  } else {
    // 開始日の指定なし
    // まずepoch date(0 - 1970-01-01)を開始日にする
    let newValidFrom = new Date(0);

    // 旧スキーマと有効期限開始日が同じか、古い場合は旧スキーマの翌日を開始日とする
    if (validSchemaInfo.valid_from >= newValidFrom) {
      newValidFrom = new Date(validSchemaInfo.valid_from);
      newValidFrom.setDate(newValidFrom.getDate() + 1);
    }

    logging(
      LOGTYPE.DEBUG,
      `スキーマ(id=${schemaIdString})の有効期限開始日を ${formatDate(
        newValidFrom,
        '-'
      )} に自動設定`,
      'JsonToDatabase',
      'makeInsertQuery'
    );

    // 旧スキーマに有効期限終了日が設定されていないか、新スキーマの有効期限開始日以降であれば
    // 旧スキーマの有効期限終了日を新スキーマの有効期限開始日前日に設定する
    if (
      validSchemaInfo.valid_until === null ||
      validSchemaInfo.valid_until >= newValidFrom
    ) {
      // schema_primary_idが-1であれば旧スキーマが存在しないので対応しない
      if (validSchemaInfo.schema_primary_id !== -1) {
        logging(
          LOGTYPE.DEBUG,
          `スキーマ(id=${schemaIdString}, Pid=${validSchemaInfo.schema_primary_id})の有効期限終了日を更新`,
          'JsonToDatabase',
          'makeInsertQuery'
        );
        subQuery = [
          formatDate(getPreviousDay(new Date(newValidFrom)), '-'),
          validSchemaInfo.schema_primary_id.toString(),
        ];
      }
    }
    query += ', valid_from';
    value.push(formatDate(newValidFrom, '-'));
  }

  // author はNOTNULL
  query += ', author';
  if (json['jesgo:author'] != null) {
    value.push(json['jesgo:author']);
  } else {
    value.push('');
  }

  // version
  query += ', version_major, version_minor';
  if (json['jesgo:version'] != null) {
    try {
      const majorVersion = Number(json['jesgo:version'].split('.')[0]);
      const minorVersion = Number(json['jesgo:version'].split('.')[1]);

      // 新規登録する物が登録済よりバージョンが低いか同じ場合、エラーを返す
      if (
        hasVersionUpdateError(
          latestSchemaInfo.version_major,
          latestSchemaInfo.version_minor,
          majorVersion,
          minorVersion
        )
      ) {
        logging(
          LOGTYPE.ERROR,
          `スキーマ(id=${schemaIdString})のバージョンは登録済のものより新しくしてください。`,
          'JsonToDatabase',
          'makeInsertQuery'
        );
        errorMessages.push(
          `[${cutTempPath(
            dirPath,
            fileName
          )}]スキーマ(id=${schemaIdString})のバージョンは登録済のものより新しくしてください。`
        );
        errorFlag = true;
      }

      value.push(majorVersion.toString(), minorVersion.toString());
    } catch {
      // バージョン形式が正しくない場合もエラーを返す
      logging(
        LOGTYPE.ERROR,
        `スキーマ(id=${schemaIdString})のバージョンの形式に不備があります。`,
        'JsonToDatabase',
        'makeInsertQuery'
      );
      errorMessages.push(
        `[${cutTempPath(
          dirPath,
          fileName
        )}]スキーマ(id=${schemaIdString})のバージョンの形式に不備があります。`
      );
      errorFlag = true;
    }
  } else {
    // バージョンはNOT NULL
    logging(
      LOGTYPE.ERROR,
      `スキーマ(id=${schemaIdString})のバージョンが未記載です。`,
      'JsonToDatabase',
      'makeInsertQuery'
    );
    errorMessages.push(
      `[${cutTempPath(
        dirPath,
        fileName
      )}]スキーマ(id=${schemaIdString})のバージョンが未記載です。`
    );
    errorFlag = true;
  }

  query += ', plugin_id';
  value.push('0');

  // valueの項目数で代入項目を生成する
  query += `) VALUES (${value
    .map((s, i) => '$' + (i + 1).toString())
    .join(', ')})`;

  // 一つでもエラーが出ていたら有効なクエリは返さない
  if (errorFlag) {
    return ['', [], []];
  } else {
    return [query, value, subQuery];
  }
};

const fileListInsert = async (
  fileList: string[],
  errorMessages: string[],
  dirPath: string
): Promise<{ updateNum: number; isSchemaAllUpdate: boolean }> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'fileListInsert');
  let updateNum = 0;
  const jsons: { json: JSONSchema7; filePath: string }[] = [];
  for (let i = 0; i < fileList.length; i++) {
    if (!fileList[i].endsWith('.json')) {
      logging(
        LOGTYPE.ERROR,
        `[${cutTempPath(
          dirPath,
          fileList[i]
        )}]JSONファイル以外のファイルが含まれています。`,
        'JsonToDatabase',
        'fileListInsert'
      );
      errorMessages.push(
        `[${cutTempPath(
          dirPath,
          fileList[i]
        )}]JSONファイル以外のファイルが含まれています。`
      );
      continue;
    }
    let json: JSONSchema7 = {};
    try {
      json = JSON.parse(readFileSync(fileList[i], 'utf8')) as JSONSchema7;
      jsons.push({ json, filePath: fileList[i] });
    } catch {
      logging(
        LOGTYPE.ERROR,
        `[${cutTempPath(
          dirPath,
          fileList[i]
        )}]JSON形式が正しくないファイルが含まれています。`,
        'JsonToDatabase',
        'fileListInsert'
      );
      errorMessages.push(
        `[${cutTempPath(
          dirPath,
          fileList[i]
        )}]JSON形式が正しくないファイルが含まれています。`
      );
      continue;
    }
  }

  // jsonファイルを並び替える
  jsons
    // 文字列の短い順(よりパスの短い順)に整列
    .sort(function (a, b) {
      // $ID順で並び替え
      if (a.json.$id && b.json.$id) {
        if (a.json.$id !== b.json.$id) {
          if (a.json.$id > b.json.$id) return 1;
          if (a.json.$id < b.json.$id) return -1;
        }
      }

      // バージョンの比較
      const versionOfA = a.json['jesgo:version'];
      const versionOfB = b.json['jesgo:version'];
      if (versionOfA && versionOfB) {
        // メジャーバージョン順で並び替え
        if (
          Number(versionOfA.split('.')[0]) !== Number(versionOfB.split('.')[0])
        ) {
          return (
            Number(versionOfA.split('.')[0]) - Number(versionOfB.split('.')[0])
          );
        }
        // マイナーーバージョン順で並び替え
        if (
          Number(versionOfA.split('.')[1]) !== Number(versionOfB.split('.')[1])
        ) {
          return (
            Number(versionOfA.split('.')[1]) - Number(versionOfB.split('.')[1])
          );
        }
      }

      return 0;
    });

  const insertedList: JSONSchema7[] = [];
  let isSchemaAllUpdate = false;

  for (let i = 0; i < jsons.length; i++) {
    // Insert用IDを含む旧データの取得
    const oldJsonData = await getOldSchema(jsons[i].json.$id as string);

    const [query, values, subqueryValues] = makeInsertQuery(
      oldJsonData,
      jsons[i].json,
      dirPath,
      jsons[i].filePath,
      errorMessages
    );
    if (query !== '') {
      await dbAccess.query(query, values);

      // 同一スキーマIDのスキーマが処理された場合、後続のschemaListUpdateを全スキーマ更新モードで実行する
      if (insertedList.find((p) => p.$id === jsons[i].json.$id)) {
        isSchemaAllUpdate = true;
      }
      if (!isSchemaAllUpdate) {
        insertedList.push(jsons[i].json);
      }

      if (subqueryValues[0] !== '') {
        // 旧スキーマの有効期限更新がある場合そちらも行う
        await dbAccess.query(
          'UPDATE jesgo_document_schema SET valid_until = $1 WHERE schema_primary_id = $2',
          subqueryValues
        );
      }

      // 新規スキーマが登録された場合、schema_primary_id=0のスキーマに新しいスキーマIDを追加
      await addNewSchemaToRootSchema(oldJsonData[0].schema_id);

      updateNum++;
    }
  }
  return { updateNum, isSchemaAllUpdate };
};

/**
 * DBに登録されているスキーマのsubschema, childschema情報をアップデートする
 */
export const schemaListUpdate = async (updateAll = false) => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'schemaListUpdate');

  // 先に「子スキーマから指定した親スキーマの関係リスト」を逆にしたものを作成しておく
  type parentSchemas = {
    schema_id: number;
    parent_schemas: string[];
  };

  type childSchemas = {
    schema_id: number;
    child_schema_ids: number[];
  };
  // selectでDBに保存されている各スキーマのparent_schema一覧を取得
  const childSchemasList: childSchemas[] = [];
  const parentSchemas: parentSchemas[] = (await dbAccess.query(
    `SELECT schema_id, 
    document_schema->'jesgo:parentschema' as parent_schemas
    FROM jesgo_document_schema WHERE schema_id <> 0`
  )) as parentSchemas[];
  for (let i = 0; i < parentSchemas.length; i++) {
    if (parentSchemas[i].parent_schemas) {
      for (let j = 0; j < parentSchemas[i].parent_schemas.length; j++) {
        // ワイルドカードを含むかどうかで処理を分ける
        if (parentSchemas[i].parent_schemas[j].includes('*')) {
          const splitedId = parentSchemas[i].parent_schemas[j].split('*');
          const searchId =
            splitedId[0].endsWith('/') && splitedId[1] === ''
              ? `${splitedId[0]}/*`
              : `${splitedId[0]}[^/]*${splitedId[1]}$`;
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string ~ $1 AND schema_id <> 0',
            [searchId]
          )) as schemaId[];
          for (let k = 0; k < schemaIds.length; k++) {
            const targetSchema = childSchemasList.find(
              (v) => v.schema_id === schemaIds[k].schema_id
            );
            if (targetSchema) {
              targetSchema.child_schema_ids.push(parentSchemas[i].schema_id);
            } else {
              const newSchema: childSchemas = {
                schema_id: schemaIds[k].schema_id,
                child_schema_ids: [parentSchemas[i].schema_id],
              };
              childSchemasList.push(newSchema);
            }
          }
        } else {
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string = $1 AND schema_id <> 0',
            [parentSchemas[i].parent_schemas[j]]
          )) as schemaId[];
          for (let k = 0; k < schemaIds.length; k++) {
            const targetSchema = childSchemasList.find(
              (v) => v.schema_id === schemaIds[k].schema_id
            );
            if (targetSchema) {
              targetSchema.child_schema_ids.push(parentSchemas[i].schema_id);
            } else {
              const newSchema: childSchemas = {
                schema_id: schemaIds[k].schema_id,
                child_schema_ids: [parentSchemas[i].schema_id],
              };
              childSchemasList.push(newSchema);
            }
          }
        }
      }
    }
  }

  type dbRow = {
    schema_id: number;
    schema_primary_id: number;
    schema_id_string: string;
    sub_s: string[];
    child_s: string[];
    default_sub_s: number[];
    default_child_s: number[];
  };
  type schemaId = { schema_id: number };

  // selectでDBに保存されている各スキーマのschema_id,schema_string_id,subschema,childschema一覧を取得
  const dbRows: dbRow[] = (await dbAccess.query(
    `SELECT schema_id, 
    schema_primary_id,
    schema_id_string, 
    document_schema->'jesgo:subschema' as sub_s, 
    document_schema->'jesgo:childschema' as child_s, 
    subschema_default as default_sub_s, 
    child_schema_default as default_child_s 
    FROM ${updateAll ? 'jesgo_document_schema' : 'view_latest_schema'} 
    WHERE schema_id <> 0`
  )) as dbRow[];

  let updateCount = 0;

  const candidateBaseSchemas = dbRows.slice(0);
  for (let i = 0; i < dbRows.length; i++) {
    const row: dbRow = dbRows[i];
    const subSchemaList: number[] = [];
    const childSchemaList: number[] = [];
    const inheritSchemaList: number[] = [];
    let baseSchemaId: number | undefined;
    // subschema
    if (row.sub_s != null) {
      for (let j = 0; j < row.sub_s.length; j++) {
        // ワイルドカードを含むかどうかで処理を分ける
        if (row.sub_s[j].includes('*')) {
          const splitedId = row.sub_s[j].split('*');
          const searchId =
            splitedId[0].endsWith('/') && splitedId[1] === ''
              ? `${splitedId[0]}/*`
              : `${splitedId[0]}[^/]*${splitedId[1]}$`;
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string ~ $1 AND schema_id <> 0',
            [searchId]
          )) as schemaId[];
          if (schemaIds.length > 0) {
            subSchemaList.push(...schemaIds.map((p) => p.schema_id));
          }
        } else {
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string = $1 AND schema_id <> 0',
            [row.sub_s[j]]
          )) as schemaId[];
          if (schemaIds.length > 0) {
            subSchemaList.push(schemaIds[0].schema_id);
          }
        }
      }
    }
    // child_schema
    if (row.child_s != null) {
      for (let k = 0; k < row.child_s.length; k++) {
        // ワイルドカードを含むかどうかで処理を分ける
        if (row.child_s[k].includes('*')) {
          const splitedId = row.child_s[k].split('*');
          const searchId =
            splitedId[0].endsWith('/') && splitedId[1] === ''
              ? `${splitedId[0]}/*`
              : `${splitedId[0]}[^/]*${splitedId[1]}$`;
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string ~ $1 AND schema_id <> 0',
            [searchId]
          )) as schemaId[];
          if (schemaIds.length > 0) {
            childSchemaList.push(...schemaIds.map((p) => p.schema_id));
          }
        } else {
          const schemaIds: schemaId[] = (await dbAccess.query(
            'SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string = $1 AND schema_id <> 0',
            [row.child_s[k]]
          )) as schemaId[];
          if (
            schemaIds.length > 0 &&
            subSchemaList.includes(schemaIds[0].schema_id) === false
          ) {
            childSchemaList.push(schemaIds[0].schema_id);
          }
        }
      }
    }

    // 自身を親に持つスキーマを子スキーマに追加
    const targetSchema = childSchemasList.find(
      (v) => v.schema_id === row.schema_id
    );
    if (targetSchema) {
      for (let i = 0; i < targetSchema.child_schema_ids.length; i++) {
        childSchemaList.push(targetSchema.child_schema_ids[i]);
      }
    }

    if (row.schema_id_string !== null) {
      // 自身より下層のschema_id_stringを持つスキーマを継承スキーマに追加
      const inheritSchemaIds: schemaId[] = (await dbAccess.query(
        `SELECT schema_id FROM view_latest_schema WHERE schema_id_string like '${row.schema_id_string}/%' AND schema_id <> 0`,
        []
      )) as schemaId[];
      for (let m = 0; m < inheritSchemaIds.length; m++) {
        inheritSchemaList.push(inheritSchemaIds[m].schema_id);
      }

      // 自身の基底スキーマを探す
      const baseSchema = candidateBaseSchemas
        // 文字列の短い順(よりパスの短い順)に整列
        .sort((a, b) => a.schema_id_string.length - b.schema_id_string.length)
        .find((schema) =>
          row.schema_id_string.startsWith(`${schema.schema_id_string}/`)
        );
      baseSchemaId = baseSchema?.schema_id;

      if (baseSchema) {
        // 自身が継承スキーマである場合、基底スキーマと自身の間のuniqueの設定が違う場合ログを残す(フロントにエラーは出さない)
        if (await hasInheritError(row.schema_id, baseSchema.schema_id)) {
          logging(
            LOGTYPE.ERROR,
            `継承スキーマ(id=${row.schema_id_string})、基底スキーマ(id=${baseSchema.schema_id_string})の間でunique設定が異なります`,
            'JsonToDatabase',
            'schemaListUpdate'
          );
        }
      }
    }

    // 子スキーマのリストから重複を削除
    // eslint-disable-next-line
    const newChildSchemaList = lodash
      .uniq(childSchemaList)
      .filter((id) => !subSchemaList.includes(id));

    let query = `UPDATE jesgo_document_schema SET 
      inherit_schema = '{${numArrayCast2Pg(inheritSchemaList)}}', 
      inherit_schema_default = '{${numArrayCast2Pg(inheritSchemaList)}}', 
      base_schema = ${undefined2Null(baseSchemaId)}`;

    if (!lodash.isEqual(subSchemaList, row.default_sub_s)) {
      query += `, subschema = '{${numArrayCast2Pg(subSchemaList)}}'
         , subschema_default = '{${numArrayCast2Pg(subSchemaList)}}'`;
    }

    if (!lodash.isEqual(newChildSchemaList, row.default_child_s)) {
      query += `, child_schema = '{${numArrayCast2Pg(newChildSchemaList)}}'
         , child_schema_default = '{${numArrayCast2Pg(newChildSchemaList)}}'`;
    }

    query += ' WHERE schema_primary_id = $1';

    updateCount += (await dbAccess.query(
      query,
      [row.schema_primary_id],
      'update'
    )) as number;
  }

  // スキーマの更新に合わせて検索用セレクトボックスも更新する
  await updateSearchColumn();

  // スキーマの更新に合わせてルートスキーマの内容も更新する
  await updateRootSchemaList();

  return updateCount;
};

/**
 * 新規登録されたスキーマIDをschema_primary_id=0のスキーマのsubschemaとsubschema_defaultに追加する
 * @param newSchemaId 新規登録されたスキーマID
 */
const addNewSchemaToRootSchema = async (newSchemaId: number) => {
  logging(LOGTYPE.DEBUG, `新規スキーマID ${newSchemaId} をルートスキーマに追加`, 'JsonToDatabase', 'addNewSchemaToRootSchema');
  
  try {
    // schema_primary_id=0のスキーマの現在のsubschemaとsubschema_defaultを取得
    const rootSchemaRows = (await dbAccess.query(
      'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    )) as { subschema: number[]; subschema_default: number[] }[];
    
    if (rootSchemaRows.length > 0) {
      const currentSubschema = rootSchemaRows[0].subschema || [];
      const currentSubschemaDefault = rootSchemaRows[0].subschema_default || [];
      
      // 新しいスキーマIDが既に含まれていない場合のみ追加
      if (!currentSubschema.includes(newSchemaId)) {
        const updatedSubschema = [...currentSubschema, newSchemaId];
        const updatedSubschemaDefault = [...currentSubschemaDefault, newSchemaId];
        
        await dbAccess.query(
          'UPDATE jesgo_document_schema SET subschema = $1, subschema_default = $2 WHERE schema_primary_id = 0',
          [updatedSubschema, updatedSubschemaDefault]
        );
        
        logging(LOGTYPE.DEBUG, `ルートスキーマのsubschemaにスキーマID ${newSchemaId} を追加しました`, 'JsonToDatabase', 'addNewSchemaToRootSchema');
      } else {
        logging(LOGTYPE.DEBUG, `スキーマID ${newSchemaId} は既にルートスキーマのsubschemaに含まれています`, 'JsonToDatabase', 'addNewSchemaToRootSchema');
      }
    } else {
      logging(LOGTYPE.WARN, `schema_primary_id=0のスキーマが見つかりません`, 'JsonToDatabase', 'addNewSchemaToRootSchema');
    }
  } catch (error) {
    logging(LOGTYPE.ERROR, `ルートスキーマへのスキーマID追加でエラーが発生しました: ${error}`, 'JsonToDatabase', 'addNewSchemaToRootSchema');
  }
};

const updateRootSchemaList = async () => {
  const dbRows = (await dbAccess.query(
    `SELECT ARRAY_AGG(DISTINCT(schema_id)) as root_ids FROM view_latest_schema WHERE document_schema->>'jesgo:parentschema' like '%"/"%';`
  )) as { root_ids: number[] }[];
  const rootSchemaIdArray = dbRows[0].root_ids;
  const oldDbRows = (await dbAccess.query(
    'SELECT subschema_default FROM jesgo_document_schema WHERE schema_id = 0'
  )) as { subschema_default: number[] }[];
  const oldRootSchemaIdArray = oldDbRows[0].subschema_default;

  // 破壊的ソートを行う前にアップデート用の変数を用意しておく
  const newRootIds = numArrayCast2Pg(rootSchemaIdArray);

  // 現在DBに保存されているルートスキーマのサブスキーマ初期設定が、最新の物と等しいかを確認する
  if (!lodash.isEqual(rootSchemaIdArray.sort(), oldRootSchemaIdArray.sort())) {
    // 等しくなければ情報を更新する
    await dbAccess.query(
      `UPDATE jesgo_document_schema SET subschema = '{${newRootIds}}', subschema_default = '{${newRootIds}}' WHERE schema_id = 0`
    );
  }
};

/** JSONSchema7のkeyと値を全て取得 */
export const getItemsAndNames = (item: JSONSchema7) => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'getItemsAndNames');
  if (item === null) return { pItems: {}, pNames: [] } as schemaItem;
  const result: schemaItem = {
    pItems: item as { [key: string]: JSONSchema7Definition },
    pNames: Object.keys(item),
  };
  return result;
};

/** JSONSchema7のpropertiesのkeyと値を全て取得 */
export const getPropItemsAndNames = (item: JSONSchema7) => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'getPropItemsAndNames');
  if (item.properties == null) return { pItems: {}, pNames: [] } as schemaItem;
  const result: schemaItem = {
    pItems: item.properties ?? {},
    pNames: Object.keys(item.properties) ?? [],
  };
  return result;
};

/** JSONSchema7の「thenの中の」propertiesのkeyと値を全て取得 */
export const getThenPropItemsAndNames = (item: JSONSchema7) => {
  logging(
    LOGTYPE.DEBUG,
    `呼び出し`,
    'JsonToDatabase',
    'getThenPropItemsAndNames'
  );
  if (item.then == null) return { pItems: {}, pNames: [] } as schemaItem;
  const pItems = (item.then as JSONSchema7).properties ?? {};
  const result: schemaItem = {
    pItems: pItems,
    pNames: Object.keys(pItems) ?? [],
  };
  return result;
};

/**
 * アップロードされたスキーマから検索用のセレクトボックスデータをDBに更新する
 */
export const updateSearchColumn = async (): Promise<void> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'updateSearchColumn');
  type dbRow = {
    document_schema: JSONSchema7;
  };

  const majorCancers: string[] = [];
  const minorCancers: string[] = [];

  const dbRows: dbRow[] = (await dbAccess.query(
    `SELECT document_schema 
    FROM view_latest_schema 
    WHERE document_schema->>'properties' like '%${escapeText(
      `"${Const.JESGO_TAG.CANCER_MAJOR}"`
    )}%' 
    OR document_schema->>'properties' like '%${escapeText(
      `"${Const.JESGO_TAG.CANCER_MINOR}"`
    )}%' 
    AND schema_id <> 0 
    ORDER BY schema_id_string;`
  )) as dbRow[];

  for (let index = 0; index < dbRows.length; index++) {
    const dbRow = dbRows[index];
    const schema = dbRow.document_schema;
    const schemaItems = getPropItemsAndNames(schema);

    for (let i = 0; i < schemaItems.pNames.length; i++) {
      const prop = schemaItems.pItems[schemaItems.pNames[i]] as JSONSchema7;
      if (
        prop['jesgo:tag'] &&
        (prop['jesgo:tag'] == Const.JESGO_TAG.CANCER_MAJOR ||
          prop['jesgo:tag'] == Const.JESGO_TAG.CANCER_MINOR)
      ) {
        const target =
          prop['jesgo:tag'] == Const.JESGO_TAG.CANCER_MAJOR
            ? majorCancers
            : minorCancers;
        if (prop['default']) {
          target.push(prop['default'] as string);
        } else if (prop['const']) {
          target.push(prop['const'] as string);
        } else if (prop['enum']) {
          for (let j = 0; j < prop['enum'].length; j++) {
            target.push(prop['enum'][j] as string);
          }
        }
      }
    }
  }

  const cancerList = majorCancers.concat(minorCancers);

  // 現在のリストを取得
  const searchColumnResult = (await dbAccess.query(
    `SELECT column_name FROM jesgo_search_column ORDER BY column_id`
  )) as { column_name: string }[];
  const searchColumnList = searchColumnResult.map((p) => p.column_name);

  // 現在のリストとスキーマから生成したリストが異なれば更新する
  if (JSON.stringify(searchColumnList) !== JSON.stringify(cancerList)) {
    await dbAccess.query(
      "DELETE FROM jesgo_search_column WHERE column_type = 'cancer_type'",
      undefined,
      'update'
    );

    for (let i = 0; i < cancerList.length; i++) {
      await dbAccess.query(
        "INSERT INTO jesgo_search_column VALUES ($1, 'cancer_type', $2)",
        [i + 1, cancerList[i]]
      );
    }
  }
};

export const jsonToSchema = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'jsonToSchema');
  const dirPath = './backendapp/import';

  const fileList = listFilesRecursive(dirPath);
  try {
    await dbAccess.connectWithConf();
    await dbAccess.query('BEGIN');

    await fileListInsert(fileList, [], dirPath);

    await schemaListUpdate();

    await dbAccess.query('COMMIT');
    return { statusNum: RESULT.NORMAL_TERMINATION, body: null };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `${(e as Error).message}`,
      'JsonToDatabase',
      'jsonToSchema'
    );
    await dbAccess.query('ROLLBACK');
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  } finally {
    await dbAccess.end();
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadZipFile = async (data: any): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'JsonToDatabase', 'uploadZipFile');
  // 一時展開用パス
  // eslint-disable-next-line
  const dirPath = `./tmp/${UUID.generate()}`;
  // eslint-disable-next-line
  const filePath: string = data.path;
  const errorMessages: string[] = [];
  // eslint-disable-next-line
  const fileType: string = path.extname(data.originalname).toLowerCase();
  try {
    switch (fileType) {
      case '.zip':
        await Open.file(filePath).then((dir) =>
          dir.extract({path: dirPath})
        );
        break;
      case '.json':
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        // eslint-disable-next-line
        fs.copyFileSync(filePath, path.join(dirPath, data.originalname));
        break;
      default:
        throw new Error('.zipファイルか.jsonファイルを指定してください.');
    }

    let fileList: string[] = [];
    try {
      fileList = listFilesRecursive(dirPath);
    } catch {
      logging(
        LOGTYPE.ERROR,
        `展開に失敗したか、ファイルの内容がありません。`,
        'JsonToDatabase',
        'uploadZipFile'
      );
      return {
        statusNum: RESULT.ABNORMAL_TERMINATION,
        body: {
          number: 0,
          message: ['展開に失敗したか、ファイルの内容がありません。'],
        },
      };
    }

    await dbAccess.connectWithConf();

    const result = await fileListInsert(fileList, errorMessages, dirPath);

    // スキーマが1件以上新規登録、更新された場合のみ関係性のアップデートを行う
    if (result.updateNum > 0) {
      await schemaListUpdate(result.isSchemaAllUpdate);
    }

    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: { number: result.updateNum, message: errorMessages },
    };
  } catch (e) {
    if (dbAccess.connected) {
      await dbAccess.query('ROLLBACK');
    }
    if ((e as Error).message.length > 0) {
      logging(
        LOGTYPE.ERROR,
        (e as Error).message,
        'JsonToDatabase',
        'uploadZipFile'
      );
    }
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: { number: 0, message: errorMessages },
    };
  } finally {
    await dbAccess.end();
    try {
      // ファイルをリネームして保管
      const date = formatDate(new Date()) + formatTime(new Date());
      const migratePath = `uploads/${date}${fileType}`;
      rename(filePath, migratePath, (err) => {
        if (err) {
          logging(
            LOGTYPE.ERROR,
            `エラー発生 ${err.message}`,
            'JsonToDatabase',
            'uploadZipFile'
          );
        }
        logging(
          LOGTYPE.DEBUG,
          `リネーム完了`,
          'JsonToDatabase',
          'uploadZipFile'
        );
      });
    } catch {
      logging(
        LOGTYPE.ERROR,
        `リネーム対象無し`,
        'JsonToDatabase',
        'uploadZipFile'
      );
    }

    // 展開したファイルを削除
    // eslint-disable-next-line
    fse.remove(path.join(dirPath, path.sep), (err) => {
      if (err) {
        logging(
          LOGTYPE.ERROR,
          `エラー発生 ${err.message}`,
          'JsonToDatabase',
          'uploadZipFile'
        );
      }
      logging(
        LOGTYPE.DEBUG,
        `展開したファイルを削除完了`,
        'JsonToDatabase',
        'uploadZipFile'
      );
    });
  }
};

/**
 * subschema、child_schemaのみ更新
 * @returns
 */
export const repairChildSchema = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'JsonToDatabase', 'repairChildSchema');

  try {
    await dbAccess.connectWithConf();
    await dbAccess.query('BEGIN');

    const count = await schemaListUpdate(true);

    await dbAccess.query('COMMIT');
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: `subschema、child_schemaの更新に成功しました。(${
        count ?? ''
      }件の更新)`,
    };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `${(e as Error).message}`,
      'JsonToDatabase',
      'repairChildSchema'
    );
    await dbAccess.query('ROLLBACK');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: 'subschema、child_schemaの更新に失敗しました',
      error: (e as Error).message,
    };
  } finally {
    await dbAccess.end();
  }
};
