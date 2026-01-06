/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiReturnObject, RESULT } from '../logic/ApiCommon';
import { logging, LOGTYPE } from '../logic/Logger';
import { DbAccess } from '../logic/DbAccess';
import { getUsernameFromRequest } from './Users';

// プリセットの型定義
export interface PresetData {
  preset_id?: number;
  preset_name: string;
  preset_description: string;
  created_by: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  is_active?: boolean;
}

// プリセット一覧の型定義
export interface PresetListData {
  preset_id: number;
  preset_name: string;
  preset_description: string;
  created_by: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  is_active?: boolean;
  field_count: number;
  visible_field_count: number;
  csv_export_count: number;
}

// プリセット項目の型定義
export interface PresetFieldData {
  field_id?: number;
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
  created_at?: string;
  updated_at?: string;
}

// 固定項目の型定義
export interface FixedFieldData {
  fixed_field_id: number;
  field_name: string;
  display_name: string;
  field_type: string;
  is_visible: boolean;
  is_csv_export: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

// プリセット詳細の型定義
export interface PresetDetailData {
  preset_id?: number;
  preset_name: string;
  preset_description: string;
  fields: PresetFieldData[];
  fixed_fields: FixedFieldData[];
}

/**
 * プリセット一覧を取得
 */
export const getPresetList = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Presets-getPresetList');
  
  const dbAccess = new DbAccess();
  
