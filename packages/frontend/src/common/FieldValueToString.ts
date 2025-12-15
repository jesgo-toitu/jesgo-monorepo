/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { JSONSchema7 } from 'json-schema';
import { getPropItemsAndNames } from '../components/CaseRegistration/SchemaUtility';

/**
 * フィールド値の型定義
 */
export type FieldValue = string | number | boolean | null | undefined | FieldValue[] | { [key: string]: FieldValue };

/**
 * フィールド情報の型定義
 */
export type FieldInfo = {
  /** フィールド名 */
  name: string;
  /** フィールドの値 */
  value: FieldValue;
  /** フィールドのタイプ */
  type?: string;
  /** フィールドのパス */
  path: string;
  /** スキーマ情報 */
  schema?: JSONSchema7;
  /** 入力可能かどうか */
  isEditable: boolean;
  /** 必須フィールドかどうか */
  isRequired: boolean;
};

/**
 * フィールド値取得結果の型定義
 */
export type FieldExtractionResult = {
  /** 抽出されたフィールド一覧 */
  fields: FieldInfo[];
  /** フィールド総数 */
  totalCount: number;
  /** 入力可能フィールド数 */
  editableCount: number;
  /** 必須フィールド数 */
  requiredCount: number;
};

/**
 * 値を文字列に変換する
 * @param value 変換する値
 * @param schema スキーマ情報（オプション）
 * @returns 文字列化された値
 */
export const valueToString = (value: FieldValue, schema?: JSONSchema7): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    // 数値の場合、小数点以下があるかチェック
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    // 配列の場合、各要素を文字列化してカンマ区切りで結合
    return value.map(item => valueToString(item, schema)).join(', ');
  }

  if (typeof value === 'object') {
    // オブジェクトの場合、JSON文字列化
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }

  return String(value);
};

/**
 * スキーマからフィールドが入力可能かどうかを判定する
 * @param schema スキーマ情報
 * @returns 入力可能かどうか
 */
export const isFieldEditable = (schema?: JSONSchema7): boolean => {
  if (!schema) {
    return true; // スキーマがない場合は入力可能とする
  }

  // readonlyまたはhiddenの場合は入力不可
  if (schema.readOnly === true || (schema as any)['jesgo:ui:hidden'] === true) {
    return false;
  }

  return true;
};

/**
 * スキーマからフィールドが必須かどうかを判定する
 * @param schema スキーマ情報
 * @param parentRequired 親の必須フィールド一覧
 * @param fieldName フィールド名
 * @returns 必須かどうか
 */
export const isFieldRequired = (
  schema?: JSONSchema7,
  parentRequired?: string[],
  fieldName?: string
): boolean => {
  if (!schema || !fieldName) {
    return false;
  }

  // スキーマのrequiredプロパティをチェック
  if (schema.required && schema.required.includes(fieldName)) {
    return true;
  }

  // 親のrequiredプロパティをチェック
  if (parentRequired && parentRequired.includes(fieldName)) {
    return true;
  }

  return false;
};

/**
 * フォームデータから入力可能フィールドを再帰的に抽出する
 * @param formData フォームデータ
 * @param schema スキーマ情報
 * @param parentPath 親のパス（再帰用）
 * @param parentRequired 親の必須フィールド一覧
 * @returns フィールド情報一覧
 */
