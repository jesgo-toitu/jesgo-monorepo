/**
 * 患者リストから実行する出力系プラグインの対象症例の決定
 *
 * 患者リストの「プラグイン選択」から出力系（データを更新しない）のプラグインを実行したときに、
 * プラグインへ渡す症例を、表示中のページではなく「実行した時点の一覧の全件」にする。
 * - 一覧の全件とは、一覧の取得に実際に使った検索・絞り込みの条件（プリセット項目の絞り込みを含む）に
 *   合う全件である。ページ・表示件数には左右されない。並び順は一覧と同じ
 * - 入力しただけで「検索」していない条件、別の表示形式で前に取得した一覧は使わない
 *   （一覧を取得するたびに、取得に使った要求を記録し直すため）
 * - 一覧が読み込み前・取得に失敗した・0 件のときは、症例を 1 件も渡さない
 *
 * 一括更新系・新規登録系のプラグインの対象は変えない（本モジュールは使わない）。
 * 画面（React）に依存しない処理だけを置く。
 */
import { ApiReturnObject, METHOD_TYPE, RESULT } from '@jesgo/common';
import type { jesgoCaseDefine } from '../store/formDataReducer';
import { getActiveFilterLabels } from './PatientListViewState';

/**
 * 全件を取得するときに一覧 API に渡す表示件数
 * （一覧 API はページの指定が無いと 50 件で返すため、全件が 1 ページに収まる値を明示する）
 */
export const PLUGIN_TARGET_ALL_PAGE_SIZE = 2147483647;

/** 利用者への通知文言 */
export const PLUGIN_TARGET_MESSAGES = {
  NO_TARGET: '対象の症例がありません。',
  NOT_LOADED: '患者リストの一覧の読み込みが完了していません。一覧が表示されてから実行してください。',
  /** 出力結果に患者情報が含まれるプラグインの確認の文言（症例画面から実行するときの確認と同じ文言） */
  PATIENT_INFO_CONFIRM: '出力結果に患者情報が含まれています、実行しますか？',
  /** 患者情報を含まないプラグインの確認の最後の行 */
  EXECUTE_CONFIRM: '実行しますか？',
  LIST_FAILED:
    '患者リストの一覧の取得に失敗しています。一覧を表示し直してから実行してください。',
  FETCH_FAILED:
    '対象の症例の取得に失敗しました。プラグインは実行していません。\n時間をおいて再度実行してください。',
} as const;

/** 一覧の取得に使った要求（ページ・表示件数を除く） */
export type PatientListFetchRequest = {
  /** HTTP メソッド */
  method: 'GET' | 'POST';
  /** クエリ文字列（検索条件・並び順・プリセット ID。ページ・表示件数を除く） */
  params: string;
  /** POST の本文（並び順・プリセット ID・プリセット項目の絞り込み。ページ・表示件数を除く） */
  body: Record<string, unknown> | null;
  /**
   * 表示中の行から対象を作る場合は true
   * （カスタムプリセットの患者リスト表示は、一覧 API がページを切らずに全件を返し、
   *   画面が全件の行を持ってページを切るため、表示中の行の全件が一覧の全件になる）
   */
  useDisplayedRows: boolean;
  /** 一覧に効いている絞り込みの名前（実行前の確認に示す） */
  filterLabels: string[];
};

/** 一覧の状態（プラグインの対象を決めるための記録） */
export type PatientListTargetSource =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; request: PatientListFetchRequest };

/** 対象症例の収集結果 */
export type PluginTargetCollectResult =
  | { ok: true; cases: jesgoCaseDefine[] }
  | { ok: false; message: string };

/** 一覧 API の 1 行（対象を作るのに使う項目だけ） */
export type PatientListRowForTarget = {
  caseId: number | string;
  patientId: string;
  patientName: string;
};

/** プリセット表示の 1 行（対象を作るのに使う項目だけ） */
export type PresetRowForTarget = {
  case_id: number | string;
  his_id: string;
  name: string;
};

/**
 * 一覧の 1 行から、プラグインへ渡す症例の情報を作る
 * （改修前に表示中のページから作っていた情報と同じ形・同じ値にする）
 */
