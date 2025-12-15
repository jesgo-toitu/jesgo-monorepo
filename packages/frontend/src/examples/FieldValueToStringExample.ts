/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSONSchema7 } from 'json-schema';
import {
  extractFieldsToString,
  allFieldsToString,
  searchFields,
  valueToString,
  FieldExtractionResult,
} from '../common/FieldValueToString';

/**
 * 台帳登録画面のサンプルフォームデータ
 */
const sampleFormData = {
  // 患者基本情報
  patientId: '12345',
  patientName: '田中太郎',
  dateOfBirth: '1980-01-01',
  
  // がん種情報
  cancerType: '子宮体がん',
  stage: 'IA',
  
  // 治療情報
  treatment: {
    surgery: {
      date: '2024-01-15',
      method: '腹腔鏡下手術',
      complications: false,
    },
    chemotherapy: [
      {
        startDate: '2024-02-01',
        endDate: '2024-08-01',
        regimen: 'TC療法',
        cycles: 6,
        response: 'CR',
      },
      {
        startDate: '2024-09-01',
        endDate: '2024-11-01',
        regimen: 'AC療法',
        cycles: 4,
        response: 'PR',
      },
    ],
    radiation: {
      startDate: '2024-03-01',
      endDate: '2024-04-15',
      dose: 50.4,
      fractions: 28,
    },
  },
  
  // 経過観察
  followUp: [
    {
      date: '2024-06-01',
      status: '良好',
      tumorMarkers: {
        ca125: 15.2,
        cea: 2.1,
      },
    },
    {
      date: '2024-12-01',
      status: '良好',
      tumorMarkers: {
        ca125: 18.5,
        cea: 2.3,
      },
    },
  ],
  
  // その他の情報
  notes: '患者は治療に協力的で、副作用も軽微です。',
  riskFactors: ['高血圧', '糖尿病'],
};

/**
 * 台帳登録画面のサンプルスキーマ
 */
const sampleSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: '患者ID',
      description: '患者を識別するためのID',
    },
    patientName: {
      type: 'string',
      title: '患者氏名',
      description: '患者の氏名',
    },
    dateOfBirth: {
      type: 'string',
      format: 'date',
      title: '生年月日',
    },
    cancerType: {
      type: 'string',
      title: 'がん種',
      enum: ['子宮体がん', '子宮頸がん', '卵巣がん'],
    },
    stage: {
      type: 'string',
      title: '病期',
      enum: ['IA', 'IB', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IVA', 'IVB'],
    },
    treatment: {
      type: 'object',
      title: '治療情報',
      properties: {
        surgery: {
          type: 'object',
          title: '手術',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              title: '手術日',
            },
            method: {
              type: 'string',
              title: '手術方法',
            },
            complications: {
              type: 'boolean',
              title: '合併症の有無',
            },
          },
          required: ['date', 'method'],
        },
        chemotherapy: {
          type: 'array',
          title: '化学療法',
          items: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                format: 'date',
                title: '開始日',
              },
              endDate: {
                type: 'string',
                format: 'date',
                title: '終了日',
              },
              regimen: {
                type: 'string',
                title: 'レジメン',
              },
              cycles: {
                type: 'integer',
                title: 'サイクル数',
                minimum: 1,
              },
              response: {
                type: 'string',
                title: '奏効',
                enum: ['CR', 'PR', 'SD', 'PD'],
              },
            },
            required: ['startDate', 'regimen', 'cycles'],
          },
        },
        radiation: {
          type: 'object',
          title: '放射線療法',
          properties: {
            startDate: {
              type: 'string',
              format: 'date',
              title: '開始日',
            },
            endDate: {
              type: 'string',
              format: 'date',
              title: '終了日',
            },
            dose: {
              type: 'number',
              title: '総線量 (Gy)',
            },
            fractions: {
              type: 'integer',
              title: '分割数',
            },
          },
        },
      },
    },
    followUp: {
      type: 'array',
      title: '経過観察',
      items: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            format: 'date',
            title: '観察日',
          },
          status: {
            type: 'string',
            title: '状態',
          },
          tumorMarkers: {
            type: 'object',
            title: '腫瘍マーカー',
            properties: {
              ca125: {
                type: 'number',
                title: 'CA125',
              },
              cea: {
                type: 'number',
                title: 'CEA',
              },
            },
          },
        },
        required: ['date', 'status'],
      },
    },
    notes: {
      type: 'string',
      title: '備考',
    },
    riskFactors: {
      type: 'array',
      title: 'リスク因子',
      items: {
        type: 'string',
      },
    },
  },
  required: ['patientId', 'patientName', 'dateOfBirth', 'cancerType'],
};

