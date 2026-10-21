/**
 * 患者リスト画面の表示状態（検索・絞り込みの条件、並び順、ページ等）の保持
 *
 * 症例画面などから患者リストへ戻ったときに、離れる直前と同じ条件で一覧を表示するため、
 * 一覧の取得に使った条件をブラウザのタブ単位の記憶領域（sessionStorage）に保持する。
 * - 保持するのは条件だけで、一覧の中身（患者の氏名・患者ID 等）は保持しない
 *   （戻るたびに、保持した条件で一覧を取り直す）
 * - 画面の再読み込みでは残り、タブを閉じると消える。別のタブとは共有しない
 * - ログイン時・ログアウト時に削除する（前の利用者の条件を次の利用者に引き継がない）
 *
 * 画面（React）に依存しない処理だけを置く。
 */
import type { searchDateInfoDataSet } from '../components/common/SearchDateComponent';

/** sessionStorage のキー */
export const PATIENT_LIST_VIEW_STATE_KEY = 'patient_list_view_state';

/** 保持する形式の版（形式を変えたときに古い保持内容を読み捨てるため） */
export const PATIENT_LIST_VIEW_STATE_VERSION = 1;

/** 表示件数の選択肢 */
export const PATIENT_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** 未入力項目で絞り込みの各項目 */
export type PatientListBlankFields = {
  advancedStage: boolean;
  pathlogicalDiagnosis: boolean;
  initialTreatment: boolean;
  complications: boolean;
  threeYearPrognosis: boolean;
  fiveYearPrognosis: boolean;
};

/** 表示形式ごとの検索条件（入力欄の値） */
export type PatientListSearchWord = {
  cancerType: string;
  showOnlyTumorRegistry: boolean;
  checkOfDiagnosisDate: boolean;
  checkOfEventDate: boolean;
  checkOfBlankFields: boolean;
  blankFields: PatientListBlankFields;
  showProgressAndRecurrence: boolean;
};

/** 検索条件の初期値（ログイン直後の初期表示と同じ） */
export const INITIAL_SEARCH_WORD: PatientListSearchWord = {
  cancerType: 'all',
  showOnlyTumorRegistry: false,
  checkOfDiagnosisDate: false,
  checkOfEventDate: false,
  checkOfBlankFields: false,
  blankFields: {
    advancedStage: false,
    pathlogicalDiagnosis: false,
    initialTreatment: false,
    complications: false,
    threeYearPrognosis: false,
    fiveYearPrognosis: false,
  },
  showProgressAndRecurrence: false,
};

/** 検索条件の初期値の写しを作る */
export const createInitialSearchWord = (): PatientListSearchWord => ({
  ...INITIAL_SEARCH_WORD,
  blankFields: { ...INITIAL_SEARCH_WORD.blankFields },
});

/** プリセット項目の絞り込み条件の値 */
export type PresetFilterValue =
  | string
  | number
  | boolean
  | searchDateInfoDataSet
  | string[]
  | Partial<PatientListBlankFields>
  | null;

/** プリセット項目の絞り込み条件（field_id ごと） */
export type PresetFilterConditions = {
  [fieldId: number]: {
    enabled: boolean;
    value: PresetFilterValue;
  };
};

/** 検索メニュー・詳細表示メニューの開閉 */
export type PatientListMenuView = 'close' | 'simpleSearch' | 'detailSearch';

/** 並び順の向き */
export type PatientListSortDirection = 'asc' | 'desc' | null;

/** 患者リスト画面の表示状態 */
export interface PatientListViewState {
  version: number;
  /** 表示形式（true: 腫瘍登録管理表示、false: 患者リスト表示） */
  isDetail: boolean;
  /** プリセット表示（true）／通常表示（false） */
  usePreset: boolean;
  /** 一覧の取得に使ったプリセットの ID（通常表示では null） */
  presetId: string | null;
  /** 患者リスト表示の検索条件 */
  normalSearchWord: PatientListSearchWord;
  /** 腫瘍登録管理表示の検索条件 */
  tumorRegistrySearchWord: PatientListSearchWord;
  /** 初回治療開始日 */
  initialTreatmentDate: searchDateInfoDataSet | null;
  /** 診断日（腫瘍登録管理表示） */
  diagnosisDate: searchDateInfoDataSet | null;
  /** イベント日（腫瘍登録管理表示） */
  eventDate: searchDateInfoDataSet | null;
  /** イベント日の種別（最新／全て） */
  eventDateType: string;
  /** プリセット項目の絞り込み条件（患者リスト表示） */
  presetFilterConditions: PresetFilterConditions;
  sortColumn: string | null;
  sortDirection: PatientListSortDirection;
  currentPage: number;
  pageSize: number;
  menuView: PatientListMenuView;
  /** 一覧の取得に使った検索条件（アドレスに付ける文字列。ページ・並び順は含まない） */
  query: string;
}

