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
import {
  isOutputViewDataMessage,
  OUTPUT_VIEW_READY,
} from '../../common/OutputViewMessage';

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
    console.log('[OutputView] output_readyを送信します');
    // 開いた画面（呼び出し元）にだけ、同じオリジンを指定して送る
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener?.postMessage(OUTPUT_VIEW_READY, window.location.origin);
  };

  /**
   * 受け取ったデータを表示する
   * データの形は OutputViewMessage.ts の OutputViewDataMessage の payload を参照
   * @param data 表示するデータ
   */
  const showData = (data: any) => {
    setCodeType(CODE_TYPES.NONE);
    if (!data) {
      console.warn('[OutputView] 表示するデータがありません');
      return;
    }
    // eslint-disable-next-line no-prototype-builtins
    if ((data as object)?.hasOwnProperty('viewerType')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (data.viewerType === CODE_TYPES.LOG) {
        console.log('[OutputView] LOG形式として処理');
        setHeader('ドキュメント上書き結果');
        setCodeType(CODE_TYPES.CSV);
        // eslint-disable-next-line
        setResultTable(data.csvData as any[]);
      }
    }
    // eslint-disable-next-line no-prototype-builtins
    else if ((data as object)?.hasOwnProperty('jsonData')) {
      // jsonDataプロパティがある場合（空配列や空オブジェクトも含む）
      console.log('[OutputView] jsonDataプロパティあり - JSON形式として処理');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const jsonstr = JSON.stringify(data.jsonData, null, 2);
      setCodeType(CODE_TYPES.JSON);
      setResultStr(jsonstr);
    } else if (typeof data === 'string') {
      // 文字列の場合、JSON文字列の可能性をチェック
      try {
        const parsed = JSON.parse(data) as unknown;
        // パース成功した場合はJSONとして表示
        console.log('[OutputView] JSON文字列をパースしてJSON形式として処理');
        const jsonstr = JSON.stringify(parsed, null, 2);
        setCodeType(CODE_TYPES.JSON);
        setResultStr(jsonstr);
      } catch {
        // JSONでない場合は文字列として表示
        console.log('[OutputView] 文字列として処理');
        setCodeType(CODE_TYPES.JAVA_SCRIPT);
        setResultStr(data);
      }
    } else if (Array.isArray(data)) {
      // 配列の場合
      if (data.length > 0 && Array.isArray(data[0])) {
        // 2次元配列（CSV形式）
        console.log('[OutputView] 2次元配列 - CSV形式として処理');
        setCodeType(CODE_TYPES.CSV);
        setResultTable(data);
      } else {
        // 1次元配列（空配列も含む）はJSON形式として表示
        console.log('[OutputView] 1次元配列 - JSON形式として処理');
        const jsonstr = JSON.stringify(data, null, 2);
        setCodeType(CODE_TYPES.JSON);
        setResultStr(jsonstr);
      }
    } else if (typeof data === 'object' && data !== null) {
      // オブジェクトの場合（空オブジェクトも含む）
      console.log('[OutputView] オブジェクト - JSON形式として処理');
      const jsonstr = JSON.stringify(data, null, 2);
      setCodeType(CODE_TYPES.JSON);
      setResultStr(jsonstr);
    } else {
      // データの中身（患者情報を含み得る）はログに出さない
      console.warn('[OutputView] データが処理されませんでした:', typeof data);
    }
  };

  // メッセージ受信準備が完了したら呼び元に通知する
  useEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      // 開いた画面（呼び出し元）から、決めた形で届いたデータだけを受け付ける。
      // 同じオリジンでも、拡張機能（Redux DevTools など）が送る message などは無視し、受け取りを続ける
      if (
        window.opener == null ||
        e.source !== window.opener ||
        e.origin !== window.location.origin ||
        !isOutputViewDataMessage(e.data)
      ) {
        return;
      }

      // データの中身（患者情報を含み得る）はログに出さない
      const { payload } = e.data;
      console.log('[OutputView] データを受信しました:', {
        type: typeof payload,
        isArray: Array.isArray(payload),
      });
      showData(payload);

      window.removeEventListener('message', receiveMessage);
    };

    // データ受信時の処理（準備完了の通知より先に登録する）
    window.addEventListener('message', receiveMessage);

    // DOMContentLoadedイベントではなく、useEffect内で直接実行
    // これにより、コンポーネントがマウントされた後に確実に送信される
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', readyNotificate, false);
    } else {
      // 既にDOMContentLoadedが発火している場合は即座に送信
      readyNotificate();
    }
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
