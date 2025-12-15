import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import fileDownload from 'js-file-download';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx.min';
import 'prismjs/components/prism-json.min';
import 'prismjs/components/prism-javascript.min';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min';
import 'prismjs/themes/prism-tomorrow.min.css';
import CsvTable from './CsvTable';
import { toShiftJIS } from '../../common/CommonUtility';

/**
 * データ出力用View
 * @returns
 */
const OutputView = () => {
  // 表示する文字列
  const [resultStr, setResultStr] = useState<string | null>('');
  const [resultTable, setResultTable] = useState<(string | number)[][]>([[]]);
  const [header, setHeader] = useState<string | undefined>();

  const CODE_TYPES = {
    NONE: '',
    JSON: 'language-json',
    JAVA_SCRIPT: 'language-js',
    CSV: 'csv',
    LOG: 'log',
  };
  const [codeType, setCodeType] = useState<string>(CODE_TYPES.NONE);

  const readyNotificate = () => {
    // デバッグ: output_readyを送信
    console.log('[OutputView] output_readyを送信します');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener?.postMessage('output_ready', window.origin);
  };

  // メッセージ受信準備が完了したら呼び元に通知する
  useEffect(() => {
    // DOMContentLoadedイベントではなく、useEffect内で直接実行
    // これにより、コンポーネントがマウントされた後に確実に送信される
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', readyNotificate, false);
    } else {
      // 既にDOMContentLoadedが発火している場合は即座に送信
      readyNotificate();
    }

    const receiveMessage = (e: MessageEvent) => {
      // デバッグ: OutputViewで受信したデータをログ出力
      const hasViewerType = (e.data as object)?.hasOwnProperty?.('viewerType') ?? false;
      const hasJsonData = (e.data as object)?.hasOwnProperty?.('jsonData') ?? false;
      console.log('[OutputView] 受信したデータ:', {
        type: typeof e.data,
        isArray: Array.isArray(e.data),
        hasViewerType,
        hasJsonData,
        value: e.data,
        stringified: typeof e.data === 'string' ? e.data : JSON.stringify(e.data),
      });

      setCodeType(CODE_TYPES.NONE);
      if (e.origin === window.location.origin && e.data) {
        // eslint-disable-next-line no-prototype-builtins
        if ((e.data as object)?.hasOwnProperty('viewerType')) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (e.data.viewerType === CODE_TYPES.LOG) {
            console.log('[OutputView] LOG形式として処理');
            setHeader('ドキュメント上書き結果');
            setCodeType(CODE_TYPES.CSV);
            // eslint-disable-next-line
            setResultTable(e.data.csvData as any[]);
          }
        }
        // eslint-disable-next-line no-prototype-builtins
        else if ((e.data as object)?.hasOwnProperty('jsonData')) {
          // jsonDataプロパティがある場合（空配列や空オブジェクトも含む）
          console.log('[OutputView] jsonDataプロパティあり - JSON形式として処理');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const jsonstr = JSON.stringify(e.data.jsonData, null, 2);
          setCodeType(CODE_TYPES.JSON);
          setResultStr(jsonstr);
        } else if (typeof e.data === 'string') {
          // 文字列の場合、JSON文字列の可能性をチェック
          try {
            const parsed = JSON.parse(e.data);
            // パース成功した場合はJSONとして表示
            console.log('[OutputView] JSON文字列をパースしてJSON形式として処理');
            const jsonstr = JSON.stringify(parsed, null, 2);
            setCodeType(CODE_TYPES.JSON);
            setResultStr(jsonstr);
          } catch {
            // JSONでない場合は文字列として表示
            console.log('[OutputView] 文字列として処理');
            setCodeType(CODE_TYPES.JAVA_SCRIPT);
            setResultStr(e.data);
          }
        } else if (Array.isArray(e.data)) {
          // 配列の場合
          if (e.data.length > 0 && Array.isArray(e.data[0])) {
            // 2次元配列（CSV形式）
            console.log('[OutputView] 2次元配列 - CSV形式として処理');
            setCodeType(CODE_TYPES.CSV);
            setResultTable(e.data);
          } else {
            // 1次元配列（空配列も含む）はJSON形式として表示
            console.log('[OutputView] 1次元配列 - JSON形式として処理');
            const jsonstr = JSON.stringify(e.data, null, 2);
            setCodeType(CODE_TYPES.JSON);
            setResultStr(jsonstr);
          }
        } else if (typeof e.data === 'object' && e.data !== null) {
          // オブジェクトの場合（空オブジェクトも含む）
          console.log('[OutputView] オブジェクト - JSON形式として処理');
          const jsonstr = JSON.stringify(e.data, null, 2);
          setCodeType(CODE_TYPES.JSON);
          setResultStr(jsonstr);
        } else {
          console.warn('[OutputView] データが処理されませんでした:', e.data);
        }
      } else {
        console.warn('[OutputView] データが無いか、originが一致しません:', {
          origin: e.origin,
          windowOrigin: window.location.origin,
          data: e.data,
        });
      }

      window.removeEventListener('message', receiveMessage);
    };

    // データ受信時の処理
    window.addEventListener('message', receiveMessage);
  }, []);

  useEffect(() => {
    Prism.manual = true;
    Prism.highlightAll();
  });

  // ダウンロードボタン押下
  const saveClick = useCallback(() => {
    if (resultStr) {
      fileDownload(resultStr, 'data.json');
    } else {
      // eslint-disable-next-line no-alert
      alert('ダウンロード可能なデータがありません');
    }
  }, [resultStr]);

  const saveClickCsv = useCallback(() => {
    if (resultTable) {
      let csvText = '';
      // eslint-disable-next-line no-plusplus
      for (let index = 0; index < resultTable.length; index++) {
        const row = resultTable[index];
        let columnFirst = true;
        // eslint-disable-next-line no-plusplus
        for (let cIndex = 0; cIndex < row.length; cIndex++) {
          const column = row[cIndex];
          if (columnFirst) {
            columnFirst = false;
          } else {
            csvText += ',';
          }
          csvText +=
            typeof column === 'string'
              ? `"${column.replace(/"/g, '""')}"`
              : column.toString();
        }
        csvText += '\n';
      }

      const sjisText = toShiftJIS(csvText);

      fileDownload(sjisText, 'data.csv');
    } else {
      // eslint-disable-next-line no-alert
      alert('ダウンロード可能なデータがありません');
    }
  }, [resultTable]);

  return (
    <div>
      <div>
        {codeType === CODE_TYPES.JSON && (
          <Button
            bsStyle="success"
            className="normal-button"
            onClick={saveClick}
          >
            ダウンロード
          </Button>
        )}
        {codeType === CODE_TYPES.CSV && (
          <Button
            bsStyle="success"
            className="normal-button"
            onClick={saveClickCsv}
          >
            ダウンロード
          </Button>
        )}
        {header && <h1 style={{ marginLeft: '10px' }}>{header}</h1>}
      </div>
      {codeType !== CODE_TYPES.CSV && (
        <pre style={{ margin: '1rem ' }} className="line-numbers">
          <code className={codeType}>
            {resultStr || '表示可能なデータがありません'}
          </code>
        </pre>
      )}
      {codeType === CODE_TYPES.CSV && <CsvTable csv={resultTable} />}
    </div>
  );
};

export default OutputView;