/** 文字列か */
const isString = (value: unknown): value is string => typeof value === 'string';

/** 真偽値か */
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

/** 単純なオブジェクトか */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 日付検索の値（年・月・日）として正しい形か */
const isSearchDateInfo = (value: unknown): boolean =>
  isRecord(value) &&
  isString(value.year) &&
  isString(value.month) &&
  isString(value.day);

/** 日付検索の条件として正しい形か */
export const isSearchDateInfoDataSet = (
  value: unknown
): value is searchDateInfoDataSet =>
  isRecord(value) &&
  isSearchDateInfo(value.fromInfo) &&
  isSearchDateInfo(value.toInfo) &&
  isBoolean(value.isRange) &&
  isString(value.searchType) &&
  ['年次', '月次', '日次'].includes(value.searchType);

/** 未入力項目で絞り込みの各項目として正しい形か */
const isBlankFields = (value: unknown): value is PatientListBlankFields =>
  isRecord(value) &&
  Object.keys(INITIAL_SEARCH_WORD.blankFields).every((key) =>
    isBoolean(value[key])
  );

/** 検索条件として正しい形か */
const isSearchWord = (value: unknown): value is PatientListSearchWord =>
  isRecord(value) &&
  isString(value.cancerType) &&
  isBoolean(value.showOnlyTumorRegistry) &&
  isBoolean(value.checkOfDiagnosisDate) &&
  isBoolean(value.checkOfEventDate) &&
  isBoolean(value.checkOfBlankFields) &&
  isBlankFields(value.blankFields) &&
  isBoolean(value.showProgressAndRecurrence);

/** 日付検索の条件（未指定は null）として正しい形か */
const isNullableDateInfo = (value: unknown): boolean =>
  value === null || isSearchDateInfoDataSet(value);

/** プリセット項目の絞り込み条件の値として正しい形か */
const isPresetFilterValue = (value: unknown): boolean => {
  if (value === null) return true;
  if (isString(value) || isBoolean(value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isString(item));
  if (isSearchDateInfoDataSet(value)) return true;
  if (isRecord(value)) return Object.values(value).every((v) => isBoolean(v));
  return false;
};

/** プリセット項目の絞り込み条件として正しい形か */
const isPresetFilterConditions = (
  value: unknown
): value is PresetFilterConditions =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, condition]) =>
      /^\d+$/.test(key) &&
      isRecord(condition) &&
      isBoolean(condition.enabled) &&
      isPresetFilterValue(condition.value)
  );

/**
 * 保持していた文字列を表示状態として読み取る
 * 形が正しくない場合（別の版の形式・壊れた値）は null（初期表示）を返す
 * @param json 保持していた文字列
 * @returns 表示状態。読み取れない場合は null
 */
export const parsePatientListViewState = (
  json: string | null
): PatientListViewState | null => {
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  const valid =
    value.version === PATIENT_LIST_VIEW_STATE_VERSION &&
    isBoolean(value.isDetail) &&
    isBoolean(value.usePreset) &&
    (value.presetId === null || isString(value.presetId)) &&
    isSearchWord(value.normalSearchWord) &&
    isSearchWord(value.tumorRegistrySearchWord) &&
    isNullableDateInfo(value.initialTreatmentDate) &&
    isNullableDateInfo(value.diagnosisDate) &&
    isNullableDateInfo(value.eventDate) &&
    (value.eventDateType === '最新' || value.eventDateType === '全て') &&
    isPresetFilterConditions(value.presetFilterConditions) &&
    (value.sortColumn === null || isString(value.sortColumn)) &&
    (value.sortDirection === null ||
      value.sortDirection === 'asc' ||
      value.sortDirection === 'desc') &&
    typeof value.currentPage === 'number' &&
    Number.isInteger(value.currentPage) &&
    value.currentPage >= 1 &&
    typeof value.pageSize === 'number' &&
    PATIENT_LIST_PAGE_SIZE_OPTIONS.includes(value.pageSize) &&
    (value.menuView === 'close' ||
      value.menuView === 'simpleSearch' ||
      value.menuView === 'detailSearch') &&
    isString(value.query);
  if (!valid) return null;

  const state = value as unknown as PatientListViewState;
  // 並び順は列と向きがそろっている場合だけ有効とする
  if (state.sortColumn === null || state.sortDirection === null) {
    return { ...state, sortColumn: null, sortDirection: null };
  }
  return state;
};

/**
 * 保持している表示状態を読み出す
 * @param storage 記憶領域（既定は sessionStorage）
 * @returns 表示状態。保持していない・読み取れない場合は null
 */
export const loadPatientListViewState = (
  storage: Pick<Storage, 'getItem'> = sessionStorage
): PatientListViewState | null => {
  try {
    return parsePatientListViewState(
      storage.getItem(PATIENT_LIST_VIEW_STATE_KEY)
    );
  } catch {
    return null;
  }
};