export const toPluginCase = (
  caseId: number | string,
  patientId: string,
  patientName: string
): jesgoCaseDefine => ({
  case_id: caseId.toString(),
  name: patientName,
  date_of_birth: '1900-01-01',
  date_of_death: '1900-01-01',
  sex: 'F',
  his_id: patientId,
  decline: false,
  registrant: -1,
  last_updated: '1900-01-01',
  is_new_case: false,
});

/**
 * 一覧の取得に使った要求を作る
 * @param method HTTP メソッド
 * @param urlParams 一覧の取得に使ったクエリ（ページ・表示件数を含んでいてよい。取り除く）
 * @param body 一覧の取得に使った POST の本文（ページ・表示件数を含んでいてよい。取り除く）
 * @param query 一覧の取得に使った検索条件（「絞り込み中」の判定に使う。ページ・並び順を除く）
 * @param presetFilterCount 一覧の取得に使ったプリセット項目の絞り込みの数
 * @param useDisplayedRows 表示中の行から対象を作る場合は true
 */
export const createListFetchRequest = (
  method: 'GET' | 'POST',
  urlParams: URLSearchParams,
  body: Record<string, unknown> | null,
  query: string,
  presetFilterCount: number,
  useDisplayedRows: boolean
): PatientListFetchRequest => {
  const params = new URLSearchParams(urlParams.toString());
  params.delete('page');
  params.delete('pageSize');
  let requestBody: Record<string, unknown> | null = null;
  if (body) {
    requestBody = { ...body };
    delete requestBody.page;
    delete requestBody.pageSize;
  }
  return {
    method,
    params: params.toString(),
    body: requestBody,
    useDisplayedRows,
    filterLabels: getActiveFilterLabels(query, presetFilterCount),
  };
};

/**
 * 一覧の全件を取得する要求（URL と本文）を作る
 * 一覧の取得に使った要求と同じ条件・並び順で、1 ページ目に全件が入る表示件数を指定する
 */
export const buildAllCasesRequest = (
  request: PatientListFetchRequest
): { method: 'GET' | 'POST'; url: string; body: Record<string, unknown> | null } => {
  if (request.method === 'POST') {
    return {
      method: 'POST',
      url: request.params ? `patientlist?${request.params}` : 'patientlist',
      body: {
        ...(request.body ?? {}),
        page: 1,
        pageSize: PLUGIN_TARGET_ALL_PAGE_SIZE,
      },
    };
  }
  const params = new URLSearchParams(request.params);
  params.set('page', '1');
  params.set('pageSize', PLUGIN_TARGET_ALL_PAGE_SIZE.toString());
  return { method: 'GET', url: `patientlist?${params.toString()}`, body: null };
};

/**
 * 一覧 API の応答から、プラグインへ渡す症例を作る
 * 応答の形が不正な場合、または件数が総件数と合わない場合（全件が返っていない）は失敗とする
 * @param responseBody 一覧 API の応答本文
 */
export const parseAllCasesResponse = (
  responseBody: unknown
): PluginTargetCollectResult => {
  const failed: PluginTargetCollectResult = {
    ok: false,
    message: PLUGIN_TARGET_MESSAGES.FETCH_FAILED,
  };
  if (!responseBody || typeof responseBody !== 'object') return failed;
  const { data, totalCount } = responseBody as {
    data?: unknown;
    totalCount?: unknown;
  };
  if (!Array.isArray(data)) return failed;
  // 一部の症例だけが返った場合に、知らないうちに対象が欠けないようにする
  if (typeof totalCount === 'number' && totalCount !== data.length) {
    return failed;
  }
  const items = data as Partial<PatientListRowForTarget>[];
  const hasInvalidItem = items.some(
    (item) =>
      !item ||
      item.caseId === undefined ||
      item.caseId === null ||
      item.caseId === ''
  );
  if (hasInvalidItem) return failed;

  const cases: jesgoCaseDefine[] = [];
  const seen = new Set<string>();
  items.forEach((item) => {
    const caseId = item.caseId as number | string;
    const key = caseId.toString();
    if (!seen.has(key)) {
      seen.add(key);
      cases.push(
        toPluginCase(caseId, item.patientId ?? '', item.patientName ?? '')
      );
    }
  });
  return { ok: true, cases };
};

/**
 * 表示中の行（全件）から、プラグインへ渡す症例を作る
 * 1 つの症例が複数の行に表示されている場合は 1 件にまとめる（最初に現れた行の位置の順）
 * @param rows 表示中の行の全件
 */
