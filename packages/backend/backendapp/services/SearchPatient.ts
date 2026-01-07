import { DbAccess } from '../logic/DbAccess';
import { ParsedQs } from 'qs';
import { ApiReturnObject, RESULT } from '../logic/ApiCommon';
import { logging, LOGTYPE } from '../logic/Logger';
import { Const, isAgoYearFromNow, jesgo_tagging } from '../logic/Utility';
import { getItemsAndNames, JSONSchema7 } from './JsonToDatabase';
import { error } from 'console';
import {
  addStatus,
  addStatusAllowDuplicate,
  FIXED_FIELD_NAMES,
  STATUS_STRINGS,
  DISPLAY_STRINGS,
  SEPARATORS,
  getValueFromPath,
  USER_DATA_PROPERTIES,
} from '@jesgo/common';

//インターフェース
export interface dbRow {
  his_id: string;
  name: string;
  age: number;
  death_age: number;
  schemaidstring: string;
  last_updated: string;
  child_documents: number[];
  document_id: number;
  document: JSON;
  document_schema: JSONSchema7;
  case_id: number;
  deleted: boolean;
  date_of_death: string;
  registration: string;
  decline: boolean;
  event_date: Date | null;
}

export interface searchColumns {
  column_id: number;
  column_name: string;
}

interface userData {
  caseId: number;
  patientId: string;
  patientName: string;
  age: number;
  registedCancerGroup: string;
  since: string | null;
  startDate: string | null;
  eventDate: (Date | null)[];
  lastUpdate: string;
  diagnosis: string;
  diagnosisMajor: string;
  diagnosisMinor: string;
  advancedStage: string;
  pathlogicalDiagnosis: string;
  initialTreatment: string[];
  complications: string[];
  progress: string[];
  postRelapseTreatment: string[];
  registration: string[];
  registrationNumber: string[];
  threeYearPrognosis: string[];
  fiveYearPrognosis: string[];
  status: string[];
}

export interface searchPatientRequest extends ParsedQs {
  initialTreatmentDate: string;
  cancerType: string;
  showOnlyTumorRegistry: string;
  diagnosisDate: string;
  eventDateType: string;
  eventDate: string;
  checkOfDiagnosisDate: string;
  checkOfBlankFields: string;
  advancedStage: string;
  pathlogicalDiagnosis: string;
  initialTreatment: string;
  complications: string;
  threeYearPrognosis: string;
  fiveYearPrognosis: string;
  showProgressAndRecurrence: string;
  // ページング、ソート、表示件数のパラメータ
  page?: string;
  pageSize?: string;
  sortColumn?: string;
  sortDirection?: string;
  // プリセット項目の絞り込み条件（クエリパラメータ用：文字列、POSTリクエストボディ用：配列）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presetFilters?: any;
}

// POSTリクエストボディ用のインターフェース
export interface searchPatientRequestBody {
  // 既存の検索条件（クエリパラメータから取得）
  initialTreatmentDate?: string;
  cancerType?: string;
  showOnlyTumorRegistry?: string;
  diagnosisDate?: string;
  eventDateType?: string;
  eventDate?: string;
  checkOfDiagnosisDate?: string;
  checkOfBlankFields?: string;
  advancedStage?: string;
  pathlogicalDiagnosis?: string;
  initialTreatment?: string;
  complications?: string;
  threeYearPrognosis?: string;
  fiveYearPrognosis?: string;
  showProgressAndRecurrence?: string;
  // ページング、ソート、表示件数のパラメータ
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: string;
  // プリセット項目の絞り込み条件（リクエストボディから取得）
  presetFilters?: Array<{
    field_id: number;
    field_name: string;
    field_path?: string;
    field_type: string;
    value: string;
  }>;
}

// addStatus と addStatusAllowDuplicate は @jesgo/common からインポート

/**
 * 日付検索用文字列をDateに変換
 * @param dateList
 * @returns
 */
const convertSearchDateRange = (dateList: string[]) => {
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (!dateList[0] && !dateList[1]) return { fromDate, toDate };

  let fromDateSplited: string[] = [];
  if (dateList.length > 0) {
    // blank or dateFormatString
    if (dateList[0]) {
      // 日付の形式：yyyy-M-d
      const fromDateArray = [1, 0, 1];
      fromDateSplited = dateList[0].split('-');
      fromDateArray[0] = fromDateSplited[0] ? Number(fromDateSplited[0]) : 1;
      fromDateArray[1] = fromDateSplited[1]
        ? Number(fromDateSplited[1]) - 1
        : 0;
      fromDateArray[2] = fromDateSplited[2] ? Number(fromDateSplited[2]) : 1;
      fromDate = new Date(1900, fromDateArray[1], fromDateArray[2]);
      fromDate.setFullYear(fromDateArray[0]);
    }
    // 2件以上あれば範囲検索
    const toDateArray: (number | undefined)[] = [
      undefined,
      undefined,
      undefined,
    ];
    if (dateList.length > 1) {
      const toDateSplited = dateList[1].split('-');
      toDateArray[0] = toDateSplited[0] ? Number(toDateSplited[0]) : 9999; // 未指定の場合は9999年
      toDateArray[1] = toDateSplited[1] ? Number(toDateSplited[1]) - 1 : 11; // 未指定の場合は12月を設定
      if (toDateSplited[2]) {
        toDateArray[2] = Number(toDateSplited[2]);
      } else {
        // 未指定の場合は月末を設定。翌月の0日と指定すると月末が取れる
        toDateArray[1] += 1;
        toDateArray[2] = 0;
      }
      if (!fromDate) {
        fromDate = new Date(1, 0, 1); //fromがない場合は0001/01/01
        fromDate.setFullYear(1);
      }
    } else if (fromDate) {
      // 単一検索の場合、fromの値からToを作る
      // 年
      toDateArray[0] = fromDateSplited[0] ? Number(fromDateSplited[0]) : 1;
      // 月
      toDateArray[1] = fromDateSplited[1] ? Number(fromDateSplited[1]) - 1 : 11; // 月がない場合は年単位なので12月指定
      // 日
      if (fromDateSplited[2]) {
        toDateArray[2] = Number(fromDateSplited[2]);
      } else {
        // 未指定の場合は月末を設定。翌月の0日と指定すると月末が取れる
        toDateArray[1] += 1;
        toDateArray[2] = 0;
      }
    }
    if (toDateArray.every((p) => p !== undefined)) {
      toDate = new Date(1900, toDateArray[1]!, toDateArray[2]);
      toDate.setFullYear(toDateArray[0]!);
    }

    const offset = new Date().getTimezoneOffset() * 60 * 1000;
    if (fromDate) {
      fromDate = new Date(fromDate.getTime() - offset);
    }
    if (toDate) {
      toDate = new Date(toDate.getTime() - offset);
    }
  }
  return { fromDate, toDate };
};

/**
 * ソート用の値取得と型判定
 * @param value ソート対象の値
 * @returns ソート可能な値（数値、文字列）
 */
