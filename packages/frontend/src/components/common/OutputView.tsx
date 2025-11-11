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

  const readyNotificate = (e: Event) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (e.currentTarget as Window).opener.postMessage(
      'output_ready',
      window.origin
    );

    window.removeEventListener('DOMContentLoaded', readyNotificate);
  };

  // メッセージ受信準備が完了したら呼び元に通知する
  useEffect(() => {
    window.addEventListener('DOMContentLoaded', readyNotificate, false);

    const receiveMessage = (e: MessageEvent) => {
      setCodeType(CODE_TYPES.NONE);
      if (e.origin === window.location.origin && e.data) {
        // eslint-disable-next-line no-prototype-builtins
        if ((e.data as object)?.hasOwnProperty('viewerType')) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (e.data.viewerType === CODE_TYPES.LOG) {
            setHeader('ドキュメント上書き結果');
            setCodeType(CODE_TYPES.CSV);
            // eslint-disable-next-line
            setResultTable(e.data.csvData as any[]);
          }
        }
        // eslint-disable-next-line no-prototype-builtins
        else if ((e.data as object)?.hasOwnProperty('jsonData')) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (e.data.jsonData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const jsonstr = JSON.stringify(e.data.jsonData, null, 2);
            setCodeType(CODE_TYPES.JSON);
            setResultStr(jsonstr);
          } else {
            setResultStr(null);
          }
        } else if (typeof e.data === 'string') {
          setCodeType(CODE_TYPES.JAVA_SCRIPT);
          setResultStr(e.data);
        } else if (Array.isArray(e.data)) {
          if (e.data.length > 0 && Array.isArray(e.data[0])) {
            setCodeType(CODE_TYPES.CSV);
            setResultTable(e.data);
          }
        }
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
