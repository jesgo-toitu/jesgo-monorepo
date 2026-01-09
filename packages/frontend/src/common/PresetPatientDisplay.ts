/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { GetSchemaInfo, GetSchemaIdFromString } from '../components/CaseRegistration/SchemaUtility';
import { formatDateStr } from './CommonUtility';
import {
  addStatus,
  addStatusAllowDuplicate,
  FIXED_FIELD_NAMES,
  STATUS_STRINGS,
  DISPLAY_STRINGS,
  SEPARATORS,
  getValueFromPath,
  extractActualValue,
} from '@jesgo/common';

// プリセット項目の型定義
export interface PresetField {
  field_id: number;
  preset_id: number;
  schema_primary_id?: number;
  schema_id?: number;
  schema_id_string?: string;
  field_name: string;
  display_name: string;
  field_path?: string;
  field_type?: string;
  is_visible: boolean;
  is_csv_export: boolean;
  is_csv_header_display_name?: boolean;
  is_fixed: boolean;
  display_order: number;
  schema_title?: string;
  schema_version?: string;
}

// ドキュメント内容の型定義
export interface DocumentContent {
  document_id: number;
  schema_id: number;
  schema_id_string: string;
  document: any;
  event_date: string;
}

// 患者情報の型定義
export interface PatientInfo {
  case_id: number;
  name: string;
  date_of_birth: string;
  his_id: string;
  age?: number;
  lastUpdate?: string;
  date_of_death?: string | null;
  status?: string[];
}

// extractActualValue と getValueFromPath は @jesgo/common からインポート
// フロントエンドでは extractValue: true（デフォルト）を使用して、値を抽出する

/**
 * 患者のドキュメントを取得して変換
 * @param documents APIから取得したドキュメントデータ
 * @returns 変換されたドキュメント配列
 */
export const transformDocuments = (documents: any[]): DocumentContent[] => {
  const transformedDocuments: DocumentContent[] = [];
  
  if (Array.isArray(documents)) {
    for (const docObj of documents) {
      if (docObj.value) {
        // schema_idからschema_id_stringを取得
        let schemaIdString = '';
        try {
          const schemaInfo = GetSchemaInfo(docObj.value.schema_id, docObj.value.event_date || '');
          schemaIdString = schemaInfo?.schema_id_string || '';
        } catch (error) {
          // エラーは無視して続行
        }
        
        transformedDocuments.push({
          document_id: parseInt(docObj.key) || 0,
          schema_id: docObj.value.schema_id || 0,
          schema_id_string: schemaIdString,
          event_date: docObj.value.event_date || '',
          document: docObj.value.document || {}
        });
      }
    }
  }
  
  return transformedDocuments;
};

/**
 * 診断を取得（がん種から）- PresetDocumentTestViewと同じロジック
 */
const getDiagnosis = (documents: DocumentContent[]): string => {
  // ドキュメントをイベント日でソート（古い順）
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.event_date && b.event_date) {
      return a.event_date.localeCompare(b.event_date);
    }
    return 0;
  });
  
  let diagnosis = '';
  
  for (const doc of sortedDocs) {
    if (doc.document && typeof doc.document === 'object') {
      if (doc.document['がん種'] && typeof doc.document['がん種'] === 'string' && doc.document['がん種'] !== '') {
        const cancerType = doc.document['がん種'];
        diagnosis = addStatus(diagnosis, cancerType, SEPARATORS.DIAGNOSIS);
      }
    }
  }
  
  // 診断が未入力の場合は「未」を返す
  return diagnosis !== '' ? diagnosis : DISPLAY_STRINGS.NOT_ENTERED;
};

/**
 * 診断を主要がん種とその他に分割して取得（CSV出力用）
 * @param documents ドキュメント配列
 * @param getSchemaInfo スキーマ情報取得関数
 * @returns {diagnosisMajor: string, diagnosisMinor: string}
 */