const getSortableValue = (value: unknown): number | string => {
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
const compareValues = (a: unknown, b: unknown, ascending: boolean): number => {
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

/**
 *
 * @param tagName 取得対象のjesgo:tagの内容
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPropertyNameFromTag = (
  tagName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any,
  schema: JSONSchema7
): string | null => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'SearchPatient', 'getPropertyNameFromTag');

  const schemaItems = getItemsAndNames(schema);
  let retText = null;
  for (let i = 0; i < schemaItems.pNames.length; i++) {
    const prop = schemaItems.pItems[schemaItems.pNames[i]] as JSONSchema7;
    // 該当プロパティがオブジェクトの場合、タグが付いてるかを確認
    if (typeof prop === 'object') {
      // タグが付いていれば値を取得する
      if (prop['jesgo:tag'] && prop['jesgo:tag'] == tagName) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const tempText = document[schemaItems.pNames[i]] as string | null;
        if (tempText && tempText !== '') {
          retText = tempText;
        }
      }
      // タグがなければ中を再帰的に見に行く
      else {
        // ドキュメントが入れ子になっている場合、現在見ているプロパティネームの下にオブジェクトが存在すればそちらを新たなオブジェクトとして渡す
        // eslint-disable-next-line
        const newDocument = document[schemaItems.pNames[i]]
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            document[schemaItems.pNames[i]]
          : document;
        const ret = getPropertyNameFromTag(tagName, newDocument, prop);
        if (ret !== null) {
          retText = ret;
        }
      }
    }
    // オブジェクトでなければ中を見る必要無し
  }
  return retText;
};

// getValueFromPath は @jesgo/common からインポート
// バックエンドでは extractValue: false を指定して、元の値をそのまま返す

// POSTリクエストボディからクエリパラメータ形式に変換
const convertRequestBodyToQuery = (body: searchPatientRequestBody): searchPatientRequest => {
  const query: searchPatientRequest = {
    initialTreatmentDate: body.initialTreatmentDate || '',
    cancerType: body.cancerType || '',
    showOnlyTumorRegistry: body.showOnlyTumorRegistry || '',
    diagnosisDate: body.diagnosisDate || '',
    eventDateType: body.eventDateType || '',
    eventDate: body.eventDate || '',
    checkOfDiagnosisDate: body.checkOfDiagnosisDate || '',
    checkOfBlankFields: body.checkOfBlankFields || '',
    advancedStage: body.advancedStage || '',
    pathlogicalDiagnosis: body.pathlogicalDiagnosis || '',
    initialTreatment: body.initialTreatment || '',
    complications: body.complications || '',
    threeYearPrognosis: body.threeYearPrognosis || '',
    fiveYearPrognosis: body.fiveYearPrognosis || '',
    showProgressAndRecurrence: body.showProgressAndRecurrence || '',
    page: body.page?.toString() || undefined,
    pageSize: body.pageSize?.toString() || undefined,
    sortColumn: body.sortColumn || undefined,
    sortDirection: body.sortDirection || undefined,
    presetFilters: body.presetFilters ? JSON.stringify(body.presetFilters) : undefined,
  };
  return query;
};

export const searchPatients = async (
  query: searchPatientRequest
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'SearchPatient', 'searchPatients');
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  const dbRows: dbRow[] = (await dbAccess.query(
    `SELECT 
    HIS_id, name, DATE_PART('year', AGE(now(),date_of_birth)) as age, 
    DATE_PART('year', AGE(date_of_death, date_of_birth)) as death_age, 
    sch.schema_id_string as schemaidstring, 
    date_of_death, decline, 
    to_char(ca.last_updated, 'yyyy/mm/dd') as last_updated, 
    doc.document as document,  document_schema, 
    doc.child_documents, doc.document_id as document_id, ca.case_id as case_id, doc.deleted as deleted,  
    doc.event_date
    FROM jesgo_document doc JOIN view_latest_schema sch ON doc.schema_id = sch.schema_id RIGHT OUTER JOIN jesgo_case ca ON ca.case_id = doc.case_id
    WHERE ca.deleted = false 
    ORDER BY ca.case_id , sch.schema_id_string;`
  )) as dbRow[];

  // がん種検索用のリストを取得しておく
  const cancerSearchColumns = (await dbAccess.query(
    "SELECT column_id, column_name FROM jesgo_search_column WHERE column_type = 'cancer_type' ORDER BY column_id"
  )) as searchColumns[];

  await dbAccess.end();

  const dateOffset = new Date().getTimezoneOffset() * 60 * 1000;

  let recurrenceChildDocumentIds: number[] = [];

  // 1回目のループで再発情報が乗っている行を探す
  for (let index = 0; index < dbRows.length; index++) {
    const dbRow: dbRow = dbRows[index];
    if (
      JSON.stringify(dbRow.document_schema).includes(
        jesgo_tagging(Const.JESGO_TAG.RECURRENCE)
      )
    ) {
      recurrenceChildDocumentIds = dbRow.child_documents;
      break;
    }
  }
  // 2回目のループでuserData形式へのコンバートを行う
  const userDataList: userData[] = [];
  const caseIdList: number[] = [];
  for (let index = 0; index < dbRows.length; index++) {
    const dbRow: dbRow = dbRows[index];
    const document = JSON.stringify(dbRow.document);
    const docSchema = JSON.stringify(dbRow.document_schema);
    const caseId: number = dbRow.case_id;
    let rowIndex = caseIdList.indexOf(caseId);
    let userData: userData;

    // 腫瘍登録対象チェック: 登録拒否
    if (query.showOnlyTumorRegistry === 'true' && dbRow.decline) continue;

    // 該当レコードのcaseIdが既に記録されてるか確認
    if (rowIndex != -1) {
      // 存在している場合、userDataListの同じ添え字にアクセス
      userData = userDataList[rowIndex];
    } else {
      // 存在しない場合は新規に作成、caseIdListにも記録する
      caseIdList.push(caseId);
      userData = {
        caseId: caseId,
        patientId: dbRow.his_id,
        patientName: dbRow.name,
        age: dbRow.date_of_death !== null ? dbRow.death_age : dbRow.age,
        registedCancerGroup: '',
        since: null,
        startDate: null,
        eventDate: [],
        lastUpdate: dbRow.last_updated,
        diagnosis: '',
        diagnosisMajor: '',
        diagnosisMinor: '',
        advancedStage: '',
        pathlogicalDiagnosis: '',
        initialTreatment: [],
        complications: [],
        progress: [],
        postRelapseTreatment: [],
        registration: [],
        registrationNumber: [],
        threeYearPrognosis: [],
        fiveYearPrognosis: [],
        status: [],
      };
      rowIndex = userDataList.push(userData);

      // caseの情報を取得するのは初回のみ
      // 死亡日が設定されている場合死亡ステータスを追加
      if (dbRow.date_of_death !== null) {
        userData.status.push(STATUS_STRINGS.DEATH);
      }

      // 登録拒否が設定されている場合、拒否を追加
      if (dbRow.decline) {
        userData.registration.push(STATUS_STRINGS.DECLINE);
      }
    }

    // 削除されているドキュメントの場合、ステータス系の更新は行わない
    if (dbRow.deleted) {
      continue;
    }
    jesgo_tagging(Const.JESGO_TAG.CANCER_MAJOR);
    // 主要がん種系
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.CANCER_MAJOR))) {
      const cancerType =
        getPropertyNameFromTag(
          Const.JESGO_TAG.CANCER_MAJOR,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      userData.diagnosisMajor = addStatus(
        userData.diagnosisMajor,
        cancerType,
        SEPARATORS.DIAGNOSIS
      );

      userData.registedCancerGroup = addStatus(
        userData.registedCancerGroup,
        cancerType,
        SEPARATORS.DIAGNOSIS
      );
    }

    // その他がん種系
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.CANCER_MINOR))) {
      const cancerType =
        getPropertyNameFromTag(
          Const.JESGO_TAG.CANCER_MINOR,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      userData.diagnosisMinor = addStatus(
        userData.diagnosisMinor,
        cancerType,
        SEPARATORS.DIAGNOSIS
      );

      userData.registedCancerGroup = addStatus(
        userData.registedCancerGroup,
        cancerType,
        SEPARATORS.DIAGNOSIS
      );
    }

    // 診断日
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.DIAGNOSIS_DATE))) {
      const since =
        getPropertyNameFromTag(
          Const.JESGO_TAG.DIAGNOSIS_DATE,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      // 日付変換に失敗する値の場合は無視する
      if (!isNaN(new Date(since).getFullYear())) {
        // 診断日がもともと記録されていないか、もっと古いものであれば書き換える
        if (!userData.since || (since !== '' && userData.since > since)) {
          userData.since = since;
        }
      }
    }

    // 初回治療日
    if (
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.INITIAL_TREATMENT_DATE))
    ) {
      const startDate =
        getPropertyNameFromTag(
          Const.JESGO_TAG.INITIAL_TREATMENT_DATE,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      // 日付変換に失敗する値の場合は無視する
      if (!isNaN(new Date(startDate).getFullYear())) {
        // 初回治療日がもともと記録されていないか、もっと古いものであれば書き換える
        if (
          !userData.startDate ||
          (startDate !== '' && userData.startDate > startDate)
        ) {
          userData.startDate = startDate;
        }
      }
    }

    // 治療法系
    if (
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_SURGERY)) ||
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_CHEMO)) ||
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_RADIO)) ||
      docSchema.includes(
        jesgo_tagging(Const.JESGO_TAG.TREATMENT_SUPPORTIVECARE)
      )
    ) {
      const iconTag: string[] = [];

      // 手術療法
      if (
        docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_SURGERY))
      ) {
        const tag =
          getPropertyNameFromTag(
            Const.JESGO_TAG.TREATMENT_SURGERY,
            dbRow.document,
            dbRow.document_schema
          ) ?? '';
        if (tag !== '') {
          iconTag.push(STATUS_STRINGS.SURGERY);

          // 合併症の有無
          if (
            docSchema.includes(
              jesgo_tagging(Const.JESGO_TAG.SURGIGAL_COMPLICATIONS)
            )
          ) {
            const subTag =
              getPropertyNameFromTag(
                Const.JESGO_TAG.SURGIGAL_COMPLICATIONS,
                dbRow.document,
                dbRow.document_schema
              ) ?? '';
            if (subTag === '') {
              // 未入力時
              userData.complications.push(STATUS_STRINGS.NO_INPUT);
            } else if (subTag !== 'なし') {
              // ありの場合はアイコン表示
              iconTag.push(STATUS_STRINGS.COMPLICATIONS);
            }
          }
        }
      } else if (
        // 化学療法(薬物療法)
        docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_CHEMO))
      ) {
        const tag =
          getPropertyNameFromTag(
            Const.JESGO_TAG.TREATMENT_CHEMO,
            dbRow.document,
            dbRow.document_schema
          ) ?? '';
        if (tag !== '') {
          iconTag.push(STATUS_STRINGS.CHEMO);
        }
      } else if (
        docSchema.includes(jesgo_tagging(Const.JESGO_TAG.TREATMENT_RADIO))
      ) {
        const tag =
          getPropertyNameFromTag(
            Const.JESGO_TAG.TREATMENT_RADIO,
            dbRow.document,
            dbRow.document_schema
          ) ?? '';
        if (tag !== '') {
          iconTag.push(STATUS_STRINGS.RADIO);
        }
      } else if (
        docSchema.includes(
          jesgo_tagging(Const.JESGO_TAG.TREATMENT_SUPPORTIVECARE)
        )
      ) {
        const tag =
          getPropertyNameFromTag(
            Const.JESGO_TAG.TREATMENT_SUPPORTIVECARE,
            dbRow.document,
            dbRow.document_schema
          ) ?? '';
        if (tag !== '') {
          iconTag.push(STATUS_STRINGS.SUPPORTIVECARE);
        }
      }

      if (iconTag.length > 0) {
        // 再発系の場合
        if (recurrenceChildDocumentIds.includes(dbRow.document_id)) {
          userData.postRelapseTreatment.push(...iconTag);
        }
        // 初回治療の場合
        else {
          userData.initialTreatment.push(...iconTag);
        }

        // どちらでもステータスに入れる
        userData.status.push(...iconTag);
      }
    }

    // 進行期
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.FIGO))) {
      const tempFigo =
        getPropertyNameFromTag(
          Const.JESGO_TAG.FIGO,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      const figo = tempFigo && tempFigo !== '' ? tempFigo : DISPLAY_STRINGS.NOT_ENTERED;

      userData.advancedStage = addStatusAllowDuplicate(
        userData.advancedStage,
        figo,
        SEPARATORS.STAGE
      );
    }

    // 再発
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.RECURRENCE))) {
      userData.status.push(STATUS_STRINGS.RECURRENCE);
    }

    // エラー有無(ここのみスキーマではなくドキュメントを見る)
    if (document.includes('jesgo:error')) {
      const errorProperty = (dbRow.document as any)['jesgo:error'];
      if (Array.isArray(errorProperty) && errorProperty.filter(item => item != null).length > 0) {
        // エラー項目がある場合はhas_errorを追加
        userData.registration.push(STATUS_STRINGS.HAS_ERROR);
      }
    } 

    // 腫瘍登録番号登録有無
    if (docSchema.includes(jesgo_tagging(Const.JESGO_TAG.REGISTRABILITY))) {
      const registrability =
        getPropertyNameFromTag(
          Const.JESGO_TAG.REGISTRABILITY,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      if (registrability && registrability === 'はい') {
        // 登録対象症例の値が はい であれば腫瘍登録番号を見る
        if (
          docSchema.includes(jesgo_tagging(Const.JESGO_TAG.REGISTRATION_NUMBER))
        ) {
          // 同じドキュメント内にある腫瘍登録番号が記載されていれば完了を、記載がなければ未完了とする
          const registrationNumber =
            getPropertyNameFromTag(
              Const.JESGO_TAG.REGISTRATION_NUMBER,
              dbRow.document,
              dbRow.document_schema
            ) ?? '';
          if (registrationNumber !== null && registrationNumber !== '') {
            userData.registration.push(STATUS_STRINGS.COMPLETED);
            userData.registrationNumber.push(registrationNumber);
          } else {
            userData.registration.push(STATUS_STRINGS.NOT_COMPLETED);
          }
        } else {
          // 同じドキュメント内に腫瘍登録番号そのものが記載されていなくても未入力扱いにする
          userData.registration.push(STATUS_STRINGS.NOT_COMPLETED);
        }
      }
    }

    // 3年予後と5年予後は該当ドキュメントがあれば値を登録、該当年数がたっていなければ後から値を削除する
    // 3年予後
    if (
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.THREE_YEAR_PROGNOSIS))
    ) {
      const threeYearPrognosis =
        getPropertyNameFromTag(
          Const.JESGO_TAG.THREE_YEAR_PROGNOSIS,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      if (threeYearPrognosis !== null && threeYearPrognosis !== '') {
        userData.threeYearPrognosis.push(STATUS_STRINGS.COMPLETED);
      } else {
        userData.threeYearPrognosis.push(STATUS_STRINGS.NOT_COMPLETED);
      }
    }

    // 5年予後
    if (
      docSchema.includes(jesgo_tagging(Const.JESGO_TAG.FIVE_YEAR_PROGNOSIS))
    ) {
      const fiveYearPrognosis =
        getPropertyNameFromTag(
          Const.JESGO_TAG.FIVE_YEAR_PROGNOSIS,
          dbRow.document,
          dbRow.document_schema
        ) ?? '';
      if (fiveYearPrognosis !== null && fiveYearPrognosis !== '') {
        userData.fiveYearPrognosis.push(STATUS_STRINGS.COMPLETED);
      } else {
        userData.fiveYearPrognosis.push(STATUS_STRINGS.NOT_COMPLETED);
      }
    }

    // イベント日
    if (dbRow.event_date) {
      userData.eventDate.push(dbRow.event_date);
    }
  }

  // がん種結合
  for (let index = 0; index < userDataList.length; index++) {
    const userData = userDataList[index];
    userData.diagnosis = addStatus(
      userData.diagnosisMajor,
      userData.diagnosisMinor,
      SEPARATORS.DIAGNOSIS
    );
  }

  // 未入力埋め、整形
  for (let index = 0; index < userDataList.length; index++) {
    const userData = userDataList[index];
    const regex = new RegExp(/^[未・]*$/);

    // 進行期
    if (userData.advancedStage === '' || regex.test(userData.advancedStage)) {
      userData.advancedStage = DISPLAY_STRINGS.NOT_ENTERED;
    }

    // 診断日
    if (userData.diagnosis === '') {
      userData.diagnosis = DISPLAY_STRINGS.NOT_ENTERED;
    }

    // 登録
    if (userData.registration.length > 0) {
      let hasError = false;
      // has_errorがある場合は一旦退避
      if (userData.registration.indexOf(STATUS_STRINGS.HAS_ERROR) !== -1) {
        hasError = true;
        userData.registration = userData.registration.filter(
          (p) => p !== STATUS_STRINGS.HAS_ERROR
        );
      }

      // has_errorを削除しても配列に要素があるかを確認
      if (userData.registration.length > 0) {
        // 1つ以上の値がある場合は、「拒否」、「未」、「済」の優先順で一番優先された物を値とする
        const orderRule: string[] = [STATUS_STRINGS.DECLINE, STATUS_STRINGS.NOT_COMPLETED, STATUS_STRINGS.COMPLETED];
        userData.registration = [
          userData.registration.sort(
            (a, b) => orderRule.indexOf(a) - orderRule.indexOf(b)
          )[0],
        ];
      }

      // もともとhas_errorがあった場合は配列に再追加する
      if (hasError) {
        userData.registration.push(STATUS_STRINGS.HAS_ERROR);
      }
    }
    // 値がない場合は何も表示しない

    // 3年予後、5年予後
    if (userData.startDate == null) {
      // 初回治療日が指定されていない場合は3年予後、5年予後とも未指定とする
      userData.threeYearPrognosis = [];
      userData.fiveYearPrognosis = [];
    } else {
      // 3年予後
      if (!isAgoYearFromNow(new Date(userData.startDate), 3)) {
        // 3年たっていなければ未指定とする
        userData.threeYearPrognosis = [];
      } else {
        // 3年たってれば「未」＞「済」の優先順で一番優先された物を価とする
        const orderRule: string[] = [STATUS_STRINGS.NOT_COMPLETED, STATUS_STRINGS.COMPLETED];
        userData.threeYearPrognosis = [
          userData.threeYearPrognosis.sort(
            (a, b) => orderRule.indexOf(a) - orderRule.indexOf(b)
          )[0],
        ];
      }

      // 5年予後
      if (!isAgoYearFromNow(new Date(userData.startDate), 5)) {
        // 5年たっていなければ未指定とする(たっていればそのまま)
        userData.fiveYearPrognosis = [];
      } else {
        // 5年たってれば「未」＞「済」の優先順で一番優先された物を価とする
        const orderRule: string[] = [STATUS_STRINGS.NOT_COMPLETED, STATUS_STRINGS.COMPLETED];
        userData.fiveYearPrognosis = [
          userData.fiveYearPrognosis.sort(
            (a, b) => orderRule.indexOf(a) - orderRule.indexOf(b)
          )[0],
        ];
      }
    }
  }

  // 腫瘍登録対象チェック: 登録対象症例
  if (query.showOnlyTumorRegistry === 'true') {
    for (let index = 0; index < userDataList.length; index++) {
      const userData = userDataList[index];
      if (!userData.registration.some(registration =>
          registration === STATUS_STRINGS.NOT_COMPLETED ||
          registration === STATUS_STRINGS.COMPLETED)) {
        userDataList.splice(index, 1);
        index--;
        continue;
      }
    }
  }

  // 初回治療開始日での絞り込み
  if (query.initialTreatmentDate) {
    const dateList = convertSearchDateRange(
      JSON.parse(query.initialTreatmentDate) as string[]
    );

    if (dateList.fromDate || dateList.toDate) {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.startDate == null) {
          userDataList.splice(index, 1);
          index--;
          continue;
        } else {
          const startDate: Date = new Date(userData.startDate);
          // 範囲外のものを除外
          if (dateList.fromDate! > startDate || startDate > dateList.toDate!) {
            userDataList.splice(index, 1);
            index--;
            continue;
          }
        }
      }
    }
  }

  // がん種別指定がある場合、指定がん種を含まないものを配列から削除する
  if (query.cancerType && query.cancerType != 'all') {
    const cancerNum = Number(query.cancerType);
    const cancerType = cancerSearchColumns.find(
      (v) => v.column_id === cancerNum
    )?.column_name;
    if (cancerType) {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.registedCancerGroup.indexOf(cancerType) == -1) {
          userDataList.splice(index, 1);
          index--;
        }
      }
    }
  }

  // 診断日での絞り込み
  if (query.diagnosisDate) {
    const dateList = convertSearchDateRange(
      JSON.parse(query.diagnosisDate) as string[]
    );

    if (dateList.fromDate || dateList.toDate) {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.since == null) {
          userDataList.splice(index, 1);
          index--;
          continue;
        } else {
          const since: Date = new Date(userData.since);
          // 範囲外のものを除外
          if (dateList.fromDate! > since || since > dateList.toDate!) {
            userDataList.splice(index, 1);
            index--;
            continue;
          }
        }
      }
    }
  }

  // イベント日での絞り込み
  if (query.eventDate) {
    const dateList = convertSearchDateRange(
      JSON.parse(query.eventDate) as string[]
    );

    if (dateList.fromDate || dateList.toDate) {
      const isLatest = query.eventDateType !== '1';
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.eventDate == null || userData.eventDate.length === 0) {
          userDataList.splice(index, 1);
          index--;
          continue;
        } else {
          let isExclusion = false;
          // 検索タイプが最新か全てかで処理分岐
          if (isLatest) {
            // 最新のeventdate取得
            const eventDate = new Date(
              Math.max(
                ...userData.eventDate
                  .filter((p) => p != null)
                  .map((d) => d!.getTime())
              ) - dateOffset
            );

            if (
              dateList.fromDate! > eventDate ||
              eventDate > dateList.toDate!
            ) {
              isExclusion = true;
            }
          } else {
            // 全ての場合は、1つでも範囲内のイベント日があれば除外しない
            isExclusion = !userData.eventDate
              .filter((d) => d != null)
              .some((d) => {
                const date = new Date(d!.getTime() - dateOffset);
                return dateList.fromDate! <= date && date <= dateList.toDate!;
              });
          }

          // 範囲外のものを除外
          if (isExclusion) {
            userDataList.splice(index, 1);
            index--;
            continue;
          }
        }
      }
    }
  }

  // 未入力チェック系
  {
    // 進行期
    if (query.advancedStage && query.advancedStage === 'true') {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.advancedStage.indexOf(DISPLAY_STRINGS.NOT_ENTERED) == -1) {
          userDataList.splice(index, 1);
          index--;
        }
      }
    }

    // 診断
    if (query.pathlogicalDiagnosis && query.pathlogicalDiagnosis === 'true') {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.diagnosis.indexOf(DISPLAY_STRINGS.NOT_ENTERED) == -1) {
          userDataList.splice(index, 1);
          index--;
        }
      }
    }

    // 初回治療
    if (query.initialTreatment && query.initialTreatment === 'true') {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (userData.initialTreatment.length > 0) {
          userDataList.splice(index, 1);
          index--;
        }
      }
    }

    // 合併症
    if (query.complications && query.complications === 'true') {
      for (let index = 0; index < userDataList.length; index++) {
        const userData = userDataList[index];
        if (!userData.complications.includes(STATUS_STRINGS.NO_INPUT)) {
          userDataList.splice(index, 1);
          index--;
        }
      }
    }
  }

  // 3年予後
  if (query.threeYearPrognosis && query.threeYearPrognosis === 'true') {
    for (let index = 0; index < userDataList.length; index++) {
      const userData = userDataList[index];
      if (!userData.threeYearPrognosis.includes(STATUS_STRINGS.NOT_COMPLETED)) {
        userDataList.splice(index, 1);
        index--;
      }
    }
  }

  // 5年予後
  if (query.fiveYearPrognosis && query.fiveYearPrognosis === 'true') {
    for (let index = 0; index < userDataList.length; index++) {
      const userData = userDataList[index];
      if (!userData.fiveYearPrognosis.includes(STATUS_STRINGS.NOT_COMPLETED)) {
        userDataList.splice(index, 1);
        index--;
      }
    }
  }

  // プリセット項目の絞り込み処理
  logging(
    LOGTYPE.DEBUG,
    `プリセット項目の絞り込み処理チェック: query.presetFilters=${JSON.stringify(query.presetFilters)}, type=${typeof query.presetFilters}, isArray=${Array.isArray(query.presetFilters)}`,
    'SearchPatient-searchPatients'
  );
  
  if (query.presetFilters) {
    try {
      // presetFiltersが文字列の場合はパース、配列の場合はそのまま使用
      let presetFilters: Array<{
        field_id: number;
        field_name: string;
        field_path?: string;
        field_type: string;
        value: string;
      }>;
      
      if (typeof query.presetFilters === 'string') {
        // クエリパラメータから取得した場合（エンコードされている可能性がある）
        try {
          presetFilters = JSON.parse(decodeURIComponent(query.presetFilters)) as Array<{
            field_id: number;
            field_name: string;
            field_path?: string;
            field_type: string;
            value: string;
          }>;
        } catch {
          // decodeURIComponentが失敗した場合は、そのままパースを試みる
          presetFilters = JSON.parse(query.presetFilters) as Array<{
            field_id: number;
            field_name: string;
            field_path?: string;
            field_type: string;
            value: string;
          }>;
        }
      } else if (Array.isArray(query.presetFilters)) {
        // リクエストボディから直接取得した場合（既に配列）
        presetFilters = query.presetFilters;
      } else {
        logging(
          LOGTYPE.ERROR,
          `presetFiltersの形式が不正: ${typeof query.presetFilters}`,
          'SearchPatient-searchPatients'
        );
        presetFilters = [];
      }

      logging(
        LOGTYPE.DEBUG,
        `プリセット項目の絞り込み処理開始: ${JSON.stringify(presetFilters)}`,
        'SearchPatient-searchPatients'
      );

      // 各絞り込み条件を処理
      for (const filter of presetFilters) {
        const { field_name, field_path, field_type, value } = filter;
        
        logging(
          LOGTYPE.DEBUG,
          `絞り込み条件: field_name=${field_name}, field_path=${field_path || 'なし'}, field_type=${field_type}, value=${value}`,
          'SearchPatient-searchPatients'
        );

        // 各患者のドキュメントを取得して絞り込み
        for (let index = userDataList.length - 1; index >= 0; index--) {
          const userData = userDataList[index];
          let shouldRemove = false;

          // 固定項目のマッピング（field_nameからuserDataのプロパティを取得）
          const fixedFieldMapping: { [key: string]: string } = {
            [FIXED_FIELD_NAMES.PATIENT_ID]: USER_DATA_PROPERTIES.PATIENT_ID,
            [FIXED_FIELD_NAMES.PATIENT_NAME]: USER_DATA_PROPERTIES.PATIENT_NAME,
            [FIXED_FIELD_NAMES.AGE]: USER_DATA_PROPERTIES.AGE,
            [FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE]: USER_DATA_PROPERTIES.START_DATE,
            [FIXED_FIELD_NAMES.DIAGNOSIS]: USER_DATA_PROPERTIES.DIAGNOSIS,
            [FIXED_FIELD_NAMES.ADVANCED_STAGE]: USER_DATA_PROPERTIES.ADVANCED_STAGE,
            [FIXED_FIELD_NAMES.STATUS]: USER_DATA_PROPERTIES.STATUS,
            [FIXED_FIELD_NAMES.LAST_UPDATE]: USER_DATA_PROPERTIES.LAST_UPDATE,
          };

          // 固定項目の場合はuserDataから直接取得
          const isFixedField = fixedFieldMapping[field_name] !== undefined;
          let fixedFieldValue: any = null;
          if (isFixedField) {
            const propertyName = fixedFieldMapping[field_name];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fixedFieldValue = (userData as any)[propertyName];
            // ステータスの場合は配列なので、文字列に変換
            if (propertyName === USER_DATA_PROPERTIES.STATUS && Array.isArray(fixedFieldValue)) {
              fixedFieldValue = fixedFieldValue.join(',');
            }
            logging(
              LOGTYPE.DEBUG,
              `固定項目値取得: field_name=${field_name}, propertyName=${propertyName}, fixedFieldValue=${fixedFieldValue}, fixedFieldValueType=${typeof fixedFieldValue}, caseId=${userData.caseId}, patientId=${userData.patientId}`,
              'SearchPatient-searchPatients'
            );
          } else {
            logging(
              LOGTYPE.DEBUG,
              `固定項目ではない: field_name=${field_name}`,
              'SearchPatient-searchPatients'
            );
          }

          // 該当患者のドキュメントを取得（カスタム項目の場合のみ使用）
          const patientDbRows = dbRows.filter(row => row.case_id === userData.caseId);

          // field_pathまたはfield_nameを使用して値を取得
          const getFieldValue = (dbRow: dbRow): any => {
            // 固定項目の場合はuserDataから直接取得した値を使用
            if (isFixedField) {
              return fixedFieldValue;
            }

            // カスタム項目の場合はドキュメントから取得
            if (field_path) {
              // field_pathが指定されている場合は、field_pathを使用
              // バックエンドでは extractValue: false を指定して、元の値をそのまま返す
              return getValueFromPath(dbRow.document, field_path, { extractValue: false });
            } else {
              // field_pathが指定されていない場合は、field_nameをjesgo:tagとして使用
              return getPropertyNameFromTag(
                field_name,
                dbRow.document,
                dbRow.document_schema
              );
            }
          };

          if (field_type === 'string') {
            // 文字列検索：ドキュメント内の該当フィールドの値を取得して比較
            // 正規表現対応：/pattern/ または /pattern/flags 形式で入力された場合は正規表現として解釈
            let found = false;
            
            // 正規表現パターンを検出する関数
            const parseRegexPattern = (input: string): { pattern: string; flags: string } | null => {
              // /pattern/ または /pattern/flags 形式を検出
              const regexMatch = input.match(/^\/(.+)\/([gimsuy]*)$/);
              if (regexMatch) {
                return {
                  pattern: regexMatch[1],
                  flags: regexMatch[2] || ''
                };
              }
              return null;
            };
            
            // 正規表現でマッチングを試みる関数
            const tryRegexMatch = (text: string, pattern: string, flags: string): boolean => {
              try {
                const regex = new RegExp(pattern, flags);
                return regex.test(text);
              } catch (e) {
                // 無効な正規表現の場合は false を返す（後で通常の includes で処理）
                logging(
                  LOGTYPE.DEBUG,
                  `無効な正規表現パターン: ${pattern}, エラー: ${e}`,
                  'SearchPatient-searchPatients'
                );
                return false;
              }
            };
            
            const searchValueStr = String(value);
            const regexPattern = parseRegexPattern(searchValueStr);
            
            if (isFixedField) {
              // 固定項目の場合はuserDataから直接取得した値を使用
              const fieldValueStr = fixedFieldValue != null ? String(fixedFieldValue) : '';
              logging(
                LOGTYPE.DEBUG,
                `固定項目フィルタリング: field_name=${field_name}, propertyName=${fixedFieldMapping[field_name]}, fixedFieldValue=${fixedFieldValue}, fieldValueStr=${fieldValueStr}, searchValueStr=${searchValueStr}, caseId=${userData.caseId}, isRegex=${regexPattern !== null}`,
                'SearchPatient-searchPatients'
              );
              
              if (regexPattern) {
                // 正規表現としてマッチング
                if (tryRegexMatch(fieldValueStr, regexPattern.pattern, regexPattern.flags)) {
                  found = true;
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング（正規表現）: 一致しました - field_name=${field_name}, pattern=${regexPattern.pattern}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                } else {
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング（正規表現）: 一致しませんでした - field_name=${field_name}, pattern=${regexPattern.pattern}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                }
              } else {
                // 通常の部分一致検索
                if (fieldValueStr.includes(searchValueStr)) {
                  found = true;
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング: 一致しました - field_name=${field_name}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                } else {
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング: 一致しませんでした - field_name=${field_name}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                }
              }
            } else {
              // カスタム項目の場合はドキュメントから取得
              for (const dbRow of patientDbRows) {
                if (dbRow.document && typeof dbRow.document === 'object') {
                  const fieldValue = getFieldValue(dbRow);
                  if (fieldValue != null) {
                    const fieldValueStr = String(fieldValue);
                    
                    if (regexPattern) {
                      // 正規表現としてマッチング
                      if (tryRegexMatch(fieldValueStr, regexPattern.pattern, regexPattern.flags)) {
                        found = true;
                        break;
                      }
                    } else {
                      // 通常の部分一致検索
                      if (fieldValueStr.includes(searchValueStr)) {
                        found = true;
                        break;
                      }
                    }
                  }
                }
              }
            }
            if (!found) {
              shouldRemove = true;
            }
          } else if (field_type === 'number') {
            // 数値検索：正規表現対応
            let found = false;
            
            // 正規表現パターンを検出する関数
            const parseRegexPattern = (input: string): { pattern: string; flags: string } | null => {
              // /pattern/ または /pattern/flags 形式を検出
              const regexMatch = input.match(/^\/(.+)\/([gimsuy]*)$/);
              if (regexMatch) {
                return {
                  pattern: regexMatch[1],
                  flags: regexMatch[2] || ''
                };
              }
              return null;
            };
            
            // 正規表現でマッチングを試みる関数
            const tryRegexMatch = (text: string, pattern: string, flags: string): boolean => {
              try {
                const regex = new RegExp(pattern, flags);
                return regex.test(text);
              } catch (e) {
                // 無効な正規表現の場合は false を返す
                logging(
                  LOGTYPE.DEBUG,
                  `無効な正規表現パターン: ${pattern}, エラー: ${e}`,
                  'SearchPatient-searchPatients'
                );
                return false;
              }
            };
            
            const searchValueStr = String(value);
            const regexPattern = parseRegexPattern(searchValueStr);
            
            if (isFixedField) {
              // 固定項目の場合はuserDataから直接取得した値を使用
              const fieldValueStr = fixedFieldValue != null ? String(fixedFieldValue) : '';
              
              if (regexPattern) {
                // 正規表現としてマッチング
                if (tryRegexMatch(fieldValueStr, regexPattern.pattern, regexPattern.flags)) {
                  found = true;
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング（数値・正規表現）: 一致しました - field_name=${field_name}, pattern=${regexPattern.pattern}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                } else {
                  logging(
                    LOGTYPE.DEBUG,
                    `固定項目フィルタリング（数値・正規表現）: 一致しませんでした - field_name=${field_name}, pattern=${regexPattern.pattern}, caseId=${userData.caseId}`,
                    'SearchPatient-searchPatients'
                  );
                }
              } else {
                // 通常の数値比較または文字列比較
                // 数値として解釈できる場合は数値比較、できない場合は文字列比較
                const fieldValueNum = Number(fieldValueStr);
                const searchValueNum = Number(searchValueStr);
                
                if (!isNaN(fieldValueNum) && !isNaN(searchValueNum)) {
                  // 両方とも数値として解釈できる場合は数値比較
                  if (fieldValueNum === searchValueNum) {
                    found = true;
                    logging(
                      LOGTYPE.DEBUG,
                      `固定項目フィルタリング（数値）: 一致しました - field_name=${field_name}, fieldValue=${fieldValueNum}, searchValue=${searchValueNum}, caseId=${userData.caseId}`,
                      'SearchPatient-searchPatients'
                    );
                  } else {
                    logging(
                      LOGTYPE.DEBUG,
                      `固定項目フィルタリング（数値）: 一致しませんでした - field_name=${field_name}, fieldValue=${fieldValueNum}, searchValue=${searchValueNum}, caseId=${userData.caseId}`,
                      'SearchPatient-searchPatients'
                    );
                  }
                } else {
                  // 数値として解釈できない場合は文字列比較
                  if (fieldValueStr.includes(searchValueStr)) {
                    found = true;
                    logging(
                      LOGTYPE.DEBUG,
                      `固定項目フィルタリング（数値・文字列）: 一致しました - field_name=${field_name}, fieldValue=${fieldValueStr}, searchValue=${searchValueStr}, caseId=${userData.caseId}`,
                      'SearchPatient-searchPatients'
                    );
                  } else {
                    logging(
                      LOGTYPE.DEBUG,
                      `固定項目フィルタリング（数値・文字列）: 一致しませんでした - field_name=${field_name}, fieldValue=${fieldValueStr}, searchValue=${searchValueStr}, caseId=${userData.caseId}`,
                      'SearchPatient-searchPatients'
                    );
                  }
                }
              }
            } else {
              // カスタム項目の場合はドキュメントから取得
              for (const dbRow of patientDbRows) {
                if (dbRow.document && typeof dbRow.document === 'object') {
                  const fieldValue = getFieldValue(dbRow);
                  if (fieldValue != null) {
                    const fieldValueStr = String(fieldValue);
                    
                    if (regexPattern) {
                      // 正規表現としてマッチング
                      if (tryRegexMatch(fieldValueStr, regexPattern.pattern, regexPattern.flags)) {
                        found = true;
                        break;
                      }
                    } else {
                      // 通常の数値比較または文字列比較
                      const fieldValueNum = Number(fieldValueStr);
                      const searchValueNum = Number(searchValueStr);
                      
                      if (!isNaN(fieldValueNum) && !isNaN(searchValueNum)) {
                        // 両方とも数値として解釈できる場合は数値比較
                        if (fieldValueNum === searchValueNum) {
                          found = true;
                          break;
                        }
                      } else {
                        // 数値として解釈できない場合は文字列比較
                        if (fieldValueStr.includes(searchValueStr)) {
                          found = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (!found) {
              shouldRemove = true;
            }
          } else if (field_type === 'date') {
            // 日付検索：初回治療開始日と同じロジック
            const dateList = JSON.parse(value) as string[];
            const { fromDate, toDate } = convertSearchDateRange(dateList);
            
            let found = false;
            if (isFixedField) {
              // 固定項目の場合はuserDataから直接取得した値を使用
              if (fixedFieldValue) {
                const fieldDate = new Date(fixedFieldValue as string);
                if (!isNaN(fieldDate.getTime())) {
                  if (fromDate && toDate) {
                    if (fieldDate >= fromDate && fieldDate <= toDate) {
                      found = true;
                    }
                  } else if (fromDate) {
                    if (fieldDate >= fromDate) {
                      found = true;
                    }
                  }
                }
              }
            } else {
              // カスタム項目の場合はドキュメントから取得
              for (const dbRow of patientDbRows) {
                if (dbRow.document && typeof dbRow.document === 'object') {
                  const fieldValue = getFieldValue(dbRow);
                  if (fieldValue) {
                    const fieldDate = new Date(fieldValue as string);
                    if (!isNaN(fieldDate.getTime())) {
                      if (fromDate && toDate) {
                        if (fieldDate >= fromDate && fieldDate <= toDate) {
                          found = true;
                          break;
                        }
                      } else if (fromDate) {
                        if (fieldDate >= fromDate) {
                          found = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (!found) {
              shouldRemove = true;
            }
          } else if (field_type === 'status') {
            // 未入力項目で絞り込み：未入力項目で絞り込みと同じロジック
            // valueはJSON文字列として送信される（各項目のチェック状態を含むオブジェクト）
            let statusFilter: {
              advancedStage?: boolean;
              pathlogicalDiagnosis?: boolean;
              initialTreatment?: boolean;
              complications?: boolean;
              threeYearPrognosis?: boolean;
              fiveYearPrognosis?: boolean;
            } | null = null;
            
            try {
              statusFilter = JSON.parse(value as string);
            } catch (e) {
              // JSONパースに失敗した場合は、従来の'true'形式として扱う
              if (value === 'true') {
                statusFilter = { advancedStage: true };
              }
            }
            
            if (statusFilter) {
              // 少なくとも1つの項目がチェックされている場合のみ処理
              const hasAnyCheck = statusFilter.advancedStage || statusFilter.pathlogicalDiagnosis || 
                                  statusFilter.initialTreatment || statusFilter.complications || 
                                  statusFilter.threeYearPrognosis || statusFilter.fiveYearPrognosis;
              
              if (hasAnyCheck) {
                // チェックされた項目のうち、1つでも未入力でない場合は削除
                // 進行期のチェック
                if (statusFilter.advancedStage && userData.advancedStage.indexOf(DISPLAY_STRINGS.NOT_ENTERED) == -1) {
                  shouldRemove = true;
                }
                
                // 診断のチェック
                if (statusFilter.pathlogicalDiagnosis && userData.diagnosis.indexOf(DISPLAY_STRINGS.NOT_ENTERED) == -1) {
                  shouldRemove = true;
                }
                
                // 初回治療のチェック
                if (statusFilter.initialTreatment && userData.initialTreatment.length > 0) {
                  shouldRemove = true;
                }
                
                // 合併症のチェック
                if (statusFilter.complications && !userData.complications.includes(STATUS_STRINGS.NO_INPUT)) {
                  shouldRemove = true;
                }
                
                // 3年予後のチェック
                if (statusFilter.threeYearPrognosis && !userData.threeYearPrognosis.includes(STATUS_STRINGS.NOT_COMPLETED)) {
                  shouldRemove = true;
                }
                
                // 5年予後のチェック
                if (statusFilter.fiveYearPrognosis && !userData.fiveYearPrognosis.includes(STATUS_STRINGS.NOT_COMPLETED)) {
                  shouldRemove = true;
                }
              }
            }
          } else if (field_type === 'boolean') {
            // ブール値検索
            let found = false;
            const boolValue = value === 'true';
            
            // 値をブール値に変換する関数
            const convertToBoolean = (val: any): boolean | null => {
              if (val === null || val === undefined) {
                return null;
              }
              if (typeof val === 'boolean') {
                return val;
              }
              if (typeof val === 'string') {
                // 文字列の場合、"true"または"1"の場合はtrue、それ以外はfalse
                const lowerVal = val.toLowerCase().trim();
                if (lowerVal === 'true' || lowerVal === '1') {
                  return true;
                }
                if (lowerVal === 'false' || lowerVal === '0' || lowerVal === '') {
                  return false;
                }
                // その他の文字列はnull（判定不能）
                return null;
              }
              if (typeof val === 'number') {
                // 数値の場合、0以外はtrue、0はfalse
                return val !== 0;
              }
              // その他の型はnull（判定不能）
              return null;
            };
            
            if (isFixedField) {
              // 固定項目の場合はuserDataから直接取得した値を使用
              const convertedValue = convertToBoolean(fixedFieldValue);
              if (convertedValue !== null && convertedValue === boolValue) {
                found = true;
              }
            } else {
              // カスタム項目の場合はドキュメントから取得
              for (const dbRow of patientDbRows) {
                if (dbRow.document && typeof dbRow.document === 'object') {
                  const fieldValue = getFieldValue(dbRow);
                  const convertedValue = convertToBoolean(fieldValue);
                  if (convertedValue !== null && convertedValue === boolValue) {
                    found = true;
                    break;
                  }
                }
              }
            }
            if (!found) {
              shouldRemove = true;
            }
          }

          if (shouldRemove) {
            logging(
              LOGTYPE.DEBUG,
              `患者を削除: field_name=${field_name}, caseId=${userData.caseId}, patientId=${userData.patientId}`,
              'SearchPatient-searchPatients'
            );
            userDataList.splice(index, 1);
          } else {
            logging(
              LOGTYPE.DEBUG,
              `患者を保持: field_name=${field_name}, caseId=${userData.caseId}, patientId=${userData.patientId}`,
              'SearchPatient-searchPatients'
            );
          }
        }
      }
      
      logging(
        LOGTYPE.DEBUG,
        `プリセット項目の絞り込み処理完了: フィルタリング後の患者数=${userDataList.length}`,
        'SearchPatient-searchPatients'
      );
    } catch (error) {
      logging(LOGTYPE.ERROR, `プリセット項目の絞り込み処理でエラー: ${error}`, 'SearchPatient-searchPatients');
    }
  }

  // 総件数を保存（フィルタリング後）
  const totalCount = userDataList.length;
  
  logging(
    LOGTYPE.DEBUG,
    `フィルタリング後の総件数: ${totalCount}`,
    'SearchPatient-searchPatients'
  );

  // ソート処理
  if (query.sortColumn && query.sortDirection) {
    const sortColumn = query.sortColumn;
    const sortDirection = query.sortDirection === 'asc';
    
    userDataList.sort((a, b) => {
      let valueA: unknown;
      let valueB: unknown;

      switch (sortColumn) {
        case USER_DATA_PROPERTIES.PATIENT_ID:
          valueA = a.patientId;
          valueB = b.patientId;
          break;
        case USER_DATA_PROPERTIES.PATIENT_NAME:
          valueA = a.patientName;
          valueB = b.patientName;
          break;
        case USER_DATA_PROPERTIES.AGE:
          valueA = a.age;
          valueB = b.age;
          break;
        case USER_DATA_PROPERTIES.START_DATE:
          valueA = a.startDate;
          valueB = b.startDate;
          break;
        case USER_DATA_PROPERTIES.LAST_UPDATE:
          valueA = a.lastUpdate;
          valueB = b.lastUpdate;
          break;
        case USER_DATA_PROPERTIES.DIAGNOSIS:
          valueA = a.diagnosis === DISPLAY_STRINGS.NOT_ENTERED ? '' : a.diagnosis;
          valueB = b.diagnosis === DISPLAY_STRINGS.NOT_ENTERED ? '' : b.diagnosis;
          break;
        case USER_DATA_PROPERTIES.ADVANCED_STAGE:
          valueA = a.advancedStage === DISPLAY_STRINGS.NOT_ENTERED ? '' : a.advancedStage;
          valueB = b.advancedStage === DISPLAY_STRINGS.NOT_ENTERED ? '' : b.advancedStage;
          break;
        default:
          return 0;
      }

      return compareValues(valueA, valueB, sortDirection);
    });
  }

  // ページング処理
  // デフォルト値: page=1, pageSize=50
  const page = query.page ? parseInt(query.page as string, 10) : 1;
  const pageSize = query.pageSize ? parseInt(query.pageSize as string, 10) : 50;
  
  let paginatedData = userDataList;
  if (!isNaN(page) && !isNaN(pageSize) && page > 0 && pageSize > 0) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    paginatedData = userDataList.slice(startIndex, endIndex);
  }

  return { 
    statusNum: RESULT.NORMAL_TERMINATION, 
    body: { 
      data: paginatedData,
      totalCount: totalCount
    } 
  };
};

export const deletePatient = async (
  caseId: number
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'SearchPatient', 'deletePatient');
  let returnObj = true;
  const dbAccess = new DbAccess();
  try {
    await dbAccess.connectWithConf();
    await dbAccess.query(
      'UPDATE jesgo_case SET deleted = true WHERE case_id = $1',
      [caseId]
    );
    await dbAccess.query(
      'UPDATE jesgo_document SET deleted = true WHERE case_id = $1',
      [caseId]
    );
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'SearchPatient',
      'deletePatient'
    );
    returnObj = false;
  } finally {
    await dbAccess.end();
  }
  if (returnObj) {
    return { statusNum: RESULT.NORMAL_TERMINATION, body: null };
  } else {
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};
