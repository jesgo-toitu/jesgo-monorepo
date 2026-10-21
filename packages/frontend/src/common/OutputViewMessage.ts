/**
 * データ出力用画面（/OutputView）とのデータの受け渡し
 *
 * 受け渡しの流れ
 * 1. 呼び出し元が出力画面を開く（window.open）
 * 2. 出力画面が準備できたら、開いた画面（window.opener）へ OUTPUT_VIEW_READY を送る
 * 3. 呼び出し元は、自分が開いた出力画面からの OUTPUT_VIEW_READY だけに応じて、決めた形（OutputViewDataMessage）でデータを送る
 * 4. 出力画面は、開いた画面から届いた決めた形のデータだけを表示する
 *
 * 同じオリジンの message は、ブラウザの拡張機能（Redux DevTools など）も送ることがある。
 * 送り元と形を確かめずに受け取ると、無関係な message を表示したり、本来のデータを受け取れなくなったりするため、
 * 送り元のウィンドウと形の両方を確かめる。
 */

/** 出力画面の準備ができたことを知らせる message */
export const OUTPUT_VIEW_READY = 'output_ready';

/** 出力画面へ送るデータの種類を表す値 */
export const OUTPUT_VIEW_DATA_TYPE = 'jesgo:output-view-data';

/**
 * 出力画面へ送るデータの形
 * payload は出力画面が表示できる既存の形のいずれか
 * - { viewerType: 'log', csvData: 2 次元配列 }（ドキュメント上書き結果）
 * - { jsonData: 任意の値 }（JSON として表示）
 * - 文字列（JSON として読めれば JSON、読めなければスクリプトとして表示）
 * - 配列（2 次元配列は表、それ以外は JSON として表示）
 * - オブジェクト（JSON として表示）
 */
export interface OutputViewDataMessage {
  type: typeof OUTPUT_VIEW_DATA_TYPE;
  payload: unknown;
}

/** 出力画面へ送るデータを作る */
export const createOutputViewDataMessage = (
  payload: unknown
): OutputViewDataMessage => ({ type: OUTPUT_VIEW_DATA_TYPE, payload });

/** 出力画面へ送るデータの形か */
export const isOutputViewDataMessage = (
  data: unknown
): data is OutputViewDataMessage =>
  data !== null &&
  typeof data === 'object' &&
  !Array.isArray(data) &&
  (data as { type?: unknown }).type === OUTPUT_VIEW_DATA_TYPE &&
  Object.prototype.hasOwnProperty.call(data, 'payload');

/**
 * 出力画面を開き、準備ができたらデータを送る
 * - 自分が開いた出力画面（window.open の戻り値）から届いた OUTPUT_VIEW_READY だけに応じる
 * - それ以外の message では受け取りをやめない
 * - データは同じオリジンの画面にだけ送る（targetOrigin を指定する）
 * @param win 呼び出し元の window
 * @param payload 出力画面に表示するデータ（OutputViewDataMessage の payload）
 */
export const openOutputViewWithData = (
  win: typeof window,
  payload: unknown
): void => {
  const targetOrigin = win.location.origin;
  let outputWindow: Window | null = null;

  const postData = (e: MessageEvent) => {
    if (
      outputWindow === null ||
      e.source !== outputWindow ||
      e.origin !== targetOrigin ||
      e.data !== OUTPUT_VIEW_READY
    ) {
      // 自分が開いた出力画面からの準備完了の通知ではない（拡張機能などの message）。受け取りは続ける
      return;
    }
    outputWindow.postMessage(createOutputViewDataMessage(payload), targetOrigin);
    win.removeEventListener('message', postData, false);
  };

  win.addEventListener('message', postData, false);
  outputWindow = win.open('/OutputView', 'outputview');
  if (outputWindow === null) {
    // 画面を開けなかった（ポップアップのブロックなど）場合は待たない
    win.removeEventListener('message', postData, false);
  }
};