export const extractEditableFields = (
  formData: any,
  schema?: JSONSchema7,
  parentPath = '',
  parentRequired?: string[]
): FieldInfo[] => {
  const fields: FieldInfo[] = [];

  if (!formData || typeof formData !== 'object') {
    return fields;
  }

  // スキーマのpropertiesを取得
  const schemaProps = schema ? getPropItemsAndNames(schema) : { pItems: {}, pNames: [] };

  // フォームデータの各プロパティを処理
  Object.entries(formData).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const fieldSchema = schemaProps.pItems[key] as JSONSchema7 | undefined;
    
    // スキーマに存在するフィールドのみを処理
    if (fieldSchema) {
      const isEditable = isFieldEditable(fieldSchema);
      const isRequired = isFieldRequired(fieldSchema, parentRequired, key);

      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        // オブジェクトの場合は再帰的に処理
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const childFields = extractEditableFields(
            value,
            fieldSchema,
            currentPath,
            fieldSchema.required
          );
          fields.push(...childFields);
        }
      } else if (fieldSchema.type === 'array' && fieldSchema.items) {
        // 配列の場合は各要素を処理
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            const arrayItemPath = `${currentPath}[${index}]`;
            const arrayItemSchema = fieldSchema.items as JSONSchema7;
            
            if (arrayItemSchema.type === 'object' && arrayItemSchema.properties) {
              const childFields = extractEditableFields(
                item,
                arrayItemSchema,
                arrayItemPath,
                arrayItemSchema.required
              );
              fields.push(...childFields);
            } else {
              fields.push({
                name: key,
                value: item,
                type: Array.isArray(arrayItemSchema.type) ? arrayItemSchema.type[0] : arrayItemSchema.type,
                path: arrayItemPath,
                schema: arrayItemSchema,
                isEditable,
                isRequired,
              });
            }
          });
        }
      } else {
        // 通常のフィールド
        fields.push({
          name: key,
          value: value as FieldValue,
          type: Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type,
          path: currentPath,
          schema: fieldSchema,
          isEditable,
          isRequired,
        });
      }
    } else {
      // スキーマに存在しないフィールド（フォームデータにのみ存在）
      fields.push({
        name: key,
        value: value as FieldValue,
        type: typeof value,
        path: currentPath,
        schema: undefined,
        isEditable: true, // スキーマにない場合は入力可能とする
        isRequired: false,
      });
    }
  });

  return fields;
};

/**
 * フォームデータから入力可能フィールドを抽出し、文字列化する
 * @param formData フォームデータ
 * @param schema スキーマ情報（オプション）
 * @returns フィールド抽出結果
 */
export const extractFieldsToString = (
  formData: any,
  schema?: JSONSchema7
): FieldExtractionResult => {
  const fields = extractEditableFields(formData, schema);
  
  const editableFields = fields.filter(field => field.isEditable);
  const requiredFields = fields.filter(field => field.isRequired);

  return {
    fields,
    totalCount: fields.length,
    editableCount: editableFields.length,
    requiredCount: requiredFields.length,
  };
};

/**
 * フィールド情報を文字列として取得する
 * @param fieldInfo フィールド情報
 * @returns 文字列化されたフィールド情報
 */
export const fieldInfoToString = (fieldInfo: FieldInfo): string => {
  const valueStr = valueToString(fieldInfo.value, fieldInfo.schema);
  const typeStr = fieldInfo.type || 'unknown';
  const editableStr = fieldInfo.isEditable ? '編集可能' : '読み取り専用';
  const requiredStr = fieldInfo.isRequired ? '必須' : '任意';
  
  return `[${fieldInfo.path}] ${fieldInfo.name}: "${valueStr}" (${typeStr}, ${editableStr}, ${requiredStr})`;
};

/**
 * 全てのフィールド情報を文字列として取得する
 * @param result フィールド抽出結果
 * @param includeNonEditable 非編集可能フィールドも含めるかどうか
 * @returns 文字列化された全フィールド情報
 */
export const allFieldsToString = (
  result: FieldExtractionResult,
  includeNonEditable = false
): string => {
  const targetFields = includeNonEditable ? result.fields : result.fields.filter(f => f.isEditable);
  
  const header = `=== フィールド一覧 ===
総数: ${result.totalCount}
入力可能: ${result.editableCount}
必須: ${result.requiredCount}
`;

  const fieldStrings = targetFields.map(fieldInfoToString).join('\n');
  
  return `${header}\n${fieldStrings}`;
};

/**
 * 特定のパターンに一致するフィールドを検索する
 * @param result フィールド抽出結果
 * @param pattern 検索パターン（正規表現または文字列）
 * @param caseSensitive 大文字小文字を区別するかどうか
 * @returns 一致するフィールド情報一覧
 */
export const searchFields = (
  result: FieldExtractionResult,
  pattern: string | RegExp,
  caseSensitive = false
): FieldInfo[] => {
  const regex = typeof pattern === 'string' 
    ? new RegExp(pattern, caseSensitive ? 'g' : 'gi')
    : pattern;

  return result.fields.filter(field => {
    const searchText = `${field.name} ${field.path} ${valueToString(field.value, field.schema)}`;
    return regex.test(searchText);
  });
};
