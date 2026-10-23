import React from 'react';
import { Modal, Button, Table, ControlLabel } from 'react-bootstrap';

/**
 * プリセットの閲覧ダイアログ
 * プリセット機能更新権限が無い利用者向けに、プリセットの定義（名称・説明・項目の一覧と設定）を
 * 読み取り専用で表示する。入力欄・項目の追加/削除/並べ替え・項目名の選択・保存の操作は持たず、
 * 保存・削除の API も呼ばない。症例の値・患者情報は扱わない（プリセットの定義だけを表示する）。
 */

// 閲覧で表示する項目の型（プリセット詳細 API の fields のうち表示に使うもの）
export interface PresetViewField {
  field_id?: number;
  field_name: string;
  display_name: string;
  is_visible: boolean;
  is_csv_export: boolean;
  is_csv_header_display_name?: boolean;
  is_fixed: boolean;
  display_order: number;
  schema_title?: string;
  schema_version?: string;
}

export interface PresetViewData {
  preset_name: string;
  preset_description: string;
  fields: PresetViewField[];
}

interface PresetViewModalProps {
  show: boolean;
  onHide: () => void;
  presetData: PresetViewData | null;
}

/** 有無の表示（チェックの代わりに文字で示す） */
const flagText = (value: boolean): string => (value ? '✓' : '-');

/** パスの表示（プリセット編集ダイアログと同じ組み立て） */
const pathText = (field: PresetViewField): string => {
  if (!field.field_name) {
    return '-';
  }
  return field.schema_title && field.schema_title !== '-'
    ? `${field.schema_title}.${field.field_name}`
    : field.field_name;
};

/** CSV ヘッダの表示（プリセット編集ダイアログの選択肢と同じ文言） */
const csvHeaderText = (field: PresetViewField): string => {
  if (field.is_fixed || !field.is_csv_export) {
    return '-';
  }
  return field.is_csv_header_display_name === true ? '表示名' : 'パス';
};

// 名称・説明の表示（入力欄ではなく文字として表示する）
const valueStyle: React.CSSProperties = {
  padding: '6px 12px',
  minHeight: '34px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  backgroundColor: '#f9f9f9',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};
// 列の幅（プリセット編集ダイアログと同じ。既存の共通 CSS で行ごとに表として描かれるため、見出しと各セルの両方に指定する）
const COL_WIDTH = {
  no: '60px',
  displayName: '390px',
  path: '390px',
  schemaTitle: '150px',
  version: '80px',
  visible: '60px',
  csvExport: '80px',
  csvHeader: '120px',
} as const;
const cellStyle = (width: string): React.CSSProperties => ({
  width,
  verticalAlign: 'middle',
  wordBreak: 'break-all',
});
const centerCellStyle = (width: string): React.CSSProperties => ({
  ...cellStyle(width),
  textAlign: 'center',
});

const PresetViewModal: React.FC<PresetViewModalProps> = ({
  show,
  onHide,
  presetData,
}) => {
  const fields = presetData?.fields ?? [];

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      dialogClassName="preset-edit-modal-dialog"
    >
      <Modal.Header closeButton>
        <Modal.Title>プリセット内容の閲覧</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px' }}>
        <p style={{ color: '#666' }}>
          閲覧のみです。プリセットを追加・編集・コピー・削除するには、プリセット機能更新権限が必要です。
        </p>
        <div style={{ marginBottom: '15px' }}>
          <ControlLabel>プリセット名</ControlLabel>
          <div style={valueStyle}>{presetData?.preset_name ?? ''}</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <ControlLabel>説明</ControlLabel>
          <div style={valueStyle}>{presetData?.preset_description ?? ''}</div>
        </div>

        <div style={{ marginTop: '20px' }}>
          {fields.length === 0 ? (
            <span>(項目がありません)</span>
          ) : (
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <Table
                striped
                bordered
                style={{ width: '100%', tableLayout: 'fixed', marginBottom: 0 }}
              >
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#f5f5f5',
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={cellStyle(COL_WIDTH.no)}>No</th>
                    <th style={cellStyle(COL_WIDTH.displayName)}>表示名</th>
                    <th style={cellStyle(COL_WIDTH.path)}>パス</th>
                    <th style={cellStyle(COL_WIDTH.schemaTitle)}>
                      文書(スキーマ)タイトル
                    </th>
                    <th style={cellStyle(COL_WIDTH.version)}>バージョン</th>
                    <th style={centerCellStyle(COL_WIDTH.visible)}>表示</th>
                    <th style={centerCellStyle(COL_WIDTH.csvExport)}>
                      CSV出力
                    </th>
                    <th style={centerCellStyle(COL_WIDTH.csvHeader)}>
                      CSVヘッダ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr
                      key={`view_${field.field_id ?? index}_${
                        field.field_name
                      }`}
                    >
                      <td style={centerCellStyle(COL_WIDTH.no)}>
                        {field.display_order || index + 1}
                      </td>
                      <td style={cellStyle(COL_WIDTH.displayName)}>
                        {field.display_name}
                      </td>
                      <td style={cellStyle(COL_WIDTH.path)}>
                        {pathText(field)}
                      </td>
                      <td style={centerCellStyle(COL_WIDTH.schemaTitle)}>
                        {field.schema_title || '-'}
                      </td>
                      <td style={centerCellStyle(COL_WIDTH.version)}>
                        {field.schema_version || '-'}
                      </td>
                      <td style={centerCellStyle(COL_WIDTH.visible)}>
                        {flagText(field.is_visible)}
                      </td>
                      <td style={centerCellStyle(COL_WIDTH.csvExport)}>
                        {flagText(field.is_csv_export)}
                      </td>
                      <td style={centerCellStyle(COL_WIDTH.csvHeader)}>
                        {csvHeaderText(field)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>閉じる</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PresetViewModal;