export const getDiagnosisSplit = (
  documents: DocumentContent[],
  getSchemaInfo: any
): { diagnosisMajor: string; diagnosisMinor: string } => {
  // ドキュメントをイベント日でソート（古い順）
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.event_date && b.event_date) {
      return a.event_date.localeCompare(b.event_date);
    }
    return 0;
  });
  
  let diagnosisMajor = '';
  let diagnosisMinor = '';
  
  for (const doc of sortedDocs) {
    if (!doc.document || typeof doc.document !== 'object') continue;
    
    try {
      // スキーマ情報を取得
      const schemaInfo = getSchemaInfo(doc.schema_id, doc.event_date);
      if (!schemaInfo || !schemaInfo.document_schema) continue;
      
      const schemaStr = JSON.stringify(schemaInfo.document_schema).toLowerCase();
      
      // 主要がん種（CANCER_MAJORタグ）
      if (schemaStr.includes('cancer_major')) {
        // スキーマ内でがん種プロパティを探す
        const cancerMajorValue = doc.document['がん種'] || '';
        if (cancerMajorValue && typeof cancerMajorValue === 'string' && cancerMajorValue !== '') {
          diagnosisMajor = addStatus(diagnosisMajor, cancerMajorValue, SEPARATORS.DIAGNOSIS);
        }
      }
      
      // その他がん種（CANCER_MINORタグ）
      if (schemaStr.includes('cancer_minor')) {
        // スキーマ内でがん種プロパティを探す
        const cancerMinorValue = doc.document['がん種'] || '';
        if (cancerMinorValue && typeof cancerMinorValue === 'string' && cancerMinorValue !== '') {
          diagnosisMinor = addStatus(diagnosisMinor, cancerMinorValue, SEPARATORS.DIAGNOSIS);
        }
      }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  // 未入力の場合は「未」を返す
  return {
    diagnosisMajor: diagnosisMajor !== '' ? diagnosisMajor : DISPLAY_STRINGS.NOT_ENTERED,
    diagnosisMinor: diagnosisMinor !== '' ? diagnosisMinor : DISPLAY_STRINGS.NOT_ENTERED,
  };
};

/**
 * 進行期を取得（FIGOタグから）- PresetDocumentTestViewと同じロジック
 */
export const getAdvancedStage = (documents: DocumentContent[], getSchemaInfo: any): string => {
  let advancedStage = '';
  
  // ドキュメントをイベント日でソート（古い順）
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.event_date && b.event_date) {
      return a.event_date.localeCompare(b.event_date);
    }
    return 0;
  });
  
  for (const doc of sortedDocs) {
    if (doc.document && typeof doc.document === 'object') {
      // スキーマ情報を取得
      const schemaInfo = getSchemaInfo(doc.schema_id, doc.event_date);
      
      // スキーマにFIGOタグがあるかチェック
      const hasFigoTag = schemaInfo && JSON.stringify(schemaInfo.document_schema).toLowerCase().includes('figo');
      
      if (hasFigoTag) {
        // スキーマにFIGOタグがある場合、値を取得
        if ('FIGO' in doc.document) {
          const figoValue = doc.document['FIGO'];
          
          // 値が空の場合は「未」を使用
          const figoStage = (typeof figoValue === 'string' && figoValue !== '') ? figoValue : DISPLAY_STRINGS.NOT_ENTERED;
          advancedStage = addStatusAllowDuplicate(advancedStage, figoStage, SEPARATORS.STAGE);
        } else {
          // FIGOプロパティがない場合は「未」を追加
          advancedStage = addStatusAllowDuplicate(advancedStage, DISPLAY_STRINGS.NOT_ENTERED, SEPARATORS.STAGE);
        }
      }
    }
  }
  
  // 空または「未」のみの場合は「未」を返す
  const regex = new RegExp(/^[未・]*$/);
  if (advancedStage === '' || regex.test(advancedStage)) {
    return DISPLAY_STRINGS.NOT_ENTERED;
  }
  
  return advancedStage;
};

/**
 * 初回治療開始日を取得（バックエンドのSearchPatient.tsと同じロジック）
 */