/**
 * 表示状態を保持する
 * 保持に失敗しても画面の動作は続ける（戻ったときに初期表示になるだけ）
 * @param state 表示状態
 * @param storage 記憶領域（既定は sessionStorage）
 */
export const savePatientListViewState = (
  state: PatientListViewState,
  storage: Pick<Storage, 'setItem'> = sessionStorage
): void => {
  try {
    storage.setItem(PATIENT_LIST_VIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // 記憶領域が使えない場合は保持しない（戻ったときに初期表示になるだけのため、画面の動作は続ける）
  }
};

/**
 * 保持している表示状態を削除する（ログイン時・ログアウト時）
 * @param storage 記憶領域（既定は sessionStorage）
 */
export const clearPatientListViewState = (
  storage: Pick<Storage, 'removeItem'> = sessionStorage
): void => {
  try {
    storage.removeItem(PATIENT_LIST_VIEW_STATE_KEY);
  } catch {
    // 記憶領域が使えない場合は何もしない
  }
};

/**
 * 画面を開くときに使うプリセットに合わせて、保持していた表示状態を整える
 * - 患者リストプリセット管理でプリセットを選んで開いた場合（presetIdParam あり）はプリセット表示にする
 * - 使うプリセットが保持していたものと違う場合、そのプリセットに固有の状態
 *   （プリセット項目の絞り込み・並び順・ページ）は初期状態に戻す
 *   （項目の ID・列がプリセットごとに異なるため）
 * @param state 保持していた表示状態
 * @param presetIdParam アドレスで指定されたプリセット ID（無ければ null）
 * @param savedPresetId 選択中のプリセット ID（localStorage。無ければ null）
 * @returns 整えた表示状態
 */
export const reconcileViewStateWithPreset = (
  state: PatientListViewState,
  presetIdParam: string | null,
  savedPresetId: string | null
): PatientListViewState => {
  let usePreset = state.usePreset;
  let presetId: string | null;
  if (presetIdParam) {
    usePreset = true;
    presetId = presetIdParam;
  } else if (usePreset) {
    presetId = savedPresetId || '1';
  } else {
    // 通常表示はプリセットを使わない
    return state;
  }

  if (state.usePreset && state.presetId === presetId) {
    return { ...state, usePreset };
  }
  return {
    ...state,
    usePreset,
    presetId,
    presetFilterConditions: {},
    sortColumn: null,
    sortDirection: null,
    currentPage: 1,
  };
};

/**
 * 件数に対して存在するページに収める
 * （保持していたページが、取り直した結果では存在しない場合は存在する最後のページにする）
 * @param page ページ（1 から）
 * @param totalCount 件数
 * @param pageSize 1 ページの件数
 * @returns 存在するページ（0 件のときは 1）
 */
export const clampPage = (
  page: number,
  totalCount: number,
  pageSize: number
): number => {
  if (!(pageSize > 0)) return 1;
  const lastPage = Math.max(1, Math.ceil(Math.max(0, totalCount) / pageSize));
  return Math.min(Math.max(1, page), lastPage);
};

/** 日付の条件（JSON の配列）に値が入っているか */
const hasDateCondition = (value: string | null): boolean => {
  if (!value) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      Array.isArray(parsed) &&
      parsed.some((item) => isString(item) && item.trim() !== '')
    );
  } catch {
    return false;
  }
};

/** 未入力項目で絞り込みの項目名（検索条件の名前） */
const BLANK_FIELD_KEYS = Object.keys(INITIAL_SEARCH_WORD.blankFields);

/**
 * 一覧に効いている絞り込みの名前を返す（初期表示と異なる条件だけ）
 * 一覧の取得に実際に使った条件（アドレスに付ける文字列）から判定する
 * @param query 一覧の取得に使った検索条件
 * @param presetFilterCount 一覧の取得に使ったプリセット項目の絞り込みの数
 * @returns 絞り込みの名前の一覧（絞り込みが無ければ空）
 */
export const getActiveFilterLabels = (
  query: string,
  presetFilterCount: number
): string[] => {
  const params = new URLSearchParams(query);
  const labels: string[] = [];
  if (hasDateCondition(params.get('initialTreatmentDate'))) {
    labels.push('初回治療開始日');
  }
  const cancerType = params.get('cancerType');
  if (cancerType && cancerType !== 'all') {
    labels.push('がん種');
  }
  if (params.get('showOnlyTumorRegistry') === 'true') {
    labels.push('腫瘍登録対象のみ表示');
  }
  if (hasDateCondition(params.get('diagnosisDate'))) {
    labels.push('診断日');
  }
  if (hasDateCondition(params.get('eventDate'))) {
    labels.push('イベント日');
  }
  if (BLANK_FIELD_KEYS.some((key) => params.get(key) === 'true')) {
    labels.push('未入力項目');
  }
  if (presetFilterCount > 0) {
    labels.push('プリセット項目の絞り込み');
  }
  return labels;
};
