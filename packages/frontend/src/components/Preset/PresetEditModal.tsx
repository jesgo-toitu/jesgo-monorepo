/* eslint-disable no-plusplus */
/* eslint-disable no-alert */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Modal,
  Button,
  Form,
  FormGroup,
  ControlLabel,
  FormControl,
  Table,
  ButtonGroup,
  Glyphicon,
} from 'react-bootstrap';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import lodash from 'lodash';
import { useSelector } from 'react-redux';
import { JSONSchema7 } from 'json-schema';
import SchemaFieldTree from './SchemaFieldTree';
import { GetSchemaInfo } from '../CaseRegistration/SchemaUtility';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';
import { FieldInfo } from '../../common/FieldValueToString';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { treeApiObject, treeSchema } from '../Schemamanager/SchemaTree';
import { FIXED_FIELD_NAMES } from '@jesgo/common';

// プリセット項目の型定義
interface PresetItemField {
  field_id?: number;
  preset_id?: number;
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
  schema_title?: string; // 文書(スキーマ)タイトル
  schema_version?: string; // バージョン
  created_at?: string;
  updated_at?: string;
}

// プリセット編集モーダルのProps
interface PresetEditModalProps {
  show: boolean;
  onHide: () => void;
  onSaveSuccess?: () => void; // 保存成功時のコールバック
  presetData?: {
    preset_id?: number;
    preset_name: string;
    preset_description: string;
    fields?: PresetItemField[];
    fixed_fields?: any[]; // 固定項目データ
  } | null;
}