  try {
    await dbAccess.connectWithConf();
    
    // デバッグ: カスタム項目の集計を確認
    const customFieldQuery = `
      SELECT 
        preset_id,
        COUNT(field_id) as field_count,
        COUNT(CASE WHEN is_visible = true THEN 1 END) as visible_field_count,
        COUNT(CASE WHEN is_csv_export = true THEN 1 END) as csv_export_count
      FROM jesgo_preset_field
      GROUP BY preset_id
    `;
    const customFieldResult = await dbAccess.query(customFieldQuery) as any[];
    logging(LOGTYPE.DEBUG, `カスタム項目集計結果: ${JSON.stringify(customFieldResult)}`, 'Presets-getPresetList');
    
    // デバッグ: 固定項目の集計を確認
    const fixedFieldQuery = `
      SELECT 
        preset_id,
        COUNT(fixed_field_id) as fixed_field_count,
        COUNT(CASE WHEN is_visible = true THEN 1 END) as visible_fixed_field_count,
        COUNT(CASE WHEN is_csv_export = true THEN 1 END) as csv_export_fixed_count
      FROM jesgo_preset_fixed_field
      GROUP BY preset_id
    `;
    const fixedFieldResult = await dbAccess.query(fixedFieldQuery) as any[];
    logging(LOGTYPE.DEBUG, `固定項目集計結果: ${JSON.stringify(fixedFieldResult)}`, 'Presets-getPresetList');
    
    // デバッグ: プリセット12の詳細を確認（一時的に無効化）
    /*
    const preset12DetailQuery = `
      SELECT 
        'custom' as type,
        field_id::text as field_id,
        field_name,
        is_visible,
        is_csv_export
      FROM jesgo_preset_field 
      WHERE preset_id = 12
      UNION ALL
      SELECT 
        'fixed' as type,
        fixed_field_id::text as field_id,
        ff.field_name,
        COALESCE(pff.is_visible, ff.is_visible) as is_visible,
        COALESCE(pff.is_csv_export, ff.is_csv_export) as is_csv_export
      FROM jesgo_preset_fixed_field pff
      JOIN jesgo_fixed_field ff ON pff.fixed_field_id = ff.fixed_field_id
      WHERE pff.preset_id = 12
      ORDER BY type, field_id
    `;
    const preset12DetailResult = await dbAccess.query(preset12DetailQuery) as any[];
    logging(LOGTYPE.DEBUG, `プリセット12の詳細項目: ${JSON.stringify(preset12DetailResult)}`, 'Presets-getPresetList');
    */
    
    // プリセット一覧と項目数を取得
    const query = `
      SELECT 
        p.preset_id,
        p.preset_name,
        p.preset_description,
        p.created_by,
        p.created_at,
        p.updated_by,
        p.updated_at,
        p.is_active,
        (
          COALESCE(pf_count.field_count, 0) + 
          COALESCE(pff_count.fixed_field_count, 0)
        ) as field_count,
        (
          COALESCE(pf_count.visible_field_count, 0) + 
          COALESCE(pff_count.visible_fixed_field_count, 0)
        ) as visible_field_count,
        (
          COALESCE(pf_count.csv_export_count, 0) + 
          COALESCE(pff_count.csv_export_fixed_count, 0)
        ) as csv_export_count
      FROM jesgo_preset p
      LEFT JOIN (
        SELECT 
          preset_id,
          COUNT(field_id) as field_count,
          COUNT(CASE WHEN is_visible = true THEN 1 END) as visible_field_count,
          COUNT(CASE WHEN is_csv_export = true THEN 1 END) as csv_export_count
        FROM jesgo_preset_field
        WHERE is_fixed = false  -- カスタム項目のみをカウント
        GROUP BY preset_id
      ) pf_count ON p.preset_id = pf_count.preset_id
      LEFT JOIN (
        SELECT 
          preset_id,
          COUNT(fixed_field_id) as fixed_field_count,
          COUNT(CASE WHEN is_visible = true THEN 1 END) as visible_fixed_field_count,
          COUNT(CASE WHEN is_csv_export = true THEN 1 END) as csv_export_fixed_count
        FROM jesgo_preset_fixed_field
        GROUP BY preset_id
      ) pff_count ON p.preset_id = pff_count.preset_id
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
    `;
    
    const result = await dbAccess.query(query) as any[];
    
    logging(LOGTYPE.DEBUG, `[HOT RELOAD TEST 2] プリセット一覧取得 - 取得件数: ${result.length}`, 'Presets-getPresetList');
    
    // デバッグ: 各プリセットの詳細をログ出力
    result.forEach((preset, index) => {
      logging(LOGTYPE.DEBUG, `プリセット${index + 1}: ${preset.preset_name} - 項目数: ${preset.field_count}, 表示項目数: ${preset.visible_field_count}, CSV出力数: ${preset.csv_export_count}`, 'Presets-getPresetList');
    });
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: result as PresetListData[]
    };
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-getPresetList');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: 'プリセット一覧の取得に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

/**
 * プリセット詳細を取得
 */
export const getPresetDetail = async (presetId: number): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し - presetId: ${presetId}`, 'Presets-getPresetDetail');
  
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  
  try {
    // プリセット基本情報を取得
    const presetQuery = `
      SELECT 
        preset_id,
        preset_name,
        preset_description,
        created_by,
        created_at,
        updated_by,
        updated_at,
        is_active
      FROM jesgo_preset
      WHERE preset_id = $1 AND is_active = true
    `;
    
    const presetResult = await dbAccess.query(presetQuery, [presetId]) as any[];
    
    if (presetResult.length === 0) {
      return {
        statusNum: RESULT.FAILED_USER_ERROR,
        body: '指定されたプリセットが見つかりません'
      };
    }
    
    const preset = presetResult[0];
    
    // プリセット項目を取得
const fieldsQuery = `
      SELECT 
        pf.field_id,
        pf.preset_id,
        pf.schema_primary_id,
        pf.schema_id,
        pf.schema_id_string,
        pf.field_name,
        pf.display_name,
        pf.field_path,
        pf.field_type,
        pf.is_visible,
        pf.is_csv_export,
        pf.is_csv_header_display_name,
        pf.is_fixed,
        pf.display_order,
        pf.schema_title,
        pf.schema_version,
        pf.created_at,
        pf.updated_at
      FROM jesgo_preset_field pf
      WHERE pf.preset_id = $1
      ORDER BY pf.display_order
`;
    
    const fieldsResult = await dbAccess.query(fieldsQuery, [presetId]) as any[];
    
    // 固定項目を取得（プリセットごとの設定を含む）
    const fixedFieldsQuery = `
      SELECT 
        pff.fixed_field_id,
        ff.field_name,
        ff.display_name,
        COALESCE(pff.field_type, ff.field_type) as field_type,
        COALESCE(pff.is_visible, ff.is_visible) as is_visible,
        COALESCE(pff.is_csv_export, ff.is_csv_export) as is_csv_export,
        pff.display_order,
        ff.created_at,
        ff.updated_at
      FROM jesgo_preset_fixed_field pff
      JOIN jesgo_fixed_field ff ON pff.fixed_field_id = ff.fixed_field_id
      WHERE pff.preset_id = $1
      ORDER BY pff.display_order
    `;
    
    const fixedFieldsResult = await dbAccess.query(fixedFieldsQuery, [presetId]) as any[];
    
    logging(LOGTYPE.DEBUG, `固定項目取得結果: ${JSON.stringify(fixedFieldsResult)}`, 'Presets-getPresetDetail');
    
    // 固定項目のマスターデータを取得
    const fixedFieldMasterQuery = `
      SELECT
        fixed_field_id,
        field_name,
        display_name,
        field_type,
        is_visible,
        is_csv_export,
        created_at,
        updated_at
      FROM jesgo_fixed_field
      ORDER BY fixed_field_id
    `;
    
    const fixedFieldMasterResult = await dbAccess.query(fixedFieldMasterQuery, []) as any[];
    
    logging(LOGTYPE.DEBUG, `固定項目マスターデータ: ${JSON.stringify(fixedFieldMasterResult)}`, 'Presets-getPresetDetail');
    
    // fields配列から固定項目を分離
    const allFields = fieldsResult as PresetFieldData[];
    const fixedFields = allFields.filter(field => field.is_fixed);
    const customFields = allFields.filter(field => !field.is_fixed);
    
    // 固定項目のマッピング（field_nameでマッチング）
    const mappedFixedFields = fixedFields.map(field => {
      const fixedFieldInfo = fixedFieldMasterResult.find(ff => ff.field_name === field.field_name);
      return {
        fixed_field_id: fixedFieldInfo?.fixed_field_id || 0, // マッチしない場合は0
        field_name: field.field_name,
        display_name: field.display_name,
        field_type: fixedFieldInfo?.field_type || 'unknown',
        is_visible: field.is_visible,
        is_csv_export: field.is_csv_export,
        display_order: field.display_order,
        created_at: field.created_at,
        updated_at: field.updated_at
      };
    });
    
    const presetDetail: PresetDetailData = {
      preset_id: preset.preset_id,
      preset_name: preset.preset_name,
      preset_description: preset.preset_description,
      fields: allFields, // 全フィールド（固定項目とカスタム項目）
      fixed_fields: mappedFixedFields as FixedFieldData[]
    };
    
    logging(LOGTYPE.DEBUG, `プリセット詳細データ: ${JSON.stringify(presetDetail)}`, 'Presets-getPresetDetail');
    
    logging(LOGTYPE.DEBUG, `プリセット詳細取得成功 - 項目数: ${allFields.length}, 固定項目数: ${mappedFixedFields.length}`, 'Presets-getPresetDetail');
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: presetDetail
    };
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-getPresetDetail');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: 'プリセット詳細の取得に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

/**
 * 固定項目のマスターデータを取得
 */
export const getFixedFieldMaster = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Presets-getFixedFieldMaster');
  
  const dbAccess = new DbAccess();
  
  try {
    await dbAccess.connectWithConf();
    
    const query = `
      SELECT
        fixed_field_id,
        field_name,
        display_name,
        field_type,
        is_visible,
        is_csv_export,
        created_at,
        updated_at
      FROM jesgo_fixed_field
      ORDER BY fixed_field_id
    `;
    
    const result = await dbAccess.query(query) as any[];
    
    logging(LOGTYPE.DEBUG, `固定項目マスターデータ取得成功 - 取得件数: ${result.length}`, 'Presets-getFixedFieldMaster');
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: result
    };
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-getFixedFieldMaster');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: '固定項目マスターデータの取得に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

/**
 * プリセットを保存（新規作成・更新）
 */
export const savePreset = async (presetData: PresetDetailData, req: any): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し - presetName: ${presetData.preset_name}`, 'Presets-savePreset');
  logging(LOGTYPE.DEBUG, `固定項目データ: ${JSON.stringify(presetData.fixed_fields)}`, 'Presets-savePreset');
  
  // preset_id = 1 の場合は更新不可（システムプリセット）
  if (presetData.preset_id === 1) {
    logging(LOGTYPE.WARN, `システムプリセットの編集は許可されていません - presetId: ${presetData.preset_id}`, 'Presets-savePreset');
    return {
      statusNum: RESULT.FAILED_USER_ERROR,
      body: 'システムプリセットは編集できません'
    };
  }
  
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  
  try {
    // ユーザー名を取得
    const userName = getUsernameFromRequest(req);
    logging(LOGTYPE.DEBUG, `ユーザー名: ${userName}`, 'Presets-savePreset');
    
    let presetId: number;
    
    if (presetData.preset_id) {
      // 更新
      const updateQuery = `
        UPDATE jesgo_preset 
        SET 
          preset_name = $1,
          preset_description = $2,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE preset_id = $4 AND is_active = true
        RETURNING preset_id
      `;
      
      const updateResult = await dbAccess.query(updateQuery, [
        presetData.preset_name,
        presetData.preset_description,
        userName,
        presetData.preset_id
      ]) as any[];
      
      if (updateResult.length === 0) {
        return {
          statusNum: RESULT.FAILED_USER_ERROR,
          body: '指定されたプリセットが見つかりません'
        };
      }
      
      presetId = updateResult[0].preset_id;
      
      // 既存の項目を削除
      await dbAccess.query('DELETE FROM jesgo_preset_field WHERE preset_id = $1', [presetId]);
      await dbAccess.query('DELETE FROM jesgo_preset_fixed_field WHERE preset_id = $1', [presetId]);
    } else {
      // 新規作成
      const insertQuery = `
        INSERT INTO jesgo_preset (preset_name, preset_description, created_by, created_at, updated_by, updated_at, is_active)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP, true)
        RETURNING preset_id
      `;
      
      const insertResult = await dbAccess.query(insertQuery, [
        presetData.preset_name,
        presetData.preset_description,
        userName
      ]) as any[];
      
      presetId = insertResult[0].preset_id;
    }
    
    // プリセット項目を保存
    // display_orderを連番に再採番
    const sortedFields = presetData.fields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    for (let i = 0; i < sortedFields.length; i++) {
      const field = sortedFields[i];
      field.display_order = i + 1; // 1から始まる連番
      
      const fieldQuery = `
        INSERT INTO jesgo_preset_field (
          preset_id, schema_primary_id, schema_id, schema_id_string,
          field_name, display_name, field_path, field_type, is_visible, is_csv_export,
          is_csv_header_display_name, is_fixed, display_order, schema_title, schema_version,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      // 固定項目の場合はスキーマ関連情報を登録しない
      const schemaPrimaryId = field.is_fixed ? null : (field.schema_primary_id || null);
      const schemaId = field.is_fixed ? null : (field.schema_id || null);
      const schemaIdString = field.is_fixed ? null : (field.schema_id_string || null);
      const fieldPath = field.is_fixed ? null : (field.field_path || null);
      const fieldType = field.field_type || null;
      const schemaTitle = field.is_fixed ? null : (field.schema_title || null);
      const schemaVersion = field.is_fixed ? null : (field.schema_version || null);
      const isCsvHeaderDisplayName = field.is_csv_header_display_name !== undefined ? field.is_csv_header_display_name : false;
      
      await dbAccess.query(fieldQuery, [
        presetId,
        schemaPrimaryId,
        schemaId,
        schemaIdString,
        field.field_name,
        field.display_name,
        fieldPath,
        fieldType,
        field.is_visible,
        field.is_csv_export,
        isCsvHeaderDisplayName,
        field.is_fixed,
        field.display_order,
        schemaTitle,
        schemaVersion
      ]);
    }
    
    // 固定項目を保存
    // display_orderを連番に再採番
    const sortedFixedFields = presetData.fixed_fields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    for (let i = 0; i < sortedFixedFields.length; i++) {
      const fixedField = sortedFixedFields[i];
      fixedField.display_order = i + 1; // 1から始まる連番
      
      const fixedFieldQuery = `
        INSERT INTO jesgo_preset_fixed_field (preset_id, fixed_field_id, display_order, field_type, is_visible, is_csv_export)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await dbAccess.query(fixedFieldQuery, [
        presetId,
        fixedField.fixed_field_id,
        fixedField.display_order,
        fixedField.field_type || null,
        fixedField.is_visible !== undefined ? fixedField.is_visible : true,
        fixedField.is_csv_export !== undefined ? fixedField.is_csv_export : true
      ]);
    }
    
    logging(LOGTYPE.DEBUG, `プリセット保存成功 - presetId: ${presetId}`, 'Presets-savePreset');
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: { preset_id: presetId }
    };
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-savePreset');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: 'プリセットの保存に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

