/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  FormGroup,
  ControlLabel,
  FormControl,
  Table,
  Panel,
  Alert,
  Glyphicon,
  ButtonGroup,
  Modal,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { JesgoDocumentSchema } from '../store/schemaDataReducer';
import { GetSchemaInfo, storeSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import { TestResultDisplay, TestResult, DebugInfo } from '../components/Preset/DebugInfoDisplay';
import { useDispatch } from 'react-redux';
import {
  transformDocuments,
  formatPatientRow,
  DocumentContent as PresetDocumentContent,
  PatientInfo as PresetPatientInfo,
  PresetField as PresetDisplayField,
} from '../common/PresetPatientDisplay';
import {
  addStatus,
  addStatusAllowDuplicate,
  FIXED_FIELD_NAMES,
  STATUS_STRINGS,
  DISPLAY_STRINGS,
  SEPARATORS,
  getValueFromPath,
} from '@jesgo/common';

// プリセット項目の型定義
interface PresetField {
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
  is_fixed: boolean;
  display_order: number;
  schema_title?: string;
  schema_version?: string;
}

// プリセット詳細の型定義
interface PresetDetail {
  preset_id: number;
  preset_name: string;
  preset_description: string;
  fields: PresetField[];
  fixed_fields: any[];
}

// 患者情報の型定義
interface PatientInfo {
  case_id: number;
  name: string;
  date_of_birth: string;
  his_id: string;
  age?: number;
  lastUpdate?: string;
  date_of_death?: string | null;
  status?: string[];
}

// ドキュメント内容の型定義（PresetPatientDisplay.tsの型定義を使用）
type DocumentContent = PresetDocumentContent;

// テスト結果の型定義（DebugInfoDisplayからインポート）
// interface TestResult は DebugInfoDisplay.tsx で定義済み

const PresetDocumentTestView: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [presets, setPresets] = useState<PresetDetail[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetDetail | null>(null);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentContent[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentContent | null>(null);

  // Reduxストアからスキーマデータを取得
  const schemaDatas = useSelector((state: any) => state.schemaDataReducer.schemaDatas);

  // プリセット一覧を取得
  const loadPresets = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const result = await apiAccess(METHOD_TYPE.GET, '/preset-list');
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        // APIレスポンスの構造を確認して適切に処理
        const responseData = result.body as any;
        let presetList: any[] = [];
        
        if (Array.isArray(responseData)) {
          presetList = responseData;
        } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
          presetList = responseData.data;
        } else {
          console.warn('予期しないプリセットAPIレスポンス形式:', responseData);
          presetList = [];
        }
        
        // プリセット詳細を取得
        const presetDetails = await Promise.all(
          presetList.map(async (preset: any) => {
            const detailResult = await apiAccess(METHOD_TYPE.GET, `/preset-detail/${preset.preset_id}`);
            if (detailResult.statusNum === RESULT.NORMAL_TERMINATION) {
              const presetDetail = detailResult.body as PresetDetail;
              return presetDetail;
            } else {
              return null;
            }
          })
        );
        
        setPresets(presetDetails.filter(p => p !== null) as PresetDetail[]);
        setSuccessMessage(`プリセット一覧を取得しました（${presetDetails.filter(p => p !== null).length}件）`);
      } else {
        setErrorMessage(`プリセット一覧の取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      setErrorMessage('プリセット一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 患者一覧を取得
  const loadPatients = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const result = await apiAccess(METHOD_TYPE.GET, '/patientlist');
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        // APIレスポンスの構造を確認して適切に処理
        const responseData = result.body as any;
        let patientList: PatientInfo[] = [];
        
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          // 標準的なAPIレスポンス形式 { data: [...] }
          patientList = responseData.data.map((patient: any) => ({
            case_id: patient.caseId || patient.case_id,
            name: patient.patientName || patient.name,
            date_of_birth: patient.date_of_birth || '',
            his_id: patient.patientId || patient.his_id || '',
            age: patient.age || '',
            lastUpdate: patient.lastUpdate || patient.last_updated || '',
            date_of_death: patient.date_of_death || null,
            status: patient.status || []
          }));
        } else if (Array.isArray(responseData)) {
          // 直接配列が返される場合
          patientList = responseData.map((patient: any) => ({
            case_id: patient.caseId || patient.case_id,
            name: patient.patientName || patient.name,
            date_of_birth: patient.date_of_birth || '',
            his_id: patient.patientId || patient.his_id || '',
            age: patient.age || '',
            lastUpdate: patient.lastUpdate || patient.last_updated || '',
            date_of_death: patient.date_of_death || null,
            status: patient.status || []
          }));
        } else {
          console.warn('予期しないAPIレスポンス形式:', responseData);
          patientList = [];
        }
        
        setPatients(patientList);
        setSuccessMessage(`患者一覧を取得しました（${patientList.length}件）`);
      } else {
        setErrorMessage(`患者一覧の取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      setErrorMessage('患者一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 患者のドキュメントを取得
  const loadPatientDocuments = async (caseId: number) => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const result = await apiAccess(METHOD_TYPE.GET, `/getCaseAndDocument/${caseId}`);
      console.log('ドキュメント取得API結果:', result);
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        const caseData = result.body as any;
        console.log('ケースデータ:', caseData);
        console.log('jesgo_document:', caseData.jesgo_document);
        
        // 共通関数を使用してドキュメントを変換
        const documents = transformDocuments(caseData.jesgo_document || []);
        
        console.log('変換したドキュメント:', documents);
        setDocuments(documents);
        setSuccessMessage(`患者のドキュメントを取得しました（${documents.length}件）`);
      } else {
        console.error('ドキュメント取得失敗:', result.body);
        setErrorMessage(`ドキュメントの取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      console.error('ドキュメント取得エラー:', error);
      setErrorMessage('ドキュメントの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フィールドパスから値を取得する関数（共通関数を使用）
  // テスト用にオブジェクトをJSON形式でシリアライズするラッパー関数
  const getValueFromPathForTest = (document: any, fieldPath: string): any => {
    const value = getValueFromPath(document, fieldPath);
    // テスト用にオブジェクトの場合はJSON形式でシリアライズ
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  // スキーマID文字列から親スキーマを取得する関数
  const getParentSchemas = (schemaIdString: string): number[] => {
    try {
      if (!schemaIdString) return [];
      
      // スキーマ情報を取得
      const schemaDatasMap = schemaDatas as Map<number, JesgoDocumentSchema[]>;
      if (!schemaDatasMap) return [];
      
      // まず対象のスキーマIDを取得
      let targetSchemaId = null;
      for (const schemas of schemaDatasMap.values()) {
        if (Array.isArray(schemas)) {
          for (const schema of schemas) {
            if (schema.schema_id_string === schemaIdString) {
              targetSchemaId = schema.schema_primary_id;
              break;
            }
          }
        }
        if (targetSchemaId !== null) break;
      }
      
      if (targetSchemaId === null) return [];
      
      // すべてのスキーマを走査して、対象のスキーマIDが含まれている親スキーマを見つける
      const parentIds: number[] = [];
      for (const schemas of schemaDatasMap.values()) {
        if (Array.isArray(schemas)) {
          for (const schema of schemas) {
            // subschemaまたはchild_schemaにtargetSchemaIdが含まれている場合、親として追加
            const subschemaIds = schema.subschema || [];
            const childSchemaIds = schema.child_schema || [];
            
            if (subschemaIds.includes(targetSchemaId) || childSchemaIds.includes(targetSchemaId)) {
              parentIds.push(schema.schema_primary_id);
            }
          }
        }
      }
      
      return parentIds;
    } catch (error) {
      console.error('親スキーマ取得エラー:', error);
      return [];
    }
  };

  // デフォルト項目の値を取得する関数
  const getDefaultFieldValue = (fieldName: string, patientData: any, documents: DocumentContent[]): any => {
    switch (fieldName) {
      case '患者ID':
        return patientData.his_id || patientData.patientId || '';
      
      case '患者名':
        return patientData.name || patientData.patientName || '';
      
      case '年齢':
        return patientData.age || '';
      
      case '初回治療開始日':
        return getInitialTreatmentDate(documents);
      
      case '最終更新日':
        return patientData.lastUpdate || patientData.last_updated || '';
      
      case '診断':
        return getDiagnosis(documents);
      
      case '進行期':
        return getAdvancedStage(documents);
      
      case 'ステータス':
        return getStatus(documents, patientData);
      
      default:
        return null;
    }
  };

  // 初回治療開始日を取得（患者リスト表示と同じロジック）
  const getInitialTreatmentDate = (documents: DocumentContent[]): string => {
    let earliestDate: string | null = null;
    
    
    for (const doc of documents) {
      
      if (doc.document && typeof doc.document === 'object') {
        // initial_treatment_dateタグが付いた項目を探す
        const treatmentDate = findValueByTag(doc.document, 'initial_treatment_date');
        
        if (treatmentDate && typeof treatmentDate === 'string' && treatmentDate !== '') {
          // 日付変換に失敗する値の場合は無視する
          if (!isNaN(new Date(treatmentDate).getFullYear())) {
            // 初回治療日がもともと記録されていないか、もっと古いものであれば書き換える
            if (!earliestDate || earliestDate > treatmentDate) {
              earliestDate = treatmentDate;
            }
          }
        }
      }
    }
    
    return earliestDate || '';
  };

  // 診断を取得（CANCER_MAJOR + CANCER_MINOR）- バックエンドのaddStatus関数を模倣
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
  
  // addStatus は @jesgo/common からインポート

  // 進行期を取得（FIGOタグ）- バックエンドのaddStatusAllowDuplicate関数を模倣
  const getAdvancedStage = (documents: DocumentContent[]): string => {
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
        const schemaInfo = GetSchemaInfo(doc.schema_id, doc.event_date);
        
        // スキーマにFIGOタグがあるかチェック
        const hasFigoTag = schemaInfo && JSON.stringify(schemaInfo.document_schema).toLowerCase().includes('figo');
        
        if (hasFigoTag) {
          // スキーマにFIGOタグがある場合、値を取得
          if ('FIGO' in doc.document) {
            const figoValue = doc.document['FIGO'];
            
            // 値が空の場合は「未」を使用（バックエンドと同じ）
            const figoStage = (typeof figoValue === 'string' && figoValue !== '') ? figoValue : DISPLAY_STRINGS.NOT_ENTERED;
            advancedStage = addStatusAllowDuplicate(advancedStage, figoStage, SEPARATORS.STAGE);
          } else {
            // FIGOプロパティがない場合は「未」を追加
            advancedStage = addStatusAllowDuplicate(advancedStage, DISPLAY_STRINGS.NOT_ENTERED, SEPARATORS.STAGE);
          }
        }
      }
    }
    
    // バックエンドと同じロジック: 空または「未」のみの場合は「未」を返す
    const regex = new RegExp(/^[未・]*$/);
    if (advancedStage === '' || regex.test(advancedStage)) {
      return DISPLAY_STRINGS.NOT_ENTERED;
    }
    
    return advancedStage;
  };
  
  // addStatusAllowDuplicate は @jesgo/common からインポート

  // ステータスを取得
  const getStatus = (documents: DocumentContent[], patientData: any): string[] => {
    const status: string[] = [];
    
    // 死亡ステータス
    if (patientData.date_of_death || patientData.status?.includes('death')) {
      status.push('death');
    }
    
    // 治療法ステータス
    for (const doc of documents) {
      if (doc.document && typeof doc.document === 'object') {
        // まず治療施行状況プロパティで直接検索（フォールバック）
        if (doc.document['治療施行状況'] && typeof doc.document['治療施行状況'] === 'string') {
          const treatmentStatus = doc.document['治療施行状況'];
          
          if (treatmentStatus.includes('手術') || treatmentStatus.includes('初回手術施行例')) {
            status.push('surgery');
          }
          if (treatmentStatus.includes('化学療法') || treatmentStatus.includes('薬物療法')) {
            status.push('chemo');
          }
          if (treatmentStatus.includes('放射線')) {
            status.push('radio');
          }
          if (treatmentStatus.includes('支持療法')) {
            status.push('supportivecare');
          }
        } else {
          // タグベースの検索（治療施行状況プロパティがない場合のみ）
          if (findValueByTag(doc.document, 'treatment_surgery')) {
            status.push('surgery');
          }
          
          if (findValueByTag(doc.document, 'treatment_chemo')) {
            status.push('chemo');
          }
          
          if (findValueByTag(doc.document, 'treatment_radio')) {
            status.push('radio');
          }
          
          if (findValueByTag(doc.document, 'treatment_supportivecare')) {
            status.push('supportivecare');
          }
        }
        
        // 再発（常にタグベースで検索）
        if (findValueByTag(doc.document, 'recurrence')) {
          status.push('recurrence');
        }
      }
    }
    
    return [...new Set(status)]; // 重複を除去
  };

  // タグに基づいて値を検索する関数（バックエンドのgetPropertyNameFromTagと同じロジック）
  const findValueByTag = (document: any, tagName: string): any => {
    
    if (!document || typeof document !== 'object') {
      return null;
    }
    
    // まず、プロパティ名での直接アクセスを試す
    const directPropertyMap: { [key: string]: string[] } = {
      'initial_treatment_date': ['初回治療開始日', 'initial_treatment_date'],
      'cancer_major': ['がん種', 'cancer_major'],
      'cancer_minor': ['がん種', 'cancer_minor'],
      'figo': ['FIGO', 'figo'],
      'recurrence': ['再発', 'recurrence']
    };
    
    const possibleNames = directPropertyMap[tagName] || [];
    for (const propName of possibleNames) {
      if (document[propName] && document[propName] !== '') {
        return document[propName];
      }
    }
    
    // 治療関連タグの特別処理
    if (tagName.startsWith('treatment_')) {
      const treatmentStatus = document['治療施行状況'];
      
      if (treatmentStatus && typeof treatmentStatus === 'string') {
        switch (tagName) {
          case 'treatment_surgery':
            if (treatmentStatus.includes('手術') || treatmentStatus.includes('初回手術施行例')) {
              return 'surgery';
            }
            break;
          case 'treatment_chemo':
            if (treatmentStatus.includes('化学療法') || treatmentStatus.includes('薬物療法')) {
              return 'chemo';
            }
            break;
          case 'treatment_radio':
            if (treatmentStatus.includes('放射線')) {
              return 'radio';
            }
            break;
          case 'treatment_supportivecare':
            if (treatmentStatus.includes('支持療法')) {
              return 'supportivecare';
            }
            break;
        }
      }
      return null;
    }
    
    // プロパティ名での直接アクセスが失敗した場合、タグベースの検索を実行
    const searchInObject = (obj: any, path: string = ''): any => {
      if (obj === null || typeof obj !== 'object') {
        return null;
      }
      
      
      // オブジェクトの各プロパティをチェック
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // 値がオブジェクトで、jesgo:tagプロパティを持つ場合
        if (typeof value === 'object' && value !== null && 'jesgo:tag' in value) {
          const tagValue = (value as any)['jesgo:tag'];
          
          if (tagValue && tagValue === tagName) {
            // タグが完全一致した場合、ドキュメントのプロパティ名から値を取得
            const documentValue = document[key];
            return documentValue;
          }
        }
        
        // 値がオブジェクトの場合は再帰的に検索
        if (typeof value === 'object' && value !== null) {
          const result = searchInObject(value, currentPath);
          if (result !== null) {
            return result;
          }
        }
      }
      
      return null;
    };
    
    const result = searchInObject(document);
    return result;
  };

  // ドキュメント内容を整形して表示する関数
  const formatDocumentValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      return `[配列: ${value.length}件]`;
    }
    
    if (typeof value === 'object') {
      return `{オブジェクト: ${Object.keys(value).length}プロパティ}`;
    }
    
    return String(value);
  };

  // ドキュメント構造を分析する関数
  const analyzeDocumentStructure = (document: any): any => {
    if (!document || typeof document !== 'object') {
      return { type: 'primitive', value: document };
    }
    
    if (Array.isArray(document)) {
      return {
        type: 'array',
        length: document.length,
        items: document.slice(0, 3).map((item, index) => ({
          index,
          structure: analyzeDocumentStructure(item)
        }))
      };
    }
    
    const structure: any = {
      type: 'object',
      properties: Object.keys(document).map(key => ({
        key,
        type: typeof document[key],
        isArray: Array.isArray(document[key]),
        structure: analyzeDocumentStructure(document[key])
      }))
    };
    
    return structure;
  };

  // テスト実行
  const runTest = async () => {
    if (!selectedPreset || !selectedPatient) {
      setErrorMessage('プリセットと患者を選択してください');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setTestResults([]);

    try {
      
      if (!selectedPreset.fields || selectedPreset.fields.length === 0) {
        setErrorMessage('プリセットにフィールドが設定されていません');
        return;
      }
      
      // 患者のドキュメントを直接取得
      const result = await apiAccess(METHOD_TYPE.GET, `/getCaseAndDocument/${selectedPatient.case_id}`);
      
      if (result.statusNum !== RESULT.NORMAL_TERMINATION) {
        setErrorMessage(`ドキュメントの取得に失敗しました: ${result.body}`);
        return;
      }

      const caseData = result.body as any;
      
      // 共通関数を使用してドキュメントを変換
      const documents = transformDocuments(caseData.jesgo_document || []);
      
      console.log('runTest - 変換したドキュメント:', documents);
      setDocuments(documents);

      const results: TestResult[] = [];

      // プリセットの各項目についてテスト
      for (const field of selectedPreset.fields) {
        
        // デフォルト項目（固定項目）の場合はfield_pathが不要
        // カスタム項目でfield_pathが空の場合も、プロパティ名での直接アクセスを試す
        if (!field.is_fixed && !field.field_path) {
          
          // この項目のスキーマIDに対応するドキュメントのみを取得
          const matchingDocuments = documents.filter(doc => 
            doc.schema_id_string === field.schema_id_string
          );
          
          // プロパティ名での直接アクセスを試す
          const directPropertyMap: { [key: string]: string[] } = {
            'がん種': ['がん種', 'cancer_major', 'cancer_minor'],
            '診断': ['がん種', 'cancer_major', 'cancer_minor'],
            '進行期': ['FIGO', 'figo'],
            '治療法': ['治療施行状況', 'treatment_surgery', 'treatment_chemo', 'treatment_radio', 'treatment_supportivecare'],
            'ステータス': ['治療施行状況', 'treatment_surgery', 'treatment_chemo', 'treatment_radio', 'treatment_supportivecare', 'recurrence']
          };
          
          const possibleNames = directPropertyMap[field.field_name] || [field.field_name];
          let foundValue = null;
          
          for (const doc of matchingDocuments) {
            if (doc.document && typeof doc.document === 'object') {
              for (const propName of possibleNames) {
                if (doc.document[propName] && doc.document[propName] !== '') {
                  foundValue = doc.document[propName];
                  break;
                }
              }
              if (foundValue) break;
            }
          }
          
          const testResult: TestResult = {
            field_name: field.field_name,
            display_name: field.display_name,
            field_path: `プロパティ名直接アクセス: ${field.field_name}`,
            schema_id_string: field.schema_id_string || '',
            expected_path: `プロパティ名直接アクセス: ${field.field_name}`,
            actual_value: foundValue,
            is_match: foundValue !== null && foundValue !== undefined && foundValue !== '',
            debug_info: {
              document_found: matchingDocuments.length > 0,
              field_path_resolved: `プロパティ名直接アクセス: ${field.field_name}`,
              value_type: typeof foundValue,
              processing_time_ms: 0
            }
          };
          
          results.push(testResult);
          continue;
        }

        const testResult: TestResult = {
          field_name: field.field_name,
          display_name: field.display_name,
          field_path: field.is_fixed ? `デフォルト項目: ${field.field_name}` : (field.field_path || ''),
          schema_id_string: field.schema_id_string || '',
          expected_path: field.is_fixed ? `デフォルト項目: ${field.field_name}` : (field.field_path || ''),
          actual_value: null,
          is_match: false,
        };

        const startTime = performance.now();
        
        try {
          // デフォルト項目（固定項目）の場合はformatPatientRowを使用
          if (field.is_fixed) {
            // formatPatientRowを使用して値を取得
            const formattedRow = formatPatientRow(
              selectedPatient as any,
              [field] as any,
              documents,
              GetSchemaInfo
            );
            const actualValue = formattedRow[field.field_name];
            const processingTime = performance.now() - startTime;
            
            testResult.actual_value = actualValue;
            testResult.is_match = actualValue !== null && actualValue !== undefined && actualValue !== '';
            testResult.expected_path = `デフォルト項目: ${field.field_name}`;
            testResult.debug_info = {
              document_found: true,
              field_path_resolved: `デフォルト項目: ${field.field_name}`,
              value_type: typeof actualValue,
              processing_time_ms: Math.round(processingTime * 100) / 100
            };
          } else {
            // カスタム項目の場合もformatPatientRowを使用（画面表示と同じロジック）
            console.log(`カスタム項目処理開始: ${field.display_name} (${field.field_name})`);
            console.log(`field.schema_id: ${field.schema_id || '未設定'}`);
            console.log(`field.schema_id_string: ${field.schema_id_string || '未設定'}`);
            console.log(`検索対象schema_id_string: ${field.schema_id_string}`);
            console.log(`検索対象field_path: ${field.field_path}`);
            console.log(`ドキュメント数: ${documents.length}`);
            
            // formatPatientRowを使用して値を取得（画面表示と同じロジック）
            const formattedRow = formatPatientRow(
              selectedPatient as any,
              [field] as any,
              documents,
              GetSchemaInfo,
              true // includeInvisible=trueで全ての項目を処理
            );
            const actualValue = formattedRow[field.field_name];
            const processingTime = performance.now() - startTime;
            
            // 見つかったドキュメントを特定（テスト結果表示用）
            let foundDocument: DocumentContent | null = null;
            if (field.field_path) {
              // field_pathに基づいてドキュメントを探す
              const pathPrefix = field.field_path.includes('.') ? field.field_path.split('.')[0] : null;
              let targetSchemaIdString = field.schema_id_string;
              
              if (pathPrefix === 'staging') {
                const currentSchema = field.schema_id_string || '';
                if (currentSchema.includes('/CC/')) {
                  targetSchemaIdString = '/schema/CC/staging';
                } else if (currentSchema.includes('/EM/')) {
                  targetSchemaIdString = '/schema/EM/staging';
                } else if (currentSchema.includes('/OV/')) {
                  targetSchemaIdString = '/schema/OV/staging';
                }
              }
              
              foundDocument = documents.find(doc => doc.schema_id_string === targetSchemaIdString) || null;
            }
            
            testResult.actual_value = actualValue;
            testResult.is_match = actualValue !== null && actualValue !== undefined && actualValue !== '';
            testResult.debug_info = {
              document_found: foundDocument !== null,
              document_id: foundDocument?.document_id,
              schema_id: foundDocument?.schema_id,
              field_path_resolved: field.field_path || '',
              value_type: typeof actualValue,
              processing_time_ms: Math.round(processingTime * 100) / 100
            };
          }
        } catch (error) {
          const processingTime = performance.now() - startTime;
          testResult.error_message = `エラー: ${error}`;
          testResult.debug_info = {
            document_found: false,
            processing_time_ms: Math.round(processingTime * 100) / 100
          };
        }

        results.push(testResult);
      }

      setTestResults(results);
      setSuccessMessage(`テスト完了: ${results.length}項目をテストしました`);
    } catch (error) {
      setErrorMessage('テスト実行中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ドキュメント詳細を表示
  const showDocumentDetail = (document: DocumentContent) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      // スキーマ情報をロード
      await storeSchemaInfo(dispatch);
      loadPresets();
      loadPatients();
    };
    
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initialize();
  }, [dispatch]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>プリセット・ドキュメント連携テスト</h2>
      
      {/* エラー・成功メッセージ */}
      {errorMessage && (
        <Alert bsStyle="danger" onDismiss={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert bsStyle="success" onDismiss={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* プリセット選択 */}
      <Panel>
        <Panel.Heading>
          <Panel.Title>1. プリセット選択</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <FormGroup>
            <ControlLabel>プリセット</ControlLabel>
            <FormControl
              componentClass="select"
              value={selectedPreset?.preset_id || ''}
              onChange={(e) => {
                const presetId = parseInt((e.target as HTMLSelectElement).value, 10);
                const preset = Array.isArray(presets) ? presets.find(p => p.preset_id === presetId) : null;
                setSelectedPreset(preset || null);
              }}
            >
              <option value="">プリセットを選択してください</option>
              {Array.isArray(presets) && presets.map((preset) => (
                <option key={preset.preset_id} value={preset.preset_id}>
                  {preset.preset_name} - {preset.preset_description}
                </option>
              ))}
            </FormControl>
          </FormGroup>
          
          {selectedPreset && (
            <div style={{ marginTop: '15px' }}>
              <h4>選択されたプリセット: {selectedPreset.preset_name}</h4>
              <p>{selectedPreset.preset_description}</p>
              <p>項目数: {selectedPreset.fields.length}</p>
            </div>
          )}
        </Panel.Body>
      </Panel>

      {/* 患者選択 */}
      <Panel>
        <Panel.Heading>
          <Panel.Title>2. 患者選択</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <FormGroup>
            <ControlLabel>患者</ControlLabel>
            <FormControl
              componentClass="select"
              value={selectedPatient?.case_id || ''}
              onChange={(e) => {
                const caseId = parseInt((e.target as HTMLSelectElement).value, 10);
                const patient = Array.isArray(patients) ? patients.find(p => p.case_id === caseId) : null;
                setSelectedPatient(patient || null);
              }}
            >
              <option value="">患者を選択してください</option>
              {Array.isArray(patients) && patients.map((patient) => (
                <option key={patient.case_id} value={patient.case_id}>
                  {patient.name} (ID: {patient.case_id})
                </option>
              ))}
            </FormControl>
          </FormGroup>
          
          {selectedPatient && (
            <div style={{ marginTop: '15px' }}>
              <h4>選択された患者: {selectedPatient.name}</h4>
              <p>患者ID: {selectedPatient.case_id}</p>
              <p>生年月日: {selectedPatient.date_of_birth}</p>
            </div>
          )}
        </Panel.Body>
      </Panel>

      {/* テスト実行 */}
      <Panel>
        <Panel.Heading>
          <Panel.Title>3. テスト実行</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <Button
            bsStyle="primary"
            onClick={runTest}
            disabled={!selectedPreset || !selectedPatient || isLoading}
          >
            {isLoading ? 'テスト実行中...' : 'テスト実行'}
          </Button>
          
          {isLoading && (
            <div style={{ marginTop: '10px' }}>
              <Glyphicon glyph="refresh" className="glyphicon-spin" /> テストを実行中...
            </div>
          )}
        </Panel.Body>
      </Panel>

      {/* テスト結果 */}
      {testResults.length > 0 && (
        <Panel>
          <Panel.Heading>
            <Panel.Title>4. テスト結果</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <div style={{ marginBottom: '15px' }}>
              <ButtonGroup>
                <Button
                  bsStyle="success"
                  onClick={() => {
                    const successCount = testResults.filter(r => r.is_match).length;
                    alert(`成功: ${successCount}件 / 全${testResults.length}件`);
                  }}
                >
                  成功件数表示
                </Button>
                <Button
                  bsStyle="danger"
                  onClick={() => {
                    const failCount = testResults.filter(r => !r.is_match).length;
                    alert(`失敗: ${failCount}件 / 全${testResults.length}件`);
                  }}
                >
                  失敗件数表示
                </Button>
              </ButtonGroup>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table striped bordered hover style={{ tableLayout: 'auto', wordWrap: 'break-word' }}>
                <thead>
                  <tr>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>項目名</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>表示名</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>フィールドパス</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>スキーマID</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>取得値</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>結果</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>デバッグ情報</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>エラー</th>
                    <th style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <TestResultDisplay
                      key={index}
                      result={result}
                      onShowDocument={(schemaIdString) => {
                        const doc = Array.isArray(documents) ? documents.find(d => d.schema_id_string === schemaIdString) : null;
                        if (doc) showDocumentDetail(doc);
                      }}
                    />
                  ))}
                </tbody>
              </Table>
            </div>
          </Panel.Body>
        </Panel>
      )}

      {/* ドキュメント詳細モーダル */}
      <Modal
        show={showDocumentModal}
        onHide={() => setShowDocumentModal(false)}
        style={{ width: '90%', maxWidth: '1000px' }}
      >
        <Modal.Header closeButton>
          <Modal.Title>ドキュメント詳細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDocument && (
            <div>
              <h4>スキーマ情報</h4>
              <p>スキーマID: {selectedDocument.schema_id}</p>
              <p>スキーマID文字列: {selectedDocument.schema_id_string}</p>
              <p>イベント日: {selectedDocument.event_date}</p>
              
              <h4>ドキュメント構造分析</h4>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(analyzeDocumentStructure(selectedDocument.document), null, 2)}
              </pre>
              
              <h4>ドキュメント内容（JSON）</h4>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(selectedDocument.document, null, 2)}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowDocumentModal(false)}>閉じる</Button>
        </Modal.Footer>
      </Modal>

      {/* ナビゲーション */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Button 
          bsStyle="primary"
          onClick={() => {
            console.log('プリセット管理画面に戻ります...');
            navigate('/PresetManager');
          }}
        >
          プリセット管理画面に戻る
        </Button>
      </div>
    </div>
  );
};

export default PresetDocumentTestView;