const PresetEditModal: React.FC<PresetEditModalProps> = ({
  show,
  onHide,
  onSaveSuccess,
  presetData,
}) => {
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [fields, setFields] = useState<PresetItemField[]>([]);
  const [showFieldSelectModal, setShowFieldSelectModal] = useState(false);
  const [selectingFieldId, setSelectingFieldId] = useState<string | null>(null);
  
  // スキーマ関連の状態
  const [availableSchemas, setAvailableSchemas] = useState<treeSchema[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);
  const [selectedSchemaInfo, setSelectedSchemaInfo] = useState<JesgoDocumentSchema | null>(null);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string>('');
  // 選択可能な全項目を保持
  const [selectableFields, setSelectableFields] = useState<Array<{ path: string; fieldInfo: FieldInfo }>>([]);
  
  // ウィンドウサイズに応じた補正値を管理
  const [dragOffset, setDragOffset] = useState(40);
  
  // 一括チェックボックスの参照
  const bulkVisibleCheckboxRef = useRef<HTMLInputElement>(null);
  const bulkCsvExportCheckboxRef = useRef<HTMLInputElement>(null);
  
  // Reduxストアからスキーマデータを取得
  const schemaDatas = useSelector((state: any) => state.schemaDataReducer.schemaDatas);

  // 固定項目の定義
  const getFixedFields = (): PresetItemField[] => [
    {
      field_id: 1,
      field_name: FIXED_FIELD_NAMES.PATIENT_ID,
      display_name: FIXED_FIELD_NAMES.PATIENT_ID,
      field_type: 'string',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 1,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 2,
      field_name: FIXED_FIELD_NAMES.PATIENT_NAME,
      display_name: FIXED_FIELD_NAMES.PATIENT_NAME,
      field_type: 'string',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 2,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 3,
      field_name: FIXED_FIELD_NAMES.AGE,
      display_name: FIXED_FIELD_NAMES.AGE,
      field_type: 'number',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 3,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 4,
      field_name: FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE,
      display_name: FIXED_FIELD_NAMES.INITIAL_TREATMENT_DATE,
      field_type: 'date',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 4,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 5,
      field_name: FIXED_FIELD_NAMES.DIAGNOSIS,
      display_name: FIXED_FIELD_NAMES.DIAGNOSIS,
      field_type: 'string',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 5,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 6,
      field_name: FIXED_FIELD_NAMES.ADVANCED_STAGE,
      display_name: FIXED_FIELD_NAMES.ADVANCED_STAGE,
      field_type: 'string',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 6,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 7,
      field_name: FIXED_FIELD_NAMES.STATUS,
      display_name: FIXED_FIELD_NAMES.STATUS,
      field_type: 'status',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 7,
      schema_title: '-',
      schema_version: '-',
    },
    {
      field_id: 8,
      field_name: FIXED_FIELD_NAMES.LAST_UPDATE,
      display_name: FIXED_FIELD_NAMES.LAST_UPDATE,
      field_type: 'date',
      is_visible: true,
      is_csv_export: true,
      is_fixed: true,
      display_order: 8,
      schema_title: '-',
      schema_version: '-',
    },
  ];

  // ドラッグ&ドロップで並び替え
  const reorderFields = (
    argFields: PresetItemField[],
    startIndex: number,
    endIndex: number
  ) => {
    const copyFields = lodash.cloneDeep(argFields);
    const result = copyFields;
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    // display_orderを更新（ただしNo1-3は変更不可なので固定項目は除外）
    result.forEach((field, index) => {
      if (!field.is_fixed || index >= 3) {
        field.display_order = index + 1;
      }
    });
    
    return result;
  };

  // ドラッグ終了後の処理
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination) {
      return;
    }

    // No1-3（固定項目の患者ID、氏名、年齢）は並び替え不可
    // これらの項目は display_order が 1, 2, 3 の固定項目
    const fixedFieldCount = fields.filter(f => f.is_fixed && f.display_order && f.display_order <= 3).length;
    
    if (source.index < fixedFieldCount || destination.index < fixedFieldCount) {
      // No1-3の範囲への移動は禁止
      alert('No1-3の項目は並び替えできません');
      return;
    }

    // 並び替え実施
    const update = reorderFields(fields, source.index, destination.index);
    setFields(update);
  };

  // プリセットデータが変更されたときに状態を更新
  useEffect(() => {
    if (presetData) {
      setPresetName(presetData.preset_name);
      setPresetDescription(presetData.preset_description);
      
      // 固定項目と既存の項目をマージ（データベースの値を優先）
      const fixedFields = getFixedFields();
      const existingFields = presetData.fields || [];
      
      // 既存の項目（データベースから取得）を優先して使用
      // 既存項目が空の場合は、固定項目を使用
      const mergedFields = existingFields.length > 0 ? [...existingFields] : [...fixedFields];
      setFields(mergedFields);
    } else {
      // 新規作成の場合
      setPresetName('');
      setPresetDescription('');
      setFields(getFixedFields());
    }
  }, [presetData]);

  // スキーマツリーを取得
  useEffect(() => {
    const fetchSchemaTree = async () => {
      try {
        const treeApiReturnObject = await apiAccess(METHOD_TYPE.GET, `gettree`);
        if (treeApiReturnObject.statusNum === RESULT.NORMAL_TERMINATION) {
          const returned = treeApiReturnObject.body as treeApiObject;
          setAvailableSchemas(returned.treeSchema);
        }
      } catch (error) {
        console.error('スキーマツリーの取得に失敗しました:', error);
      }
    };

    if (show) {
      fetchSchemaTree();
    }
  }, [show]);

  // ウィンドウサイズに応じてドラッグ補正値を調整
  useEffect(() => {
    const updateDragOffset = () => {
      // スクロール可能なコンテナとテーブル要素を取得
      const scrollableContainer = document.querySelector('.modal-body > div[style*="maxHeight"]');
      const tableElement = document.querySelector('.modal-body table tbody');
      const allRows = document.querySelectorAll('.modal-body table tbody tr');
      
      if (tableElement && allRows.length > 0) {
        // scrollableContainerが取得できた場合は使用、そうでなければtableElementを使用
        const containerRect = (scrollableContainer || tableElement).getBoundingClientRect();
        
        // 最初の数行の位置を測定して中央値を計算
        const rowPositions: number[] = [];
        for (let i = 0; i < Math.min(3, allRows.length); i++) {
          const rowRect = allRows[i].getBoundingClientRect();
          rowPositions.push(rowRect.left);
        }
        
        // 行の実際の位置の中央値（平均値）を計算
        const averageRowLeft = rowPositions.reduce((sum, val) => sum + val, 0) / rowPositions.length;
        
        // 中央値を補正値として使用（20pxを引いてドラッグの位置を調整）
        const offset = averageRowLeft - 20;
        
        setDragOffset(offset);
      } else {
        // フォールバック: ウィンドウ幅に応じた調整
        const windowWidth = window.innerWidth;
        
        if (windowWidth < 768) {
          setDragOffset(0);
        } else if (windowWidth < 1024) {
          setDragOffset(0);
        } else {
          setDragOffset(0);
        }
      }
    };

    // 初回実行（少し遅延させてDOMが確実に描画された後に実行）
    // 複数回試行して要素が見つかるまで待つ
    let retryCount = 0;
    const maxRetries = 10;
    
    const tryUpdateOffset = () => {
      // スクロール可能なコンテナ（maxHeightが設定されているdiv）を探す
      const scrollableContainers = document.querySelectorAll('.modal-body > div');
      let scrollableContainer: Element | null = null;
      
      for (const container of scrollableContainers) {
        const htmlElement = container as HTMLElement;
        // inline styleまたはcomputed styleからmaxHeightを確認
        const hasMaxHeight = htmlElement.style.maxHeight || 
                            window.getComputedStyle(htmlElement).maxHeight !== 'none';
        if (hasMaxHeight) {
          scrollableContainer = container;
          break;
        }
      }
      
      const tableElement = document.querySelector('.modal-body table tbody');
      const allRows = document.querySelectorAll('.modal-body table tbody tr');
      
      // tableElementとallRowsがあれば処理を進める（scrollableContainerはオプション）
      if (tableElement && allRows.length > 0) {
        updateDragOffset();
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryUpdateOffset, 100);
      }
    };
    
    const timeoutId = setTimeout(tryUpdateOffset, 100);

    // リサイズイベントリスナーを追加
    window.addEventListener('resize', updateDragOffset);

    // クリーンアップ
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDragOffset);
    };
  }, [show]); // showが変わるたびに再計算

  // 選択されたスキーマIDが変更されたときにスキーマ情報を取得
  useEffect(() => {
    if (selectedSchemaId !== null) {
      const schemaInfo = GetSchemaInfo(selectedSchemaId);
      setSelectedSchemaInfo(schemaInfo || null);
    } else {
      setSelectedSchemaInfo(null);
    }
  }, [selectedSchemaId]);

  // フィールドの追加
  const addField = () => {
    const newField: PresetItemField = {
      field_id: Date.now(), // 一時的なID（タイムスタンプ）
      field_name: '',
      display_name: '',
      is_visible: true,
      is_csv_export: true,
      is_fixed: false,
      display_order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  // フィールドの削除
  const removeField = (fieldId: number | undefined) => {
    if (fieldId) {
      setFields(fields.filter(field => field.field_id !== fieldId));
    }
  };

  // フィールドの更新
  const updateField = (fieldId: number | undefined, updates: Partial<PresetItemField>) => {
    const updatedFields = fields.map(field =>
      field.field_id === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
  };

  // 一括更新処理（表示）
  const handleBulkUpdateVisible = (checked: boolean) => {
    const updatedFields = fields.map(field => {
      // 固定項目で無効化されている項目（患者ID、患者名、年齢）は除外
      const isDisabled = field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢');
      if (isDisabled) {
        return field;
      }
      return { ...field, is_visible: checked };
    });
    setFields(updatedFields);
  };

  // 一括更新処理（CSV出力）
  const handleBulkUpdateCsvExport = (checked: boolean) => {
    const updatedFields = fields.map(field => {
      // 固定項目で無効化されている項目（患者ID、患者名、年齢）は除外
      const isDisabled = field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢');
      if (isDisabled) {
        return field;
      }
      return { ...field, is_csv_export: checked };
    });
    setFields(updatedFields);
  };

  // 一括チェックボックスの状態を計算（表示）
  const getBulkVisibleState = () => {
    // 固定項目で無効化されている項目を除外
    const editableFields = fields.filter(field => {
      const isDisabled = field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢');
      return !isDisabled;
    });

    if (editableFields.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const checkedCount = editableFields.filter(field => field.is_visible).length;
    const allChecked = checkedCount === editableFields.length;
    const someChecked = checkedCount > 0 && checkedCount < editableFields.length;

    return {
      checked: allChecked,
      indeterminate: someChecked,
    };
  };

  // 一括チェックボックスの状態を計算（CSV出力）
  const getBulkCsvExportState = () => {
    // 固定項目で無効化されている項目を除外
    const editableFields = fields.filter(field => {
      const isDisabled = field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢');
      return !isDisabled;
    });

    if (editableFields.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const checkedCount = editableFields.filter(field => field.is_csv_export).length;
    const allChecked = checkedCount === editableFields.length;
    const someChecked = checkedCount > 0 && checkedCount < editableFields.length;

    return {
      checked: allChecked,
      indeterminate: someChecked,
    };
  };

  // 一括チェックボックスの状態を計算（メモ化）
  const bulkVisibleState = useMemo(() => getBulkVisibleState(), [fields]);
  const bulkCsvExportState = useMemo(() => getBulkCsvExportState(), [fields]);

  // 一括チェックボックスの状態を更新
  useEffect(() => {
    if (bulkVisibleCheckboxRef.current) {
      bulkVisibleCheckboxRef.current.checked = bulkVisibleState.checked;
      bulkVisibleCheckboxRef.current.indeterminate = bulkVisibleState.indeterminate;
    }
    if (bulkCsvExportCheckboxRef.current) {
      bulkCsvExportCheckboxRef.current.checked = bulkCsvExportState.checked;
      bulkCsvExportCheckboxRef.current.indeterminate = bulkCsvExportState.indeterminate;
    }
  }, [bulkVisibleState, bulkCsvExportState]);

  // フィールド選択モーダルを開く
  const openFieldSelectModal = (fieldId: number | undefined) => {
    if (fieldId) {
      setSelectingFieldId(fieldId.toString());
      setShowFieldSelectModal(true);
    }
  };

  // フィールド選択モーダルを閉じる
  const closeFieldSelectModal = () => {
    setShowFieldSelectModal(false);
    setSelectingFieldId(null);
  };

  // フィールド選択時の処理
  const handleFieldSelect = (fieldPath: string, fieldInfo: FieldInfo) => {
    if (selectingFieldId && selectedSchemaInfo) {
      // 表示名を生成
      let displayFieldName = fieldPath;
      
      // パスをドットで分割
      const pathParts = fieldPath.split('.');
      
      // サブスキーマIDのパス名とそのタイトルのマッピングを作成
      const subSchemaMap: Map<string, string> = new Map();
      if (selectedSchemaInfo.subschema && Array.isArray(selectedSchemaInfo.subschema)) {
        for (const subSchemaId of selectedSchemaInfo.subschema) {
          const subSchemaInfo = GetSchemaInfo(subSchemaId);
          if (subSchemaInfo && subSchemaInfo.document_schema) {
            // サブスキーマのschema_id_stringからパス名を抽出
            // 例: /schema/treatment/radiotherapy -> radiotherapy
            const schemaIdString = subSchemaInfo.schema_id_string;
            if (schemaIdString && typeof schemaIdString === 'string') {
              const pathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
              if (pathParts.length > 0) {
                // 最後の部分をパス名として使用
                const pathName = pathParts[pathParts.length - 1];
                // タイトルを取得（subtitleがある場合は結合）
                const title = subSchemaInfo.subtitle 
                  ? `${subSchemaInfo.title} ${subSchemaInfo.subtitle}`
                  : subSchemaInfo.title;
                subSchemaMap.set(pathName, title);
              }
            }
          }
        }
      }
      
      // child_schemaのIDとそのタイトルのマッピングを作成
      const childSchemaMap: Map<string, string> = new Map();
      if (selectedSchemaInfo.child_schema && Array.isArray(selectedSchemaInfo.child_schema)) {
        for (const childSchemaId of selectedSchemaInfo.child_schema) {
          const childSchemaInfo = GetSchemaInfo(childSchemaId);
          if (childSchemaInfo && childSchemaInfo.schema_id_string) {
            // child_schemaのschema_id_stringからパス名を抽出
            // 例: /schema/record/flavor -> flavor
            const schemaIdString = childSchemaInfo.schema_id_string;
            if (typeof schemaIdString === 'string') {
              const pathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
              if (pathParts.length > 0) {
                // 最後の部分をパス名として使用
                const pathName = pathParts[pathParts.length - 1];
                // タイトルを取得（subtitleがある場合は結合）
                const title = childSchemaInfo.subtitle 
                  ? `${childSchemaInfo.title} ${childSchemaInfo.subtitle}`
                  : childSchemaInfo.title;
                childSchemaMap.set(pathName, title);
              }
            }
          }
        }
      }
      
      // 最初の部分がサブスキーマまたは子スキーマかどうかチェック
      if (pathParts.length > 0) {
        const firstPart = pathParts[0];
        const schemaTitle = subSchemaMap.get(firstPart) || childSchemaMap.get(firstPart);
        
        if (schemaTitle) {
          // サブスキーマまたは子スキーマ配下の項目の場合
          // 「スキーマタイトル.項目名」の形式で表示
          const remainingParts = pathParts.slice(1);
          if (remainingParts.length > 0) {
            displayFieldName = `${schemaTitle}.${remainingParts.join('.')}`;
          } else {
            // 項目名がない場合はスキーマタイトルのみ
            displayFieldName = schemaTitle;
          }
        } else {
          // 通常の項目の場合、サブスキーマIDを除外した項目名を使用
          // 実際のサブスキーマIDのパス名リストを取得
          const actualSubSchemaPaths = Array.from(subSchemaMap.keys());
          
          // 先頭から連続する実際のサブスキーマIDを除外
          const filteredParts: string[] = [];
          let foundNonSchemaId = false;
          
          for (const part of pathParts) {
            // 実際のサブスキーマIDのパス名と一致するかチェック
            const isActualSubSchemaId = actualSubSchemaPaths.includes(part);
            
            if (!foundNonSchemaId && isActualSubSchemaId) {
              // まだ実際のサブスキーマIDではない項目を見つけていない場合、サブスキーマIDはスキップ
              continue;
            } else {
              // 実際のサブスキーマIDでない項目が見つかったら、以降は全て含める
              foundNonSchemaId = true;
              filteredParts.push(part);
            }
          }
          
          // 全て実際のサブスキーマIDだった場合は、最初のサブスキーマIDだけを除外
          if (filteredParts.length === 0 && pathParts.length > 1) {
            filteredParts.push(...pathParts.slice(1));
          }
          
          displayFieldName = filteredParts.join('.');
        }
      }
      
      // 文書(スキーマ)タイトルを title + subtitle で生成
      const schemaTitle = selectedSchemaInfo.subtitle 
        ? `${selectedSchemaInfo.title} ${selectedSchemaInfo.subtitle}`
        : selectedSchemaInfo.title;
      
      // field_typeを設定（ツリー表示のロジックと同じ）
      // type=string かつ format=date の場合は date と表示
      let fieldType = fieldInfo.type || '';
      if (fieldInfo.type === 'string' && fieldInfo.schema?.format === 'date') {
        fieldType = 'date';
      }
      
      updateField(parseInt(selectingFieldId, 10), { 
        field_name: displayFieldName,
        display_name: displayFieldName,
        field_path: fieldPath, // フルパスを保存
        field_type: fieldType,
        schema_primary_id: selectedSchemaInfo.schema_primary_id,
        schema_id: selectedSchemaInfo.schema_id,
        schema_id_string: selectedSchemaInfo.schema_id_string,
        schema_title: schemaTitle,
        schema_version: `${selectedSchemaInfo.version_major}.${selectedSchemaInfo.version_minor}`
      });
    }
    setSelectedFieldPath(fieldPath);
    closeFieldSelectModal();
  };

  // スキーマ選択時の処理
  const handleSchemaSelect = (schemaId: number) => {
    setSelectedSchemaId(schemaId);
    setSelectedFieldPath('');
    // スキーマが変更されたら選択可能な項目をリセット
    setSelectableFields([]);
  };

  // 選択可能な全項目が準備できたときのコールバック
  // useCallbackでメモ化して、不要な再レンダリングを防ぐ
  const handleSelectableFieldsReady = useCallback((fields: Array<{ path: string; fieldInfo: FieldInfo }>) => {
    setSelectableFields(fields);
  }, []);

  // 一括追加処理
  const handleBulkAdd = () => {
    if (!selectedSchemaInfo) {
      alert('スキーマを選択してください');
      return;
    }

    if (selectableFields.length === 0) {
      alert('追加できる項目がありません');
      return;
    }

    // 既に追加されている項目のパスを取得（重複チェック用）
    const existingFieldPaths = new Set(
      fields
        .filter(field => field.field_path)
        .map(field => field.field_path!)
    );

    // 選択可能な全項目を追加
    const newFields: PresetItemField[] = [];
    let addedCount = 0;

    // サブスキーマIDのパス名とそのタイトルのマッピングを作成（一度だけ作成）
    const subSchemaMap: Map<string, string> = new Map();
    if (selectedSchemaInfo.subschema && Array.isArray(selectedSchemaInfo.subschema)) {
      for (const subSchemaId of selectedSchemaInfo.subschema) {
        const subSchemaInfo = GetSchemaInfo(subSchemaId);
        if (subSchemaInfo && subSchemaInfo.document_schema) {
          const schemaIdString = subSchemaInfo.schema_id_string;
          if (schemaIdString && typeof schemaIdString === 'string') {
            const pathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
            if (pathParts.length > 0) {
              const pathName = pathParts[pathParts.length - 1];
              const title = subSchemaInfo.subtitle 
                ? `${subSchemaInfo.title} ${subSchemaInfo.subtitle}`
                : subSchemaInfo.title;
              subSchemaMap.set(pathName, title);
            }
          }
        }
      }
    }

    // child_schemaのIDとそのタイトルのマッピングを作成（一度だけ作成）
    const childSchemaMap: Map<string, string> = new Map();
    if (selectedSchemaInfo.child_schema && Array.isArray(selectedSchemaInfo.child_schema)) {
      for (const childSchemaId of selectedSchemaInfo.child_schema) {
        const childSchemaInfo = GetSchemaInfo(childSchemaId);
        if (childSchemaInfo && childSchemaInfo.schema_id_string) {
          const schemaIdString = childSchemaInfo.schema_id_string;
          if (typeof schemaIdString === 'string') {
            const pathParts = schemaIdString.split('/').filter(p => p !== '' && p !== 'schema');
            if (pathParts.length > 0) {
              const pathName = pathParts[pathParts.length - 1];
              const title = childSchemaInfo.subtitle 
                ? `${childSchemaInfo.title} ${childSchemaInfo.subtitle}`
                : childSchemaInfo.title;
              childSchemaMap.set(pathName, title);
            }
          }
        }
      }
    }

    // 文書(スキーマ)タイトルを生成（一度だけ作成）
    const schemaTitle = selectedSchemaInfo.subtitle 
      ? `${selectedSchemaInfo.title} ${selectedSchemaInfo.subtitle}`
      : selectedSchemaInfo.title;

    selectableFields.forEach((selectableField) => {
      // 既に追加されている項目はスキップ
      if (existingFieldPaths.has(selectableField.path)) {
        return;
      }

      // 表示名を生成（handleFieldSelectと同じロジック）
      let displayFieldName = selectableField.path;
      const fieldPath = selectableField.path;
      const pathParts = fieldPath.split('.');

      // 最初の部分がサブスキーマまたは子スキーマかどうかチェック
      if (pathParts.length > 0) {
        const firstPart = pathParts[0];
        const schemaTitleForPath = subSchemaMap.get(firstPart) || childSchemaMap.get(firstPart);

        if (schemaTitleForPath) {
          const remainingParts = pathParts.slice(1);
          if (remainingParts.length > 0) {
            displayFieldName = `${schemaTitleForPath}.${remainingParts.join('.')}`;
          } else {
            displayFieldName = schemaTitleForPath;
          }
        } else {
          const actualSubSchemaPaths = Array.from(subSchemaMap.keys());
          const filteredParts: string[] = [];
          let foundNonSchemaId = false;

          for (const part of pathParts) {
            const isActualSubSchemaId = actualSubSchemaPaths.includes(part);

            if (!foundNonSchemaId && isActualSubSchemaId) {
              continue;
            } else {
              foundNonSchemaId = true;
              filteredParts.push(part);
            }
          }

          if (filteredParts.length === 0 && pathParts.length > 1) {
            filteredParts.push(...pathParts.slice(1));
          }

          displayFieldName = filteredParts.join('.');
        }
      }

      // field_typeを設定
      let fieldType = selectableField.fieldInfo.type || '';
      if (selectableField.fieldInfo.type === 'string' && selectableField.fieldInfo.schema?.format === 'date') {
        fieldType = 'date';
      }

      // 新しいフィールドを作成
      const newField: PresetItemField = {
        field_id: Date.now() + addedCount, // 一時的なID
        field_name: displayFieldName,
        display_name: displayFieldName,
        field_path: selectableField.path,
        field_type: fieldType,
        schema_primary_id: selectedSchemaInfo.schema_primary_id,
        schema_id: selectedSchemaInfo.schema_id,
        schema_id_string: selectedSchemaInfo.schema_id_string,
        schema_title: schemaTitle,
        schema_version: `${selectedSchemaInfo.version_major}.${selectedSchemaInfo.version_minor}`,
        is_visible: true,
        is_csv_export: true,
        is_fixed: false,
        display_order: fields.length + addedCount + 1,
      };

      newFields.push(newField);
      addedCount++;
    });

    if (newFields.length === 0) {
      alert('追加できる新しい項目がありません（既に追加済みの項目のみです）');
      return;
    }

    // 元の行を削除（選択ボタンを押した行がある場合）
    let updatedFields = [...fields];
    if (selectingFieldId) {
      const fieldIdToRemove = parseInt(selectingFieldId, 10);
      updatedFields = updatedFields.filter(field => field.field_id !== fieldIdToRemove);
    }

    // フィールドを追加
    setFields([...updatedFields, ...newFields]);
    alert(`${newFields.length}個の項目を追加しました`);
    
    // 項目選択モーダルを閉じる
    closeFieldSelectModal();
  };


  // 保存処理
  const handleSave = async () => {
    // preset_id = 1 の場合は編集不可（システムプリセット）
    if (presetData?.preset_id === 1) {
      alert('システムプリセットは編集できません');
      return;
    }

    if (!presetName.trim()) {
      alert('プリセット名を入力してください');
      return;
    }

    if (fields.some(field => !field.field_name.trim() || !field.display_name.trim())) {
      alert('すべての項目の項目名と表示名を入力してください');
      return;
    }

    // 表示チェックボックスがONになっている項目数をチェック
    const visibleFieldsCount = fields.filter(field => field.is_visible).length;
    if (visibleFieldsCount > 11) {
      alert(`表示項目は11個までです。現在${visibleFieldsCount}個の項目が表示ONになっています。`);
      return;
    }

    try {
      // APIに送信するデータを準備
      console.log('保存前のデータ確認:', {
        presetData: presetData,
        presetDataFixedFields: presetData?.fixed_fields,
        presetDataFixedFieldsLength: presetData?.fixed_fields?.length,
        fields: fields,
        fixedFields: fields.filter(field => field.is_fixed),
        fixedFieldsLength: fields.filter(field => field.is_fixed).length
      });

      const presetDataToSave = {
        preset_id: presetData?.preset_id,
        preset_name: presetName.trim(),
        preset_description: presetDescription.trim(),
        fields: fields.map((field, index) => ({
          field_id: field.field_id,
          preset_id: presetData?.preset_id,
          schema_primary_id: field.schema_primary_id,
          schema_id: field.schema_id,
          schema_id_string: field.schema_id_string,
          field_name: field.field_name,
          display_name: field.display_name,
          field_path: field.field_path,
          field_type: field.field_type,
          is_visible: field.is_visible,
          is_csv_export: field.is_csv_export,
          is_fixed: field.is_fixed,
          display_order: field.display_order || index + 1,
          schema_title: field.schema_title,
          schema_version: field.schema_version
        })),
        fixed_fields: presetData?.fixed_fields ? fields.filter(field => field.is_fixed).map((field, index) => {
          // 固定項目の場合は、presetData.fixed_fieldsから対応するfixed_field_idを取得
          console.log('マッピング前の確認:', {
            field_name: field.field_name,
            presetDataFixedFields: presetData?.fixed_fields,
            searchResult: presetData?.fixed_fields?.find(ff => ff.field_name === field.field_name)
          });
          
          const fixedField = presetData?.fixed_fields?.find(ff => ff.field_name === field.field_name);
          console.log('固定項目マッピング:', {
            field_name: field.field_name,
            field_id: field.field_id,
            fixedField: fixedField,
            fixed_field_id: fixedField?.fixed_field_id || field.field_id
          });
          
          // fixedFieldが見つからない場合は、エラーを投げる
          if (!fixedField) {
            console.error('固定項目のマッピングに失敗:', field.field_name);
            console.error('利用可能な固定項目:', presetData?.fixed_fields?.map(ff => ff.field_name));
            throw new Error(`固定項目 "${field.field_name}" のマッピングに失敗しました`);
          }
          
          return {
            fixed_field_id: fixedField.fixed_field_id,
            display_order: field.display_order || index + 1,
            field_type: field.field_type,
            is_visible: field.is_visible,
            is_csv_export: field.is_csv_export
          };
        }) : [], // 新規作成時は空の配列
      };

      // API呼び出し
      const result = await apiAccess(METHOD_TYPE.POST, '/preset-save', presetDataToSave);
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        alert('プリセットを保存しました');
        onHide();
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        // エラーメッセージをより分かりやすく表示
        const errorMessage = result.body || '保存に失敗しました';
        alert(`保存に失敗しました: ${errorMessage}`);
      }
    } catch (error) {
      console.error('プリセット保存エラー:', error);
      alert('プリセットの保存中にエラーが発生しました');
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      dialogClassName="preset-edit-modal-dialog"
    >
      <Modal.Header closeButton>
        <Modal.Title>プリセット登録・編集</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px' }}>
        <Form>
          {/* プリセット情報入力セクション */}
          <FormGroup>
            <ControlLabel>プリセット名</ControlLabel>
            <FormControl
              type="text"
              placeholder="プリセット名を入力"
              value={presetName}
              onChange={(e) => setPresetName((e.target as HTMLInputElement).value)}
            />
          </FormGroup>
          
          <FormGroup>
            <ControlLabel>説明</ControlLabel>
            <FormControl
              type="text"
              placeholder="説明を入力"
              value={presetDescription}
              onChange={(e) => setPresetDescription((e.target as HTMLInputElement).value)}
            />
          </FormGroup>

          {/* 項目管理テーブルセクション */}
          <div style={{ marginTop: '20px' }}>
            {fields.length === 0 ? (
              <span>(項目がありません)</span>
            ) : (
              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}>
                <Table striped bordered hover style={{ width: '100%', tableLayout: 'fixed', marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: '60px', whiteSpace: 'nowrap' }}>No</th>
                    <th style={{ width: '390px', whiteSpace: 'nowrap' }}>項目</th>
                    <th style={{ width: '390px', whiteSpace: 'nowrap' }}>表示名</th>
                    <th style={{ width: '150px', whiteSpace: 'nowrap' }}>文書(スキーマ)タイトル</th>
                    <th style={{ width: '80px', whiteSpace: 'nowrap' }}>バージョン</th>
                    <th style={{ width: '60px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px' }}>表示</span>
                        <input
                          type="checkbox"
                          ref={bulkVisibleCheckboxRef}
                          onChange={(e) => {
                            handleBulkUpdateVisible(e.target.checked);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </th>
                    <th style={{ width: '80px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px' }}>CSV出力</span>
                        <input
                          type="checkbox"
                          ref={bulkCsvExportCheckboxRef}
                          onChange={(e) => {
                            handleBulkUpdateCsvExport(e.target.checked);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="presetFieldsTable">
                    {(provided) => (
                      <tbody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                  {fields.map((field, index) => (
                    <Draggable
                      key={field.field_id || `temp_${index}`}
                      draggableId={(field.field_id || `temp_${index}`).toString()}
                      index={index}
                      isDragDisabled={field.is_fixed && field.display_order !== undefined && field.display_order <= 3}
                    >
                      {(provided2, snapshot) => {
                        // ドラッグ中の位置調整のため、style を調整
                        const draggableStyle = provided2.draggableProps.style;
                        let adjustedStyle: React.CSSProperties = { ...draggableStyle };
                        
                        // ドラッグ中の場合、位置を調整
                        if (snapshot.isDragging && draggableStyle) {
                          const styleAny = draggableStyle as any;
                          if (styleAny && 'left' in styleAny) {
                            const currentLeft = parseInt(styleAny.left as string, 10);
                            // 中央値から求めた補正値を適用
                            adjustedStyle = {
                              ...styleAny,
                              left: `${currentLeft - dragOffset}px`,
                            };
                          }
                        }
                        
                        return (
                    <tr
                      ref={provided2.innerRef}
                      {...provided2.draggableProps}
                      {...provided2.dragHandleProps}
                      className={snapshot.isDragging ? 'drag-tr-active' : ''}
                      style={{
                        ...adjustedStyle,
                        backgroundColor: snapshot.isDragging ? '#e3f2fd' : undefined,
                      }}
                    >
                      <td style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {!(field.is_fixed && field.display_order !== undefined && field.display_order <= 3) && (
                            <DragIndicatorIcon style={{ fontSize: '18px', color: '#999', cursor: 'grab' }} />
                          )}
                          <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                            {field.display_order || index + 1}
                          </span>
                        </div>
                      </td>
                      <td style={{ width: '390px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ 
                            flex: 1, 
                            fontSize: '12px', 
                            color: field.field_name ? '#333' : '#999',
                            padding: '6px 8px',
                            backgroundColor: field.is_fixed ? '#e8f4fd' : '#f9f9f9',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {field.field_name || '項目名を選択'}
                          </span>
                          {!field.is_fixed && (
                            <Button
                              bsSize="small"
                              bsStyle="default"
                              onClick={() => openFieldSelectModal(field.field_id)}
                              style={{ minWidth: '60px' }}
                            >
                              選択
                            </Button>
                          )}
                        </div>
                      </td>
                      <td style={{ width: '390px' }}>
                        <FormControl
                          type="text"
                          placeholder="表示名を入力"
                          value={field.display_name}
                          onChange={(e) => updateField(field.field_id, { display_name: (e.target as HTMLInputElement).value })}
                          style={{ width: '100%' }}
                          disabled={field.is_fixed}
                        />
                      </td>
                      <td style={{ width: '150px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f9f9f9' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {field.schema_title || '-'}
                        </span>
                      </td>
                      <td style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f9f9f9' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {field.schema_version || '-'}
                        </span>
                      </td>
                      <td style={{ width: '60px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={field.is_visible}
                          onChange={(e) => {
                            updateField(field.field_id, { is_visible: e.target.checked });
                          }}
                          disabled={field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢')}
                        />
                      </td>
                      <td style={{ width: '80px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={field.is_csv_export}
                          onChange={(e) => {
                            updateField(field.field_id, { is_csv_export: e.target.checked });
                          }}
                          disabled={field.is_fixed && (field.field_name === '患者ID' || field.field_name === '患者名' || field.field_name === '年齢')}
                        />
                      </td>
                      <td style={{ width: '60px', textAlign: 'center' }}>
                        {!field.is_fixed && (
                          <Button
                            bsSize="small"
                            bsStyle="danger"
                            onClick={() => removeField(field.field_id)}
                            title="削除"
                          >
                            <Glyphicon glyph="trash" />
                          </Button>
                        )}
                      </td>
                    </tr>
                    );
                      }}
                    </Draggable>
                  ))}
                      {provided.placeholder}
                    </tbody>
                  )}
                  </Droppable>
                </DragDropContext>
              </Table>
              </div>
            )}
            
            <Button
              bsStyle="default"
              onClick={addField}
              style={{ marginTop: '10px', width: '100%' }}
            >
              + 追加
            </Button>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>キャンセル</Button>
        <Button bsStyle="primary" onClick={handleSave}>
          登録
        </Button>
      </Modal.Footer>

      {/* フィールド選択モーダル */}
      <Modal 
        show={showFieldSelectModal} 
        onHide={closeFieldSelectModal}
        style={{ 
          width: '80%', 
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>項目名選択</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
              スキーマを選択してから項目名を選択してください
            </p>
          </div>
          
          {/* スキーマ選択 */}
          <div style={{ marginBottom: '20px' }}>
            <ControlLabel>スキーマ選択</ControlLabel>
            <FormControl
              componentClass="select"
              value={selectedSchemaId || ''}
              onChange={(e) => handleSchemaSelect(parseInt((e.target as HTMLSelectElement).value, 10))}
              style={{ marginTop: '5px' }}
            >
              <option value="">スキーマを選択してください</option>
              {availableSchemas.map((schema) => (
                <option key={schema.schema_id} value={schema.schema_id}>
                  {schema.schema_title}
                </option>
              ))}
            </FormControl>
          </div>

          {/* フィールドツリー表示 */}
          {selectedSchemaInfo && (
            <div>
              <ControlLabel>項目選択</ControlLabel>
              <div style={{ marginTop: '5px' }}>
                <SchemaFieldTree
                  schema={selectedSchemaInfo.document_schema}
                  onFieldSelect={handleFieldSelect}
                  selectedFieldPath={selectedFieldPath}
                  schemaInfo={selectedSchemaInfo}
                  onSelectableFieldsReady={handleSelectableFieldsReady}
                />
              </div>
            </div>
          )}
          {!selectedSchemaInfo && (
            <div style={{ color: '#999', fontStyle: 'italic' }}>
              スキーマを選択してください
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedSchemaInfo && (
            <Button
              bsStyle="primary"
              onClick={handleBulkAdd}
              style={{ marginRight: '10px' }}
            >
              一括追加
            </Button>
          )}
          <Button onClick={closeFieldSelectModal}>キャンセル</Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default PresetEditModal;