/**
 * フィールド値文字列化の使用例
 */
export const demonstrateFieldValueToString = (): void => {
  console.log('=== 台帳登録画面のフィールド値文字列化デモ ===\n');

  // 1. フィールド抽出
  const result: FieldExtractionResult = extractFieldsToString(sampleFormData, sampleSchema);
  
  console.log(`総フィールド数: ${result.totalCount}`);
  console.log(`入力可能フィールド数: ${result.editableCount}`);
  console.log(`必須フィールド数: ${result.requiredCount}\n`);

  // 2. 全フィールドの文字列化（入力可能フィールドのみ）
  console.log('=== 入力可能フィールド一覧 ===');
  console.log(allFieldsToString(result, false));

  // 3. 全フィールドの文字列化（全てのフィールド）
  console.log('\n=== 全フィールド一覧 ===');
  console.log(allFieldsToString(result, true));

  // 4. 特定の値の文字列化
  console.log('\n=== 個別値の文字列化例 ===');
  console.log(`患者ID: "${valueToString(sampleFormData.patientId)}"`);
  console.log(`生年月日: "${valueToString(sampleFormData.dateOfBirth)}"`);
  console.log(`手術情報: "${valueToString(sampleFormData.treatment.surgery)}"`);
  console.log(`化学療法配列: "${valueToString(sampleFormData.treatment.chemotherapy)}"`);

  // 5. フィールド検索
  console.log('\n=== フィールド検索例 ===');
  const surgeryFields = searchFields(result, 'surgery', false);
  console.log('「surgery」を含むフィールド:');
  surgeryFields.forEach(field => {
    console.log(`  - ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });

  const dateFields = searchFields(result, /date/i);
  console.log('\n日付関連フィールド:');
  dateFields.forEach(field => {
    console.log(`  - ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });

  // 6. 必須フィールドの確認
  console.log('\n=== 必須フィールドの確認 ===');
  const requiredFields = result.fields.filter(field => field.isRequired);
  requiredFields.forEach(field => {
    const hasValue = field.value !== null && field.value !== undefined && field.value !== '';
    console.log(`  ${field.path}: ${hasValue ? '✓' : '✗'} "${valueToString(field.value, field.schema)}"`);
  });
};

/**
 * 実際のフォームデータでの使用例
 * @param formData 実際のフォームデータ
 * @param schema 実際のスキーマ（オプション）
 */
export const useWithRealFormData = (formData: any, schema?: JSONSchema7): FieldExtractionResult => {
  console.log('=== 実際のフォームデータでの使用 ===\n');
  
  const result = extractFieldsToString(formData, schema);
  
  console.log(`フォームデータから抽出されたフィールド数: ${result.totalCount}`);
  console.log(`入力可能フィールド数: ${result.editableCount}`);
  console.log(`必須フィールド数: ${result.requiredCount}\n`);
  
  // 入力可能フィールドのみを文字列化して表示
  const editableFields = result.fields.filter(field => field.isEditable);
  console.log('入力可能フィールド一覧:');
  editableFields.forEach(field => {
    console.log(`  ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });
  
  return result;
};

/**
 * フィルタリング機能の使用例
 * @param result フィールド抽出結果
 */
export const demonstrateFiltering = (result: FieldExtractionResult): void => {
  console.log('\n=== フィルタリング機能のデモ ===\n');
  
  // 必須フィールドのみ
  const requiredFields = result.fields.filter(field => field.isRequired);
  console.log('必須フィールドのみ:');
  requiredFields.forEach(field => {
    console.log(`  ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });
  
  // 空でないフィールドのみ
  const nonEmptyFields = result.fields.filter(field => {
    const value = valueToString(field.value, field.schema);
    return value !== '' && value !== 'null' && value !== 'undefined';
  });
  console.log('\n値が設定されているフィールドのみ:');
  nonEmptyFields.forEach(field => {
    console.log(`  ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });
  
  // 特定の型のフィールドのみ
  const stringFields = result.fields.filter(field => field.type === 'string');
  console.log('\n文字列型フィールドのみ:');
  stringFields.forEach(field => {
    console.log(`  ${field.path}: "${valueToString(field.value, field.schema)}"`);
  });
};

// デモ実行（コメントアウトして使用）
// demonstrateFieldValueToString();

