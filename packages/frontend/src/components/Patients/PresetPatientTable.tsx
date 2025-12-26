import React, { useMemo } from 'react';
import {
  Table,
  Button,
  ButtonGroup,
  ButtonToolbar,
  Glyphicon,
} from 'react-bootstrap';
import IconList from './IconList';
import * as CommonConstants from '@jesgo/common';

interface PresetPatientRow {
  [key: string]: any;
}

interface PresetField {
  field_id?: number;
  field_name: string;
  display_name: string;
  is_visible: boolean;
  is_fixed?: boolean;
  display_order: number;
}

interface PresetPatientTableProps {
  patientData: PresetPatientRow[];
  presetFields: PresetField[];
  currentPage?: number;
  pageSize?: number;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSortChange?: (column: SortColumn, direction: SortDirection) => void;
  onEdit: (caseId: number) => void;
  onDelete: (caseId: number, hisId: string, name: string) => void;
  search?: string; // 腫瘍登録管理表示用の列の表示制御（'table-cell' | 'hidden'）
  noSearch?: string; // 患者リスト表示用の列の表示制御（'table-cell' | 'hidden'）
}

type SortColumn = string | null;
type SortDirection = 'asc' | 'desc' | null;

// プリセットフィールド名をバックエンドのソートカラム名にマッピング
const mapFieldNameToSortColumn = (fieldName: string, field?: PresetField): string | null => {
  // USER_DATA_PROPERTIES が undefined の場合は、直接文字列を使用
  const USER_DATA_PROPERTIES = CommonConstants.USER_DATA_PROPERTIES || {
    PATIENT_ID: 'patientId',
    PATIENT_NAME: 'patientName',
    AGE: 'age',
    START_DATE: 'startDate',
    LAST_UPDATE: 'lastUpdate',
    DIAGNOSIS: 'diagnosis',
    ADVANCED_STAGE: 'advancedStage',
  };
  const FIXED_FIELD_NAMES = CommonConstants.FIXED_FIELD_NAMES || {
    PATIENT_ID: '患者ID',
    PATIENT_NAME: '患者名',
    AGE: '年齢',
    INITIAL_TREATMENT_DATE: '初回治療開始日',
    LAST_UPDATE: '最終更新日',
    DIAGNOSIS: '診断',
    ADVANCED_STAGE: '進行期',
  };
  
  const mapping: { [key: string]: string } = {
    [FIXED_FIELD_NAMES.PATIENT_ID]: USER_DATA_PROPERTIES.PATIENT_ID,
    [FIXED_FIELD_NAMES.PATIENT_NAME]: USER_DATA_PROPERTIES.PATIENT_NAME,
    [FIXED_FIELD_NAMES.AGE]: USER_DATA_PROPERTIES.AGE,
    [FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE]: USER_DATA_PROPERTIES.START_DATE,
    [FIXED_FIELD_NAMES.LAST_UPDATE]: USER_DATA_PROPERTIES.LAST_UPDATE,
    [FIXED_FIELD_NAMES.DIAGNOSIS]: USER_DATA_PROPERTIES.DIAGNOSIS,
    [FIXED_FIELD_NAMES.ADVANCED_STAGE]: USER_DATA_PROPERTIES.ADVANCED_STAGE,
  };
  
  // 固定項目の場合は既存のマッピングを使用
  if (mapping[fieldName]) {
    return mapping[fieldName];
  }
  
  // カスタム項目の場合は field_id を使用
  if (field && !field.is_fixed && field.field_id) {
    return `custom_${field.field_id}`;
  }
  
  return null;
};