export const getInitialTreatmentDate = (documents: DocumentContent[], getSchemaInfo: any): string => {
  let earliestDate: string | null = null;
  
  for (const doc of documents) {
    if (!doc.document || typeof doc.document !== 'object') continue;
    
    try {
      // スキーマ情報を取得
      const schemaInfo = getSchemaInfo(doc.schema_id, doc.event_date);
      if (!schemaInfo || !schemaInfo.document_schema) continue;
      
      const schemaStr = JSON.stringify(schemaInfo.document_schema).toLowerCase();
      
      // INITIAL_TREATMENT_DATEタグが含まれているか確認
      if (schemaStr.includes('initial_treatment_date')) {
        // 初回治療開始日プロパティを探す
        const initialTreatmentDate = doc.document['初回治療開始日'] || doc.document['initial_treatment_date'];
        
        if (initialTreatmentDate && typeof initialTreatmentDate === 'string' && initialTreatmentDate !== '') {
          // 日付変換に失敗する値の場合は無視する
          if (!isNaN(new Date(initialTreatmentDate).getFullYear())) {
            // 初回治療日がもともと記録されていないか、もっと古いものであれば書き換える
            if (!earliestDate || earliestDate > initialTreatmentDate) {
              earliestDate = initialTreatmentDate;
            }
          }
        }
      }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  // 日付フォーマットをyyyy/mm/ddに変換
  if (earliestDate) {
    // yyyy-mm-dd形式からyyyy/mm/dd形式に変換
    const formattedDate = formatDateStr(earliestDate, '/');
    return formattedDate;
  }
  
  return '';
};

/** JSONSchema7のkeyと値を全て取得 */
export const getItemsAndNames = (item: JSONSchema7) => {
  if (item === null) return { pItems: {}, pNames: [] };
  const result = {
    pItems: item as { [key: string]: JSONSchema7Definition },
    pNames: Object.keys(item),
  };
  return result;
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
  const schemaItems = getItemsAndNames(schema);
  let retText = null;
  for (let i = 0; i < schemaItems.pNames.length; i++) {
    const prop = schemaItems.pItems[schemaItems.pNames[i]] as JSONSchema7;
    // 該当プロパティがオブジェクトの場合、タグが付いてるかを確認
    if (typeof prop === 'object') {
      // タグが付いていれば値を取得する
      if ((prop as any)['jesgo:tag'] && (prop as any)['jesgo:tag'] == tagName) {
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

/**
 * ステータス配列を取得（バックエンドのSearchPatient.tsと同じロジック）
 */
export const getStatusArray = (documents: DocumentContent[], patient: PatientInfo): string[] => {
  const statusArray: string[] = [];

  // 死亡ステータス
  if (patient.date_of_death) {
    statusArray.push(STATUS_STRINGS.DEATH);
  }
  
  for (const doc of documents) {
    if (!doc.document || typeof doc.document !== 'object') continue;
    
    try {
      // スキーマ情報を取得
      const schemaInfo = GetSchemaInfo(doc.schema_id, doc.event_date);
      if (!schemaInfo || !schemaInfo.document_schema) continue;
      
      const docSchema = schemaInfo.document_schema;
      const schemaStr = JSON.stringify(docSchema).toLowerCase();
      
      // 治療法系のチェック（バックエンドと同じロジック）
      const iconTag: string[] = [];
      
      // 手術療法
      if (schemaStr.includes('treatment_surgery') && (getPropertyNameFromTag('treatment_surgery', doc.document, docSchema) ?? '') !== '') {
        iconTag.push(STATUS_STRINGS.SURGERY);
        if (schemaStr.includes('has_complications') && (getPropertyNameFromTag('has_complications', doc.document, docSchema) ?? '') === 'あり') {
          iconTag.push(STATUS_STRINGS.COMPLICATIONS);
        }
      } else if (schemaStr.includes('treatment_chemo') && (getPropertyNameFromTag('treatment_chemo', doc.document, docSchema) ?? '') !== '') {
        // 化学療法（薬物療法）
        iconTag.push(STATUS_STRINGS.CHEMO);
      } else if (schemaStr.includes('treatment_radio') && (getPropertyNameFromTag('treatment_radio', doc.document, docSchema) ?? '') !== '') {
        // 放射線療法
        iconTag.push(STATUS_STRINGS.RADIO);
      } else if (schemaStr.includes('treatment_supportivecare') && (getPropertyNameFromTag('treatment_supportivecare', doc.document, docSchema) ?? '') !== '') {
        // 支持療法
        iconTag.push(STATUS_STRINGS.SUPPORTIVECARE);
      }
      
      // アイコンタグをステータス配列に追加
      if (iconTag.length > 0) {
        statusArray.push(...iconTag);
      }
      
      // 再発
      if (schemaStr.includes('recurrence')) { statusArray.push(STATUS_STRINGS.RECURRENCE); }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  // 重複を除去して返す
  return [...new Set(statusArray)];
};

/**
 * 登録情報を取得（CSV出力用）
 * @param documents ドキュメント配列
 * @param getSchemaInfo スキーマ情報取得関数
 * @returns 登録情報文字列（'拒否' | '無' | 登録番号（複数の場合は'・'区切り） | '有'）
 */
export const getRegistration = (
  documents: DocumentContent[],
  getSchemaInfo: any
): string => {
  const registrationStatus: string[] = [];
  const registrationNumbers: string[] = [];
  
  for (const doc of documents) {
    if (!doc.document || typeof doc.document !== 'object') continue;
    
    try {
      // スキーマ情報を取得
      const schemaInfo = getSchemaInfo(doc.schema_id, doc.event_date);
      if (!schemaInfo || !schemaInfo.document_schema) continue;
      
      const schemaStr = JSON.stringify(schemaInfo.document_schema).toLowerCase();
      
      // 登録拒否チェック（decline）
      if (doc.document['登録拒否'] === true || doc.document['decline'] === true) {
        registrationStatus.push(STATUS_STRINGS.DECLINE);
      }
      
      // 腫瘍登録対象チェック（REGISTRABILITYタグ）
      if (schemaStr.includes('registrability')) {
        const registrability = doc.document['登録対象症例'] || doc.document['registrability'] || '';
        if (registrability === 'はい' || registrability === true) {
          // 腫瘍登録番号チェック（REGISTRATION_NUMBERタグ）
          if (schemaStr.includes('registration_number')) {
            const registrationNumber = doc.document['腫瘍登録番号'] || doc.document['registration_number'] || '';
            if (registrationNumber && registrationNumber !== '') {
              registrationStatus.push(STATUS_STRINGS.COMPLETED);
              if (!registrationNumbers.includes(registrationNumber)) {
                registrationNumbers.push(registrationNumber);
              }
            } else {
              registrationStatus.push(STATUS_STRINGS.NOT_COMPLETED);
            }
          } else {
            registrationStatus.push(STATUS_STRINGS.NOT_COMPLETED);
          }
        }
      }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  // 優先順位: 'decline' > 'not_completed' > 'completed' > '有'
  if (registrationStatus.includes(STATUS_STRINGS.DECLINE)) {
    return DISPLAY_STRINGS.DECLINE;
  } else if (registrationStatus.includes(STATUS_STRINGS.NOT_COMPLETED)) {
    return DISPLAY_STRINGS.NONE;
  } else if (registrationStatus.includes(STATUS_STRINGS.COMPLETED) && registrationNumbers.length > 0) {
    return registrationNumbers.join(SEPARATORS.STAGE);
  } else {
    return DISPLAY_STRINGS.EXISTS;
  }
};

/**
 * 3年予後・5年予後を取得（CSV出力用）
 * @param documents ドキュメント配列
 * @param getSchemaInfo スキーマ情報取得関数
 * @param startDate 初回治療開始日
 * @returns {threeYearPrognosis: string, fiveYearPrognosis: string}
 */
export const getPrognosis = (
  documents: DocumentContent[],
  getSchemaInfo: any,
  startDate: string | null | undefined
): { threeYearPrognosis: string; fiveYearPrognosis: string } => {
  // 初回治療開始日が指定されていない場合は未指定とする
  if (!startDate) {
    return { threeYearPrognosis: '', fiveYearPrognosis: '' };
  }
  
  // 初回治療開始日から現在までの年数を計算（より正確に日付の差分で計算）
  const startDateObj = new Date(startDate);
  const now = new Date();
  let yearsSinceStart = now.getFullYear() - startDateObj.getFullYear();
  const monthDiff = now.getMonth() - startDateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < startDateObj.getDate())) {
    yearsSinceStart--;
  }
  
  const threeYearStatuses: string[] = [];
  const fiveYearStatuses: string[] = [];
  
  for (const doc of documents) {
    if (!doc.document || typeof doc.document !== 'object') continue;
    
    try {
      // スキーマ情報を取得
      const schemaInfo = getSchemaInfo(doc.schema_id, doc.event_date);
      if (!schemaInfo || !schemaInfo.document_schema) continue;
      
      const schemaStr = JSON.stringify(schemaInfo.document_schema).toLowerCase();
      
      // 3年予後（THREE_YEAR_PROGNOSISタグ）
      if (schemaStr.includes('three_year_prognosis')) {
        if (yearsSinceStart >= 3) {
          const threeYearValue = doc.document['3年予後'] || doc.document['three_year_prognosis'] || '';
          if (threeYearValue === DISPLAY_STRINGS.COMPLETED || threeYearValue === STATUS_STRINGS.COMPLETED) {
            threeYearStatuses.push(STATUS_STRINGS.COMPLETED);
          } else if (threeYearValue === DISPLAY_STRINGS.NOT_ENTERED || threeYearValue === STATUS_STRINGS.NOT_COMPLETED) {
            threeYearStatuses.push(STATUS_STRINGS.NOT_COMPLETED);
          }
        }
      }
      
      // 5年予後（FIVE_YEAR_PROGNOSISタグ）
      if (schemaStr.includes('five_year_prognosis')) {
        if (yearsSinceStart >= 5) {
          const fiveYearValue = doc.document['5年予後'] || doc.document['five_year_prognosis'] || '';
          if (fiveYearValue === DISPLAY_STRINGS.COMPLETED || fiveYearValue === STATUS_STRINGS.COMPLETED) {
            fiveYearStatuses.push(STATUS_STRINGS.COMPLETED);
          } else if (fiveYearValue === DISPLAY_STRINGS.NOT_ENTERED || fiveYearValue === STATUS_STRINGS.NOT_COMPLETED) {
            fiveYearStatuses.push(STATUS_STRINGS.NOT_COMPLETED);
          }
        }
      }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  // 優先順位: 'not_completed' > 'completed'
  const threeYearResult = threeYearStatuses.includes(STATUS_STRINGS.NOT_COMPLETED) ? DISPLAY_STRINGS.NONE : 
                          threeYearStatuses.includes(STATUS_STRINGS.COMPLETED) ? DISPLAY_STRINGS.COMPLETED : '';
  const fiveYearResult = fiveYearStatuses.includes(STATUS_STRINGS.NOT_COMPLETED) ? DISPLAY_STRINGS.NONE : 
                         fiveYearStatuses.includes(STATUS_STRINGS.COMPLETED) ? DISPLAY_STRINGS.COMPLETED : '';
  
  return {
    threeYearPrognosis: threeYearResult,
    fiveYearPrognosis: fiveYearResult,
  };
};

// addStatus と addStatusAllowDuplicate は @jesgo/common からインポート

/**
 * オブジェクトをわかりやすく文字列化する関数
 * @param obj 文字列化するオブジェクト
 * @param maxDepth 最大のネスト深度（デフォルト: 2）
 * @param currentDepth 現在のネスト深度（デフォルト: 0）
 * @returns 文字列化されたオブジェクト
 */
const formatObjectToString = (obj: any, maxDepth: number = 2, currentDepth: number = 0): string => {
  if (obj === null || obj === undefined) {
    return '';
  }
  
  // 最大深度に達した場合は、簡略表示
  if (currentDepth >= maxDepth) {
    return '[Object]';
  }
  
  // プリミティブ型の場合はそのまま返す
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  // 配列の場合は、各要素を処理
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '';
    }
    return obj.map(item => formatObjectToString(item, maxDepth, currentDepth + 1)).join(', ');
  }
  
  // オブジェクトの場合は、各プロパティを key: value 形式で表示
  const parts: string[] = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const val = obj[key];
      if (val !== null && val !== undefined) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          // ネストされたオブジェクトの場合は再帰的に処理
          const nestedStr = formatObjectToString(val, maxDepth, currentDepth + 1);
          if (nestedStr) {
            parts.push(`${key}: ${nestedStr}`);
          }
        } else if (Array.isArray(val)) {
          // 配列の場合は、各要素を処理
          if (val.length > 0) {
            const arrayStr = val.map(item => formatObjectToString(item, maxDepth, currentDepth + 1)).join(', ');
            parts.push(`${key}: [${arrayStr}]`);
          }
        } else {
          // プリミティブ型の場合はそのまま表示
          parts.push(`${key}: ${String(val)}`);
        }
      }
    }
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return parts.join('; ');
};

export const formatPatientRow = (
  patient: PatientInfo,
  presetFields: PresetField[],
  documents: DocumentContent[],
  getSchemaInfo: any,
  selectedPresetId: string | null,
  includeInvisible?: boolean // CSV出力用に非表示項目も含めるかどうか
): any => {
  const row: any = {
    case_id: patient.case_id,
    his_id: patient.his_id,
    name: patient.name,
    age: patient.age,
    lastUpdate: patient.lastUpdate,
  };
  
  // 表示用の場合は、is_visible=trueのフィールドのみをフィルタリングして処理を高速化
  // CSV出力用（includeInvisible=true）の場合は全フィールドを処理
  const fieldsToProcess = includeInvisible 
    ? presetFields 
    : presetFields.filter(field => field.is_visible);
  
  // 各プリセットフィールドに対応する値を取得
  for (const field of fieldsToProcess) {
    
    // 固定フィールドの場合は特別処理
    if (field.is_fixed) {
      switch (field.field_name) {
        case FIXED_FIELD_NAMES.PATIENT_ID:
          row[field.field_name] = patient.his_id;
          break;
        case FIXED_FIELD_NAMES.PATIENT_NAME:
          row[field.field_name] = patient.name;
          break;
        case FIXED_FIELD_NAMES.AGE:
          row[field.field_name] = patient.age || '';
          break;
        case FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE:
          row[field.field_name] = getInitialTreatmentDate(documents, getSchemaInfo);
          break;
        case FIXED_FIELD_NAMES.LAST_UPDATE:
          row[field.field_name] = patient.lastUpdate || '';
          break;
        case FIXED_FIELD_NAMES.DIAGNOSIS:
          row[field.field_name] = getDiagnosis(documents);
          break;
        case FIXED_FIELD_NAMES.ADVANCED_STAGE:
          row[field.field_name] = getAdvancedStage(documents, getSchemaInfo);
          break;
        case FIXED_FIELD_NAMES.STATUS:
          // ステータスを取得（通常表示と同じロジック）
          // バックエンドから返されるstatus配列を優先して使用し、なければgetStatusArrayで計算
          if (patient.status &&
              Array.isArray(patient.status) &&
              patient.status.length > 0 &&
              (!selectedPresetId || Number(selectedPresetId) === 1)) {
            // バックエンドから返されるstatus配列を使用（通常表示と同じ）
            row[field.field_name] = patient.status;
          } else {
            // status配列がない場合は、ドキュメントから計算
            row[field.field_name] = getStatusArray(documents, patient);
          }
          row[`${field.field_name}_isIcon`] = true; // アイコン表示フラグ
          break;
        default:
          row[field.field_name] = '';
      }
      continue; // 固定項目の処理が完了したら次のフィールドへ
    }
    
    // カスタムフィールドの場合はドキュメントから取得
    // registration の child_schema 解析ロジックを参考に、child_schema を経由して値を取得
    if (!field.is_fixed && field.field_path) {
      // 複数のドキュメントから値を集約する
      const collectedValues: any[] = [];
      
      // field_path を解析して child_schema を特定（再帰的に探索）
      // 例: pathology.immunohistochemistry.MLH1 → pathology が親スキーマ、immunohistochemistry が child_schema、MLH1 がフィールド
      // 例: initial_treatment.operation.手術日 → initial_treatment が親スキーマ、operation が child_schema、手術日 がフィールド
      //     operation スキーマにも child_schema がある場合は、さらに再帰的に探索
      let targetSchemaIdString: string | null = null;
      let actualFieldPath = field.field_path;
      
      if (field.field_path.includes('.')) {
        const pathParts = field.field_path.split('.');
        if (pathParts.length >= 2) {
          // field.schema_id_string からがん種を推測（例: /schema/CC/root -> CC）
          const currentSchema = field.schema_id_string || '';
          let cancerType = '';
          if (currentSchema.includes('/CC/')) {
            cancerType = 'CC';
          } else if (currentSchema.includes('/EM/')) {
            cancerType = 'EM';
          } else if (currentSchema.includes('/OV/')) {
            cancerType = 'OV';
          }
          
          // 配列インデックスを除去してスキーマ名を取得するヘルパー関数
          // 例: "術者[0]" -> "術者"
          const extractSchemaName = (part: string): string => {
            const match = part.match(/^(.+?)(\[\d+\])?$/);
            return match ? match[1] : part;
          };
          
          // 再帰的に child_schema を探索する関数
          const findChildSchemaRecursive = (
            parentSchemaId: number,
            pathParts: string[],
            startIndex: number
          ): { schemaIdString: string | null; remainingPath: string } => {
            if (startIndex >= pathParts.length) {
              return { schemaIdString: null, remainingPath: '' };
            }
            
            try {
              const parentSchemaInfo = GetSchemaInfo(parentSchemaId);
              if (!parentSchemaInfo) {
                return { schemaIdString: null, remainingPath: '' };
              }
              
              // child_schema と subschema を統合
              const schemaListToSearch = [
                ...(parentSchemaInfo.child_schema && Array.isArray(parentSchemaInfo.child_schema) ? parentSchemaInfo.child_schema : []),
                ...(parentSchemaInfo.subschema && Array.isArray(parentSchemaInfo.subschema) ? parentSchemaInfo.subschema : [])
              ];
              
              const targetPart = pathParts[startIndex];
              // 配列インデックスを除去してスキーマ名として比較
              const targetSchemaName = extractSchemaName(targetPart);
              
              // 現在の階層で targetSchemaName に一致するスキーマを探す
              for (const schemaId of schemaListToSearch) {
                try {
                  const schemaInfo = GetSchemaInfo(schemaId);
                  if (schemaInfo && schemaInfo.schema_id_string) {
                    const schemaIdString = schemaInfo.schema_id_string;
                    const schemaPathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
                    if (schemaPathParts.length > 0) {
                      const schemaPathName = schemaPathParts[schemaPathParts.length - 1];
                      if (targetSchemaName === schemaPathName) {
                        // 一致するスキーマが見つかった
                        // さらに深い階層がある場合は再帰的に探索
                        if (startIndex + 1 < pathParts.length) {
                          const result = findChildSchemaRecursive(schemaId, pathParts, startIndex + 1);
                          if (result.schemaIdString) {
                            // より深い階層で見つかった場合はそれを返す
                            return result;
                          }
                        }
                        // より深い階層がない、または見つからなかった場合は現在のスキーマを返す
                        // remainingPath には元の配列インデックスを含める
                        const remainingPath = startIndex + 1 < pathParts.length 
                          ? pathParts.slice(startIndex + 1).join('.')
                          : '';
                        return { schemaIdString, remainingPath };
                      }
                    }
                  }
                } catch (error) {
                  // エラーは無視して続行
                }
              }
              
              // child_schema または subschema で見つからなかった場合、
              // 現在のスキーマ内のプロパティ（配列を含む）として扱う
              // 例: operation スキーマ内の 術者[0] プロパティ
              if (startIndex < pathParts.length) {
                const remainingPath = pathParts.slice(startIndex).join('.');
                // 親スキーマの schema_id_string を取得
                const parentSchemaInfo = GetSchemaInfo(parentSchemaId);
                if (parentSchemaInfo && parentSchemaInfo.schema_id_string) {
                  return { schemaIdString: parentSchemaInfo.schema_id_string, remainingPath };
                }
              }
            } catch (error) {
              // エラーは無視して続行
            }
            
            return { schemaIdString: null, remainingPath: '' };
          };
          
          // 最初の部分から親スキーマを特定
          const firstPart = pathParts[0]; // pathology, initial_treatment, findings など
          let rootSchemaId: number | null = null;
          let startIndex = 0; // 再帰的探索の開始インデックス
          
          if (cancerType) {
            // まず、/schema/CC/${firstPart} を試す（例: /schema/CC/pathology, /schema/OV/findings）
            try {
              const parentSchemaIdString = `/schema/${cancerType}/${firstPart}`;
              const parentSchemaId = GetSchemaIdFromString(parentSchemaIdString);
              if (parentSchemaId !== -1) {
                rootSchemaId = parentSchemaId;
                // /schema/${cancerType}/${firstPart} が見つかった場合、startIndex を 1 に設定
                // （pathParts[0] は既に処理済みなので、pathParts[1] から探索）
                startIndex = 1;
              }
            } catch (error) {
              // エラーは無視して続行
            }
            
            // /schema/CC/${firstPart} が見つからない場合、/schema/CC/root の child_schema または subschema から探す
            // これは initial_treatment や findings などの場合に必要
            if (rootSchemaId === null || rootSchemaId === -1) {
              try {
                const rootSchemaIdForSearch = GetSchemaIdFromString(`/schema/${cancerType}/root`);
                if (rootSchemaIdForSearch !== -1) {
                  // /schema/CC/root の child_schema または subschema から firstPart に一致するスキーマを探す
                  const rootSchemaInfo = GetSchemaInfo(rootSchemaIdForSearch);
                  if (rootSchemaInfo) {
                    const schemaListToSearch = [
                      ...(rootSchemaInfo.child_schema && Array.isArray(rootSchemaInfo.child_schema) ? rootSchemaInfo.child_schema : []),
                      ...(rootSchemaInfo.subschema && Array.isArray(rootSchemaInfo.subschema) ? rootSchemaInfo.subschema : [])
                    ];
                    
                    // firstPart に一致するスキーマを探す
                    for (const schemaId of schemaListToSearch) {
                      try {
                        const schemaInfo = GetSchemaInfo(schemaId);
                        if (schemaInfo && schemaInfo.schema_id_string) {
                          const schemaIdString = schemaInfo.schema_id_string;
                          const schemaPathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
                          if (schemaPathParts.length > 0) {
                            const schemaPathName = schemaPathParts[schemaPathParts.length - 1];
                            if (firstPart === schemaPathName) {
                              rootSchemaId = schemaId;
                              // firstPart に一致するスキーマが見つかった場合、startIndex を 1 に設定
                              // （pathParts[0] は既に処理済みなので、pathParts[1] から探索）
                              startIndex = 1;
                              break;
                            }
                          }
                        }
                      } catch (error) {
                        // エラーは無視して続行
                      }
                    }
                    
                    // firstPart に一致するスキーマが見つからなかった場合は、/schema/CC/root から再帰的に探索
                    // この場合、startIndex は 0 のまま（pathParts[0] から探索）
                    if (rootSchemaId === null || rootSchemaId === -1) {
                      rootSchemaId = rootSchemaIdForSearch;
                    }
                  }
                }
              } catch (error) {
                // エラーは無視して続行
              }
            }
          }
          
          // 再帰的に child_schema を探索
          if (rootSchemaId !== null && rootSchemaId !== -1) {
            const result = findChildSchemaRecursive(rootSchemaId, pathParts, startIndex);
            if (result.schemaIdString) {
              targetSchemaIdString = result.schemaIdString;
              actualFieldPath = result.remainingPath || pathParts[pathParts.length - 1];
              console.log(`[PresetPatientDisplay] スキーマ解決結果: field_path=${field.field_path}, targetSchemaIdString=${targetSchemaIdString}, actualFieldPath=${actualFieldPath}`);
            } else {
              console.log(`[PresetPatientDisplay] スキーマ解決失敗: field_path=${field.field_path}, rootSchemaId=${rootSchemaId}, startIndex=${startIndex}, pathParts=${JSON.stringify(pathParts)}`);
            }
          }
        }
      }
      
      // 対象となるドキュメントを取得
      const targetDocuments: DocumentContent[] = [];
      if (targetSchemaIdString) {
        // targetSchemaIdString で一致するドキュメントを取得
        const matchingDocs = documents.filter(doc => doc.schema_id_string === targetSchemaIdString);
        targetDocuments.push(...matchingDocs);
        
        // inherit_schema の ID も含めてドキュメントを取得
        try {
          const targetSchemaId = GetSchemaIdFromString(targetSchemaIdString);
          if (targetSchemaId !== -1) {
            const targetSchemaInfo = GetSchemaInfo(targetSchemaId);
            if (targetSchemaInfo && targetSchemaInfo.inherit_schema && Array.isArray(targetSchemaInfo.inherit_schema)) {
              // inherit_schema の各 ID に対応する schema_id_string を取得
              for (const inheritSchemaId of targetSchemaInfo.inherit_schema) {
                try {
                  const inheritSchemaInfo = GetSchemaInfo(inheritSchemaId);
                  if (inheritSchemaInfo && inheritSchemaInfo.schema_id_string) {
                    const inheritMatchingDocs = documents.filter(doc => doc.schema_id_string === inheritSchemaInfo.schema_id_string);
                    targetDocuments.push(...inheritMatchingDocs);
                  }
                } catch (error) {
                  // エラーは無視して続行
                }
              }
            }
          }
        } catch (error) {
          // エラーは無視して続行
        }
      } else {
        // targetSchemaIdString が特定できない場合は、すべてのドキュメントから検索
        targetDocuments.push(...documents);
      }
      
      // すべてのドキュメントから値を取得
      for (const doc of targetDocuments) {
        // targetSchemaIdString が特定されている場合は actualFieldPath を使用、そうでない場合は元の field_path を使用
        let pathToUse = targetSchemaIdString ? actualFieldPath : field.field_path;
        
        // 配列インデックスを含むパスを処理（例: 術者[0].名前 -> 術者 にアクセスしてから [0] を処理）
        // getValueFromPath は配列インデックスを直接処理できないため、事前に処理する
        if (pathToUse && pathToUse.includes('[') && pathToUse.includes(']')) {
          // 配列インデックスを含むパスを解析
          const parts = pathToUse.split('.');
          let current = doc.document;
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const arrayIndexMatch = part.match(/^(.+?)\[(\d+)\]$/);
            
            if (arrayIndexMatch) {
              // 配列インデックスを含むパス（例: 術者[0]）
              const propertyName = arrayIndexMatch[1];
              const arrayIndex = parseInt(arrayIndexMatch[2], 10);
              
              if (current && typeof current === 'object' && !Array.isArray(current) && propertyName in current) {
                const arrayValue = current[propertyName];
                if (Array.isArray(arrayValue) && arrayValue.length > arrayIndex) {
                  current = arrayValue[arrayIndex];
                } else {
                  current = null;
                  break;
                }
              } else {
                current = null;
                break;
              }
            } else {
              // 通常のプロパティ
              if (current && typeof current === 'object' && !Array.isArray(current) && part in current) {
                current = current[part];
              } else if (Array.isArray(current) && current.length > 0) {
                // 配列の場合は最初の要素を使用
                current = current[0];
                if (current && typeof current === 'object' && part in current) {
                  current = current[part];
                } else {
                  current = null;
                  break;
                }
              } else {
                current = null;
                break;
              }
            }
          }
          
          // 値を抽出
          if (current !== null && current !== undefined) {
            const extractedValue = extractActualValue(current);
            if (extractedValue !== null && extractedValue !== undefined) {
              collectedValues.push(extractedValue);
            }
          }
          continue; // 次のドキュメントへ
        }
        
        // extractValue: false を指定して、配列の場合はすべての要素を取得できるようにする
        let value = getValueFromPath(doc.document, pathToUse, { extractValue: false });
        
        // 値がオブジェクトの場合は、その中から文字列や数値を探す
        if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
          // オブジェクトの中から文字列や数値を見つける
          const extractValueFromObject = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return null;
            
            // オブジェクトの各プロパティをチェック
            for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                const val = obj[key];
                // 文字列または数値の場合、それを返す
                if (typeof val === 'string' || typeof val === 'number') {
                  return val;
                }
                // オブジェクトの場合は再帰的に検索
                if (typeof val === 'object' && !Array.isArray(val)) {
                  const nestedValue = extractValueFromObject(val);
                  if (nestedValue !== null && nestedValue !== undefined) {
                    return nestedValue;
                  }
                }
              }
            }
            return null;
          };
          
          const extractedValue = extractValueFromObject(value);
          if (extractedValue !== null && extractedValue !== undefined) {
            value = extractedValue;
          } else {
            // 抽出できない場合は、オブジェクトをわかりやすく文字列化
            value = formatObjectToString(value);
          }
        }
        
        // 値が配列の場合は、すべての要素を追加
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            for (const item of value) {
              if (item !== null && item !== undefined && item !== '') {
                let itemStr: string;
                if (typeof item === 'object' && !Array.isArray(item)) {
                  itemStr = formatObjectToString(item);
                } else {
                  itemStr = String(item);
                }
                if (itemStr !== '' && !collectedValues.includes(itemStr)) {
                  collectedValues.push(itemStr);
                }
              }
            }
          } else {
            // 配列でない場合は、文字列として追加（重複を避ける）
            let valueStr: string;
            if (typeof value === 'object' && !Array.isArray(value)) {
              valueStr = formatObjectToString(value);
            } else {
              valueStr = String(value);
            }
            if (valueStr !== '' && !collectedValues.includes(valueStr)) {
              collectedValues.push(valueStr);
            }
          }
        }
      }
      
      // 集約した値を結合して表示（区切り文字は「・」）
      if (collectedValues.length > 0) {
        row[field.field_name] = collectedValues.join(SEPARATORS.STAGE);
      } else {
        row[field.field_name] = '';
      }
    } else if (!field.is_fixed) {
      row[field.field_name] = '';
    }
  }
  
  return row;
};

