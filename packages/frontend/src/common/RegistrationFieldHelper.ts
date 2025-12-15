/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { JSONSchema7 } from 'json-schema';
import { GetSchemaInfo, CustomSchema } from '../components/CaseRegistration/SchemaUtility';
import {
  extractFieldsToString,
  allFieldsToString,
  searchFields,
  valueToString,
  FieldExtractionResult,
  FieldInfo,
} from './FieldValueToString';
import { Const } from './Const';

/**
 * 台帳登録画面用のフィールド値取得ヘルパー
 */
export class RegistrationFieldHelper {
  private formData: any;
  private schemaId: number;
  private documentId: string;

  constructor(formData: any, schemaId: number, documentId: string) {
    this.formData = formData;
    this.schemaId = schemaId;
    this.documentId = documentId;
  }

  /**
   * スキーマ情報を取得する
   */
  private getSchema(): JSONSchema7 | undefined {
    const schemaInfo = GetSchemaInfo(this.schemaId);
    if (!schemaInfo) {
      return undefined;
    }

    // カスタムスキーマを生成（既存のロジックを使用）
    return CustomSchema({
      orgSchema: schemaInfo.document_schema,
      formData: this.formData,
    });
  }

  /**
   * 入力可能フィールドを抽出する
   */
  public extractEditableFields(): FieldExtractionResult {
    const schema = this.getSchema();
    return extractFieldsToString(this.formData, schema);
  }

  /**
   * 入力可能フィールドを文字列として取得する
   */
  public getEditableFieldsAsString(includeNonEditable = false): string {
    const result = this.extractEditableFields();
    return allFieldsToString(result, includeNonEditable);
  }

  /**
   * 特定のパターンに一致するフィールドを検索する
   */
  public searchFields(pattern: string | RegExp, caseSensitive = false): FieldInfo[] {
    const result = this.extractEditableFields();
    return searchFields(result, pattern, caseSensitive);
  }

  /**
   * 必須フィールドの入力状況をチェックする
   */
  public checkRequiredFields(): {
    missingFields: FieldInfo[];
    completedFields: FieldInfo[];
    summary: string;
  } {
    const result = this.extractEditableFields();
    const requiredFields = result.fields.filter(field => field.isRequired);

    const missingFields: FieldInfo[] = [];
    const completedFields: FieldInfo[] = [];

    requiredFields.forEach(field => {
      const value = valueToString(field.value, field.schema);
      const isEmpty = value === '' || value === 'null' || value === 'undefined';
      
      if (isEmpty) {
        missingFields.push(field);
      } else {
        completedFields.push(field);
      }
    });

    const summary = `必須フィールド: ${completedFields.length}/${requiredFields.length} 入力済み`;
    
    return {
      missingFields,
      completedFields,
      summary,
    };
  }

  /**
   * フィールド値を文字列として取得する
   */
  public getFieldValueAsString(fieldPath: string): string {
    const schema = this.getSchema();
    const result = this.extractEditableFields();
    
    const field = result.fields.find(f => f.path === fieldPath);
    if (!field) {
      return '';
    }

    return valueToString(field.value, field.schema);
  }

  /**
   * 特定の型のフィールドのみを取得する
   */
  public getFieldsByType(type: string): FieldInfo[] {
    const result = this.extractEditableFields();
    return result.fields.filter(field => field.type === type);
  }

  /**
   * 空でないフィールドのみを取得する
   */
  public getNonEmptyFields(): FieldInfo[] {
    const result = this.extractEditableFields();
    return result.fields.filter(field => {
      const value = valueToString(field.value, field.schema);
      return value !== '' && value !== 'null' && value !== 'undefined';
    });
  }

  /**
   * フォームデータの統計情報を取得する
   */
  public getFormStatistics(): {
    totalFields: number;
    editableFields: number;
    requiredFields: number;
    completedRequiredFields: number;
    nonEmptyFields: number;
    fieldTypeCounts: { [type: string]: number };
  } {
    const result = this.extractEditableFields();
    const requiredCheck = this.checkRequiredFields();
    const nonEmptyFields = this.getNonEmptyFields();

    const fieldTypeCounts: { [type: string]: number } = {};
    result.fields.forEach(field => {
      const type = field.type || 'unknown';
      fieldTypeCounts[type] = (fieldTypeCounts[type] || 0) + 1;
    });

    return {
      totalFields: result.totalCount,
      editableFields: result.editableCount,
      requiredFields: result.requiredCount,
      completedRequiredFields: requiredCheck.completedFields.length,
      nonEmptyFields: nonEmptyFields.length,
      fieldTypeCounts,
    };
  }
}

/**
 * 台帳登録画面でフィールド値を文字列取得するための便利関数
 * @param formData フォームデータ
 * @param schemaId スキーマID
 * @param documentId ドキュメントID
 * @returns RegistrationFieldHelperインスタンス
 */
export const createFieldHelper = (
  formData: any,
  schemaId: number,
  documentId: string
): RegistrationFieldHelper => {
  return new RegistrationFieldHelper(formData, schemaId, documentId);
};

/**
 * 複数のドキュメントのフィールド情報を統合して取得する
 * @param documents ドキュメント一覧
 * @returns 統合されたフィールド情報
 */
export const getIntegratedFieldInfo = (documents: Array<{
  formData: any;
  schemaId: number;
  documentId: string;
  title?: string;
}>): {
  totalFields: number;
  totalEditableFields: number;
  totalRequiredFields: number;
  documents: Array<{
    documentId: string;
    title?: string;
    fieldCount: number;
    editableCount: number;
    requiredCount: number;
    fields: FieldInfo[];
  }>;
  allFields: FieldInfo[];
} => {
  let totalFields = 0;
  let totalEditableFields = 0;
  let totalRequiredFields = 0;
  const allFields: FieldInfo[] = [];
  
  const documentsInfo = documents.map(doc => {
    const helper = createFieldHelper(doc.formData, doc.schemaId, doc.documentId);
    const result = helper.extractEditableFields();
    
    totalFields += result.totalCount;
    totalEditableFields += result.editableCount;
    totalRequiredFields += result.requiredCount;
    
    allFields.push(...result.fields);
    
    return {
      documentId: doc.documentId,
      title: doc.title,
      fieldCount: result.totalCount,
      editableCount: result.editableCount,
      requiredCount: result.requiredCount,
      fields: result.fields,
    };
  });

  return {
    totalFields,
    totalEditableFields,
    totalRequiredFields,
    documents: documentsInfo,
    allFields,
  };
};

/**
 * フィールド情報をCSV形式で出力する
 * @param fields フィールド情報一覧
 * @returns CSV文字列
 */
export const exportFieldsToCSV = (fields: FieldInfo[]): string => {
  const headers = ['パス', 'フィールド名', '値', '型', '入力可能', '必須'];
  const rows = fields.map(field => [
    field.path,
    field.name,
    valueToString(field.value, field.schema),
    field.type || 'unknown',
    field.isEditable ? 'Yes' : 'No',
    field.isRequired ? 'Yes' : 'No',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * フィールド情報をJSON形式で出力する
 * @param fields フィールド情報一覧
 * @returns JSON文字列
 */
export const exportFieldsToJSON = (fields: FieldInfo[]): string => {
  const jsonData = fields.map(field => ({
    path: field.path,
    name: field.name,
    value: field.value,
    stringValue: valueToString(field.value, field.schema),
    type: field.type,
    isEditable: field.isEditable,
    isRequired: field.isRequired,
    schema: field.schema,
  }));

  return JSON.stringify(jsonData, null, 2);
};