const PresetPatientTableComponent: React.FC<PresetPatientTableProps> = ({
  patientData,
  presetFields,
  currentPage = 1,
  pageSize = 50,
  sortColumn: propSortColumn,
  sortDirection: propSortDirection,
  onSortChange,
  onEdit,
  onDelete,
  search = 'hidden',
  noSearch = 'table-cell',
}) => {
  // 表示するフィールドを取得（is_visible = true のもの、display_order順）
  // useMemoでメモ化して不要な再計算を防ぐ
  const visibleFields = useMemo(() => {
    const fields = presetFields
      .filter(field => field.is_visible)
      .sort((a, b) => a.display_order - b.display_order);
    
    // 固定項目の表示/非表示を制御
    // 「患者リスト表示」モード（noSearch='table-cell', search='hidden'）では、年齢、初回治療開始日、最終更新日、ステータスを表示
    // 「腫瘍登録管理表示」モード（noSearch='hidden', search='table-cell'）では、これらの項目を非表示
    return fields.filter(field => {
      // 固定項目の表示制御
      if (field.is_fixed) {
        const fieldName = field.field_name;
        // 「年齢」「初回治療開始日」「最終更新日」「ステータス」は noSearch で制御
        if (fieldName === '年齢' || fieldName === '初回治療開始日' || fieldName === '最終更新日' || fieldName === 'ステータス') {
          return noSearch === 'table-cell';
        }
        // その他の固定項目（患者ID、患者名、診断、進行期）は常に表示
        return true;
      }
      // カスタム項目は常に表示（プリセット定義に基づく）
      return true;
    });
  }, [presetFields, search, noSearch]);

  // ペアになる項目のマッピング（位置番号ベース：4/8, 5/9, 6/10, 7/11）
  // 位置1, 2, 3 → 1行表示
  // 位置4, 5, 6, 7 → 位置8, 9, 10, 11とペアで2行表示
  const pairedPositions: { [key: number]: number } = {
    4: 8,
    5: 9,
    6: 10,
    7: 11,
  };

  // 位置番号に基づいて表示列を生成
  // useMemoでメモ化して不要な再計算を防ぐ
  const displayColumns = useMemo(() => {
    const columns: Array<{ field: PresetField | null; pairedField: PresetField | null }> = [];
    const processedIndices = new Set<number>(); // 既に処理された位置インデックスを記録
    
    for (let position = 1; position <= visibleFields.length; position++) {
      // 既に処理された位置はスキップ
      if (processedIndices.has(position)) {
        continue;
      }

      // 位置番号（1から始まる）でフィールドを取得
      const field = visibleFields[position - 1];
      
      if (!field) {
        continue;
      }
      
      // ペアの1項目目（位置4-7）の場合は、対応するペア項目（位置8-11）を取得
      let pairedField: PresetField | null = null;
      if (pairedPositions[position]) {
        // ペアの1項目目（位置4-7）の場合は、対応するペア項目（位置8-11）を取得
        const pairedPosition = pairedPositions[position];
        pairedField = visibleFields[pairedPosition - 1] || null;
        // ペアの2項目目の位置も処理済みとしてマーク
        if (pairedField) {
          processedIndices.add(pairedPosition);
        }
        // ペアの1項目目とペアの2項目目を一緒に表示
        columns.push({ field, pairedField });
        processedIndices.add(position);
      } else {
        // ペアに該当しない通常の項目（位置1-3, 位置12以降など）は単独で表示
        columns.push({ field, pairedField: null });
        processedIndices.add(position);
      }
    }
    
    return columns;
  }, [visibleFields]);

  // バックエンドで既にソート・ページング処理が行われているため、クライアント側の処理は不要
  // データをそのまま使用
  const displayData = patientData;

  // ヘッダークリック時のソート切り替え
  const handleSort = (field: PresetField) => {
    if (!onSortChange) return;
    
    // フィールド名をバックエンドのソートカラム名にマッピング
    const sortColumn = mapFieldNameToSortColumn(field.field_name, field);
    if (!sortColumn) {
      return;
    }
    
    if (propSortColumn === sortColumn) {
      // 同じカラムをクリックした場合は昇順→降順→ソートなしの順で切り替え
      if (propSortDirection === 'asc') {
        onSortChange(sortColumn, 'desc');
      } else if (propSortDirection === 'desc') {
        onSortChange(null, null);
      } else {
        onSortChange(sortColumn, 'asc');
      }
    } else {
      // 新しいカラムをクリックした場合は昇順でソート
      onSortChange(sortColumn, 'asc');
    }
  };

  // ソートアイコンの取得
  const getSortIcon = (field: PresetField) => {
    // フィールド名をバックエンドのソートカラム名にマッピング
    const sortColumn = mapFieldNameToSortColumn(field.field_name, field);
    if (!sortColumn) {
      return null; // ソート対象外のフィールドはアイコンを表示しない
    }
    
    if (propSortColumn !== sortColumn || propSortDirection === null) {
      return (
        <span style={{ marginLeft: '5px', opacity: 0.5 }}>
          <Glyphicon glyph="sort" />
        </span>
      );
    }
    return propSortDirection === 'asc' 
      ? (
        <span style={{ marginLeft: '5px' }}>
          <Glyphicon glyph="chevron-up" />
        </span>
      )
      : (
        <span style={{ marginLeft: '5px' }}>
          <Glyphicon glyph="chevron-down" />
        </span>
      );
  };

  // デバッグログは削除（無限ループの原因となる可能性があるため）

  return (
    <Table striped className="patients">
      <thead>
        <tr>
          {displayColumns.map((column, columnIndex) => {
            const { field, pairedField } = column;
            
            if (!field) {
              return null;
            }

            // ペアの1項目目（4-7）の場合は、2項目目の項目名も含めて2段表示
            if (pairedField) {
              return (
                <th 
                  key={`${field.field_name}-${columnIndex}`} 
                  style={{ whiteSpace: 'nowrap', verticalAlign: 'bottom', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <div 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(field)}
                    >
                      {field.display_name}{getSortIcon(field)}
                    </div>
                    <div style={{ borderTop: '1px solid #333', margin: '2px 0', width: '100%' }}></div>
                    <div 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(pairedField)}
                    >
                      {pairedField.display_name}{getSortIcon(pairedField)}
                    </div>
                  </div>
                </th>
              );
            }
            
            // 前3列（1-3）は通常の1行表示
            return (
              <th 
                key={`${field.field_name}-${columnIndex}`} 
                style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort(field)}
              >
                {field.display_name}{getSortIcon(field)}
              </th>
            );
          })}
          {(localStorage.getItem('is_view_roll') === 'true' ||
            localStorage.getItem('is_edit_roll') === 'true' ||
            localStorage.getItem('is_remove_roll') === 'true') && (
            <th>編集/削除</th>
          )}
        </tr>
      </thead>
      <tbody>
        {displayData.map((patient, patientIndex) => {
          // ステータス配列に'death'が含まれている場合は灰色表示
          const statusArray = patient['ステータス'];
          const isDeath = Array.isArray(statusArray) && statusArray.includes('death');
          
          return (
            <tr 
              key={patient.case_id || patientIndex}
              className={isDeath ? 'died' : ''}
            >
              {displayColumns.map((column, columnIndex) => {
                const { field, pairedField } = column;
                
                if (!field) {
                  return null;
                }

                const value = patient[field.field_name];
                const isIcon = patient[`${field.field_name}_isIcon`];
                
                // 診断または進行期が「未」の場合はアイコンを表示
                const shouldShowIconForEmpty = (fieldName: string, fieldValue: any): boolean => {
                  return (fieldName === '診断' || fieldName === '進行期') && fieldValue === '未';
                };
                
                // ステータス項目の場合は、通常のステータス表示と同じようにアイコン表示
                const isStatusField = field.field_name === 'ステータス';
                
                // ペアの1項目目（4-7）の場合は、2項目目の値も含めて2段表示
                if (pairedField) {
                  const pairedValue = patient[pairedField.field_name];
                  const pairedIsIcon = patient[`${pairedField.field_name}_isIcon`];
                  
                  // 診断または進行期が「未」の場合はアイコンを表示
                  const shouldShowIconForEmpty1 = shouldShowIconForEmpty(field.field_name, value);
                  const shouldShowIconForEmpty2 = shouldShowIconForEmpty(pairedField.field_name, pairedValue);
                  
                  return (
                    <td key={`${field.field_name}-${columnIndex}`} style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* 1項目目の値 */}
                        <div>
                          {shouldShowIconForEmpty1 ? (
                            <img src="./image/icon_not_completed.svg" alt="未" />
                          ) : (isIcon || field.field_name === 'ステータス') && Array.isArray(value) ? (
                            <IconList iconList={value} displayCaption='' displayText='' />
                          ) : (
                            <span>{value || ''}</span>
                          )}
                        </div>
                        {/* 2項目目の値 */}
                        <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px' }}>
                          {shouldShowIconForEmpty2 ? (
                            <img src="./image/icon_not_completed.svg" alt="未" />
                          ) : (pairedIsIcon || (pairedField && pairedField.field_name === 'ステータス')) && Array.isArray(pairedValue) ? (
                            <IconList iconList={pairedValue} displayCaption='' displayText='' />
                          ) : (
                            <span>{pairedValue || ''}</span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                }
                
                // 前3列（1-3）は通常の1行表示
                // 診断または進行期が「未」の場合はアイコンを表示
                if (shouldShowIconForEmpty(field.field_name, value)) {
                  return (
                    <td key={`${field.field_name}-${columnIndex}`}>
                      <img src="./image/icon_not_completed.svg" alt="未" />
                    </td>
                  );
                }
                
                // アイコン表示の場合（ステータス項目の場合は、isIconフラグに関係なくアイコン表示）
                if ((isIcon || isStatusField) && Array.isArray(value)) {
                  return (
                    <td key={`${field.field_name}-${columnIndex}`}>
                      <IconList iconList={value} displayCaption='' displayText='' />
                    </td>
                  );
                }
                
                // 通常の項目の表示
                return (
                  <td key={`${field.field_name}-${columnIndex}`}>
                    {value || ''}
                  </td>
                );
              })}
            {(localStorage.getItem('is_edit_roll') === 'true' ||
              localStorage.getItem('is_view_roll') === 'true' ||
              localStorage.getItem('is_remove_roll') === 'true') && (
              <td>
                <ButtonToolbar>
                  <ButtonGroup>
                    {(localStorage.getItem('is_edit_roll') === 'true' ||
                      localStorage.getItem('is_view_roll') === 'true') && (
                      <Button
                        title="編集"
                        onClick={() => onEdit(patient.case_id)}
                      >
                        <Glyphicon glyph="edit" />
                      </Button>
                    )}
                    {localStorage.getItem('is_remove_roll') === 'true' && (
                      <Button
                        title="削除"
                        onClick={() =>
                          onDelete(
                            patient.case_id,
                            patient.his_id || '',
                            patient.name || ''
                          )
                        }
                      >
                        <Glyphicon glyph="trash" />
                      </Button>
                    )}
                  </ButtonGroup>
                </ButtonToolbar>
              </td>
            )}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

// React.memoでメモ化して不要な再レンダリングを防ぐ
const PresetPatientTable = React.memo(PresetPatientTableComponent, (prevProps, nextProps) => {
  // 患者データ、プリセットフィールド、ページング、ソート、表示モードが変更された場合のみ再レンダリング
  return (
    prevProps.patientData === nextProps.patientData &&
    prevProps.presetFields === nextProps.presetFields &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.sortColumn === nextProps.sortColumn &&
    prevProps.sortDirection === nextProps.sortDirection &&
    prevProps.search === nextProps.search &&
    prevProps.noSearch === nextProps.noSearch
  );
});

export default PresetPatientTable;