export const collectCasesFromRows = (
  rows: PresetRowForTarget[]
): jesgoCaseDefine[] => {
  const cases: jesgoCaseDefine[] = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    if (row && row.case_id !== undefined && row.case_id !== null) {
      const key = row.case_id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        cases.push(toPluginCase(row.case_id, row.his_id ?? '', row.name ?? ''));
      }
    }
  });
  return cases;
};

/** 一覧 API を呼ぶ関数（ApiAccess の apiAccess と同じ形。単体で差し替えられるように引数で受け取る） */
export type ListApiAccess = (
  methodType: number,
  url: string,
  body?: unknown
) => Promise<ApiReturnObject>;

/**
 * 一覧の取得に使った要求と同じ条件で、一覧の全件を取得してプラグインへ渡す症例を作る
 * @param request 一覧の取得に使った要求
 * @param api 一覧 API を呼ぶ関数
 */
export const fetchAllListCases = async (
  request: PatientListFetchRequest,
  api: ListApiAccess
): Promise<PluginTargetCollectResult> => {
  const allRequest = buildAllCasesRequest(request);
  try {
    const result =
      allRequest.method === 'POST'
        ? await api(METHOD_TYPE.POST, allRequest.url, allRequest.body)
        : await api(METHOD_TYPE.GET, allRequest.url);
    if (result.statusNum !== RESULT.NORMAL_TERMINATION) {
      return { ok: false, message: PLUGIN_TARGET_MESSAGES.FETCH_FAILED };
    }
    return parseAllCasesResponse(result.body);
  } catch {
    return { ok: false, message: PLUGIN_TARGET_MESSAGES.FETCH_FAILED };
  }
};

/**
 * 一覧の状態から、実行できない理由の通知文言を返す（実行できる場合は null）
 * @param source 一覧の状態
 */
export const getUnavailableMessage = (
  source: PatientListTargetSource
): string | null => {
  switch (source.status) {
    case 'loaded':
      return null;
    case 'failed':
      return `${PLUGIN_TARGET_MESSAGES.NO_TARGET}\n${PLUGIN_TARGET_MESSAGES.LIST_FAILED}`;
    default:
      return `${PLUGIN_TARGET_MESSAGES.NO_TARGET}\n${PLUGIN_TARGET_MESSAGES.NOT_LOADED}`;
  }
};

/**
 * 実行前の確認の文言を作る
 * @param pluginName プラグイン名
 * @param targetCount プラグインへ渡す症例の件数
 * @param filterLabels 一覧に効いている絞り込みの名前
 * @param displayedCount 一覧の件数表示の値
 * @param useDisplayedRows 件数表示が行数の場合（カスタムプリセットの患者リスト表示）は true
 * @param attachPatientInfo 出力結果に患者情報が含まれるプラグインの場合は true。
 *   患者情報の確認はこの確認にまとめる（患者リストからの実行では、別の確認を出さない）
 */
export const buildTargetConfirmMessage = (
  pluginName: string,
  targetCount: number,
  filterLabels: string[],
  displayedCount: number,
  useDisplayedRows: boolean,
  attachPatientInfo: boolean
): string => {
  const lines: string[] = [];
  lines.push(`プラグイン「${pluginName}」を実行します。`);
  lines.push('');
  lines.push(`対象の症例：${targetCount.toLocaleString()}件`);
  if (filterLabels.length > 0) {
    lines.push(`一覧の絞り込み：絞り込み中（${filterLabels.join('・')}）`);
    lines.push('※ 絞り込まれた一覧の症例だけが対象になります。');
  } else {
    lines.push('一覧の絞り込み：なし');
  }
  if (displayedCount !== targetCount) {
    if (useDisplayedRows) {
      lines.push(
        `※ 一覧の件数表示は ${displayedCount.toLocaleString()}件です（1 つの症例が複数の行に表示されているため、症例の件数と異なります）。`
      );
    } else {
      lines.push(
        `※ 一覧の件数表示（${displayedCount.toLocaleString()}件）と異なります。一覧を表示した後に症例が追加・削除・更新された可能性があります。`
      );
    }
  }
  lines.push('');
  lines.push(
    attachPatientInfo
      ? PLUGIN_TARGET_MESSAGES.PATIENT_INFO_CONFIRM
      : PLUGIN_TARGET_MESSAGES.EXECUTE_CONFIRM
  );
  return lines.join('\n');
};
