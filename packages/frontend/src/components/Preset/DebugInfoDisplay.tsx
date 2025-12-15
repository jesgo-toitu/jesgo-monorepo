/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Glyphicon } from 'react-bootstrap';

// デバッグ情報の型定義
export interface DebugInfo {
  document_found: boolean;
  document_id?: number;
  schema_id?: number;
  field_path_resolved?: string;
  value_type?: string;
  processing_time_ms?: number;
}

// デバッグ情報表示コンポーネントのProps
interface DebugInfoDisplayProps {
  debugInfo?: DebugInfo;
  compact?: boolean; // コンパクト表示モード
}

// デバッグ情報表示コンポーネント
export const DebugInfoDisplay: React.FC<DebugInfoDisplayProps> = ({ 
  debugInfo, 
  compact = false 
}) => {
  if (!debugInfo) {
    return <span style={{ color: '#999', fontSize: '11px' }}>-</span>;
  }

  if (compact) {
    return (
      <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
        <div>
          <Glyphicon 
            glyph={debugInfo.document_found ? 'ok' : 'remove'} 
            style={{ color: debugInfo.document_found ? 'green' : 'red' }}
          />
          {debugInfo.value_type && ` ${debugInfo.value_type}`}
          {debugInfo.processing_time_ms && ` (${debugInfo.processing_time_ms}ms)`}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontSize: '11px', lineHeight: '1.3', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
      <div>
        <strong>ドキュメント:</strong> 
        <Glyphicon 
          glyph={debugInfo.document_found ? 'ok' : 'remove'} 
          style={{ color: debugInfo.document_found ? 'green' : 'red', marginLeft: '4px' }}
        />
      </div>
      {debugInfo.document_id && (
        <div><strong>ドキュメントID:</strong> {debugInfo.document_id}</div>
      )}
      {debugInfo.schema_id && (
        <div><strong>スキーマID:</strong> {debugInfo.schema_id}</div>
      )}
      {debugInfo.field_path_resolved && (
        <div><strong>パス:</strong> {debugInfo.field_path_resolved}</div>
      )}
      {debugInfo.value_type && (
        <div><strong>型:</strong> {debugInfo.value_type}</div>
      )}
      {debugInfo.processing_time_ms && (
        <div><strong>処理時間:</strong> {debugInfo.processing_time_ms}ms</div>
      )}
    </div>
  );
};

// テスト結果の型定義
export interface TestResult {
  field_name: string;
  display_name: string;
  field_path: string;
  schema_id_string: string;
  expected_path: string;
  actual_value: any;
  is_match: boolean;
  error_message?: string;
  debug_info?: DebugInfo;
}

// テスト結果表示コンポーネントのProps
interface TestResultDisplayProps {
  result: TestResult;
  onShowDocument?: (schemaIdString: string) => void;
  compact?: boolean;
}

// テスト結果表示コンポーネント
export const TestResultDisplay: React.FC<TestResultDisplayProps> = ({ 
  result, 
  onShowDocument,
  compact = false 
}) => {
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

  if (compact) {
    return (
      <div style={{ fontSize: '12px', padding: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>{result.field_name}</div>
        <div style={{ color: result.is_match ? 'green' : 'red' }}>
          {result.is_match ? '✓ 成功' : '✗ 失敗'}
        </div>
        <DebugInfoDisplay debugInfo={result.debug_info} compact={true} />
      </div>
    );
  }

  return (
    <tr>
      <td style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{result.field_name}</td>
      <td style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{result.display_name}</td>
      <td style={{ fontSize: '12px', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{result.field_path}</td>
      <td style={{ fontSize: '12px', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{result.schema_id_string}</td>
      <td style={{ fontSize: '12px', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
        {result.actual_value !== null && result.actual_value !== undefined
          ? formatDocumentValue(result.actual_value)
          : 'null'
        }
      </td>
      <td style={{ textAlign: 'center' }}>
        {result.is_match ? (
          <Glyphicon glyph="ok" style={{ color: 'green' }} />
        ) : (
          <Glyphicon glyph="remove" style={{ color: 'red' }} />
        )}
      </td>
      <td style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
        <DebugInfoDisplay debugInfo={result.debug_info} />
      </td>
      <td style={{ fontSize: '12px', color: 'red', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
        {result.error_message || '-'}
      </td>
      <td>
        {onShowDocument && (
          <button
            className="btn btn-sm btn-default"
            onClick={() => onShowDocument(result.schema_id_string)}
            style={{ fontSize: '11px' }}
          >
            ドキュメント表示
          </button>
        )}
      </td>
    </tr>
  );
};

export default DebugInfoDisplay;