/**
 * formatPatientRowの結果をCSV出力用に変換する関数
 * @param formattedRow formatPatientRowで生成されたデータ行
 * @param field プリセットフィールド情報
 * @param documents ドキュメント配列（診断分割、登録情報、予後情報取得用）
 * @param getSchemaInfo スキーマ情報取得関数
 * @returns CSV出力用のデータオブジェクト
 */
export const convertToCsvFormat = (
  formattedRow: any,
  field: PresetField,
  documents: DocumentContent[],
  getSchemaInfo: any
): any => {
  const csvData: any = {};
  
  if (field.is_fixed) {
    switch (field.field_name) {
      case FIXED_FIELD_NAMES.PATIENT_ID:
        csvData.patientId = formattedRow[FIXED_FIELD_NAMES.PATIENT_ID] || formattedRow.his_id || '';
        break;
      case FIXED_FIELD_NAMES.PATIENT_NAME:
        csvData.patinetName = formattedRow[FIXED_FIELD_NAMES.PATIENT_NAME] || formattedRow.name || '';
        break;
      case FIXED_FIELD_NAMES.AGE:
        const ageValue = formattedRow[FIXED_FIELD_NAMES.AGE] || formattedRow.age;
        csvData.age = ageValue !== null && ageValue !== undefined ? String(ageValue) : '';
        break;
      case FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE:
        csvData.startDate = formattedRow[FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE] || '';
        break;
      case FIXED_FIELD_NAMES.LAST_UPDATE:
        csvData.lastUpdate = formattedRow[FIXED_FIELD_NAMES.LAST_UPDATE] || formattedRow.lastUpdate || '';
        break;
      case FIXED_FIELD_NAMES.DIAGNOSIS:
        // 診断を主要がん種とその他に分割
        const diagnosis = getDiagnosisSplit(documents, getSchemaInfo);
        csvData.diagnosisMajor = diagnosis.diagnosisMajor;
        csvData.diagnosisMinor = diagnosis.diagnosisMinor;
        break;
      case FIXED_FIELD_NAMES.ADVANCED_STAGE:
        csvData.advancedStage = formattedRow[FIXED_FIELD_NAMES.ADVANCED_STAGE] || DISPLAY_STRINGS.NOT_ENTERED;
        break;
      case FIXED_FIELD_NAMES.STATUS:
        // ステータス配列から各項目を展開
        const statusArray = formattedRow[FIXED_FIELD_NAMES.STATUS] || [];
        csvData.recurrence = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.RECURRENCE) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        csvData.chemotherapy = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.CHEMO) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        csvData.operation = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.SURGERY) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        csvData.radiotherapy = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.RADIO) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        csvData.supportiveCare = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.SUPPORTIVECARE) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        csvData.death = Array.isArray(statusArray) && statusArray.includes(STATUS_STRINGS.DEATH) ? DISPLAY_STRINGS.EXISTS : DISPLAY_STRINGS.NONE;
        
        // 登録情報を取得
        csvData.registration = getRegistration(documents, getSchemaInfo);
        
        // 3年予後・5年予後を取得
        const startDateForPrognosis = formattedRow[FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE] || '';
        const prognosis = getPrognosis(documents, getSchemaInfo, startDateForPrognosis);
        csvData.threeYearPrognosis = prognosis.threeYearPrognosis || DISPLAY_STRINGS.NONE;
        csvData.fiveYearPrognosis = prognosis.fiveYearPrognosis || DISPLAY_STRINGS.NONE;
        break;
    }
  } else {
    // カスタム項目の場合はformattedRowから取得、なければ空文字列
    const key = `custom_${field.field_id}`;
    const value = formattedRow[field.field_name];
    csvData[key] = value !== null && value !== undefined ? String(value) : '';
  }
  
  return csvData;
};