/**
 * プリセットを削除（論理削除）
 */
export const deletePreset = async (presetId: number, userId: number): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し - presetId: ${presetId}, userId: ${userId}`, 'Presets-deletePreset');
  
  // preset_id = 1 の場合は削除不可（システムプリセット）
  if (presetId === 1) {
    logging(LOGTYPE.WARN, `システムプリセットの削除は許可されていません - presetId: ${presetId}`, 'Presets-deletePreset');
    return {
      statusNum: RESULT.FAILED_USER_ERROR,
      body: 'システムプリセットは削除できません'
    };
  }
  
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  
  try {
    // まず、削除対象のプリセットが存在するかチェック
    const checkQuery = `
      SELECT preset_id, preset_name, is_active 
      FROM jesgo_preset 
      WHERE preset_id = $1
    `;
    
    const checkResult = await dbAccess.query(checkQuery, [presetId]) as any[];
    logging(LOGTYPE.DEBUG, `プリセット存在チェック結果: ${JSON.stringify(checkResult)}`, 'Presets-deletePreset');
    
    // 全プリセット一覧も取得してデバッグ情報として出力
    const allPresetsQuery = `SELECT preset_id, preset_name, is_active FROM jesgo_preset ORDER BY preset_id`;
    const allPresetsResult = await dbAccess.query(allPresetsQuery) as any[];
    logging(LOGTYPE.DEBUG, `全プリセット一覧: ${JSON.stringify(allPresetsResult)}`, 'Presets-deletePreset');
    
    if (checkResult.length === 0) {
      logging(LOGTYPE.WARN, `プリセットが存在しません - presetId: ${presetId}`, 'Presets-deletePreset');
      return {
        statusNum: RESULT.FAILED_USER_ERROR,
        body: '指定されたプリセットが見つかりません'
      };
    }
    
    const preset = checkResult[0];
    if (!preset.is_active) {
      logging(LOGTYPE.WARN, `プリセットは既に削除済みです - presetId: ${presetId}`, 'Presets-deletePreset');
      return {
        statusNum: RESULT.FAILED_USER_ERROR,
        body: '指定されたプリセットは既に削除されています'
      };
    }
    
    const query = `
      UPDATE jesgo_preset 
      SET 
        is_active = false,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE preset_id = $2 AND is_active = true
      RETURNING preset_id
    `;
    
    const result = await dbAccess.query(query, [userId.toString(), presetId]) as any[];
    
    logging(LOGTYPE.DEBUG, `削除処理結果: ${JSON.stringify(result)}`, 'Presets-deletePreset');
    
    // RETURNING句を使用して影響を受けた行数をチェック
    if (!result || result.length === 0) {
      logging(LOGTYPE.WARN, `プリセットの削除に失敗 - presetId: ${presetId}`, 'Presets-deletePreset');
      return {
        statusNum: RESULT.FAILED_USER_ERROR,
        body: '指定されたプリセットが見つかりません'
      };
    }
    
    logging(LOGTYPE.DEBUG, `プリセット削除成功 - presetId: ${presetId}`, 'Presets-deletePreset');
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: 'プリセットを削除しました'
    };
    
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-deletePreset');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: 'プリセットの削除に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

/**
 * 固定項目一覧を取得
 */
export const getFixedFieldList = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Presets-getFixedFieldList');
  
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  
  try {
    const query = `
      SELECT 
        fixed_field_id,
        field_name,
        display_name,
        field_type,
        is_visible,
        is_csv_export,
        display_order,
        created_at,
        updated_at
      FROM jesgo_fixed_field
      ORDER BY display_order
    `;
    
    const result = await dbAccess.query(query) as any[];
    
    logging(LOGTYPE.DEBUG, `固定項目取得件数: ${result.length}`, 'Presets-getFixedFieldList');
    
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: result as FixedFieldData[]
    };
  } catch (error) {
    logging(LOGTYPE.ERROR, `エラー: ${error}`, 'Presets-getFixedFieldList');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: '固定項目一覧の取得に失敗しました'
    };
  } finally {
    await dbAccess.end();
  }
};

export default {
  getPresetList,
  getPresetDetail,
  getFixedFieldMaster,
  savePreset,
  deletePreset,
  getFixedFieldList
};
