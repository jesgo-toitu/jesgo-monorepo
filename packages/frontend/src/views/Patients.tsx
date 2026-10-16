/* eslint-disable no-use-before-define */
// ★TODO: JSXの属性を修正する
/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Navbar,
  Button,
  FormControl,
  Checkbox,
  Nav,
  NavItem,
  ButtonToolbar,
  ButtonGroup,
  Glyphicon,
  Jumbotron,
  Radio,
} from 'react-bootstrap';
import { CSVLink } from 'react-csv';
import { useDispatch } from 'react-redux';
import UserTables, { userDataList, userData } from '../components/Patients/UserTables';
import PresetPatientTable from '../components/Patients/PresetPatientTable';
import Pagination from '../components/Patients/Pagination';
import './Patients.css';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import { settingsFromApi } from './Settings';
import { csvHeader, patientListCsv } from '../common/MakeCsv';
import { formatDate, formatTime, compareValues } from '../common/CommonUtility';
import { Const } from '../common/Const';
import Loading from '../components/CaseRegistration/Loading';
import { storeSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import { jesgoCaseDefine } from '../store/formDataReducer';
import { jesgoPluginColumns } from '../common/Plugin';
import { PatientListPluginButton } from '../components/common/PluginButton';
import SearchDateComponent, {
  convertSearchDate,
  searchDateInfoDataSet,
} from '../components/common/SearchDateComponent';
import { reloadState } from './Registration';
import { LoadPluginList } from '../common/DBUtility';
import { PresetField, DocumentContent, PatientInfo, transformDocuments, formatPatientRow, convertToCsvFormat } from '../common/PresetPatientDisplay';
import { GetSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import {
  INITIAL_SEARCH_WORD,
  PATIENT_LIST_PAGE_SIZE_OPTIONS,
  PATIENT_LIST_VIEW_STATE_VERSION,
  PatientListMenuView,
  PatientListSearchWord,
  PatientListViewState,
  PresetFilterConditions,
  clampPage,
  getActiveFilterLabels,
  loadPatientListViewState,
  reconcileViewStateWithPreset,
  savePatientListViewState,
} from '../common/PatientListViewState';

const UNIT_TYPE = {
  DAY: 0,
  MONTH: 1,
  YEAR: 2,
};
const makeSelectDate = (
  unit: number,
  startDate: Date,
  optionNum: number,
  startWithNewest = true
): string[] => {
  const dateList: string[] = [];
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < optionNum; index++) {
    const newDate = new Date(startDate.getTime());
    switch (unit) {
      case UNIT_TYPE.DAY:
        newDate.setDate(newDate.getDate() - index);
        dateList.push(formatDate(newDate, '-'));
        break;

      case UNIT_TYPE.MONTH:
        newDate.setDate(1); // 1日に設定し、月ごとの最終日関連の想定しない戻り値を避ける
        newDate.setMonth(newDate.getMonth() - index);
        dateList.push(formatDate(newDate, '-').substring(0, 7));
        break;

      case UNIT_TYPE.YEAR:
        newDate.setMonth(0); // 1月に設定し、うるう年関連の想定しない戻り値を避ける
        newDate.setFullYear(newDate.getFullYear() - index);
        dateList.push(formatDate(newDate, '-').substring(0, 4));
        break;

      default:
    }
  }
  if (startWithNewest === false) {
    dateList.reverse();
  }
  return dateList;
};

// 検索条件の初期値（ログイン直後の初期表示と同じ）
const initialSearchWord: PatientListSearchWord = INITIAL_SEARCH_WORD;

/**
 * 検索メニュー・詳細表示メニューの開閉に応じた表示のクラス
 * @param view メニューの開閉
 */
const getMenuViewClasses = (view: PatientListMenuView) => {
  switch (view) {
    case 'simpleSearch':
      return {
        searchFormOpen: 'search-form-opened block',
        simpleSearchButtons: 'block',
        detailSearchOpen: 'hidden',
        tableMode: 'search_on',
      };
    case 'detailSearch':
      return {
        searchFormOpen: 'search-form-opened block',
        simpleSearchButtons: 'hidden',
        detailSearchOpen: 'detail-form-opened block',
        tableMode: 'detail_on',
      };
    default:
      return {
        searchFormOpen: 'hidden',
        simpleSearchButtons: 'hidden',
        detailSearchOpen: 'hidden',
        tableMode: 'normal',
      };
  }
};

/**
 * 画面を開くときに、保持していた表示状態を読み出す
 * （症例画面などから戻ったとき・再読み込みしたときに、離れる直前の状態に戻すため）
 * @param search 画面を開いたときのアドレスの検索部分
 * @returns 表示状態。保持していない場合は null（初期表示）
 */
const restoreViewStateOnMount = (
  search: string
): PatientListViewState | null => {
  const saved = loadPatientListViewState();
  if (!saved) return null;
  const presetIdParam = new URLSearchParams(search).get('presetId');
  return reconcileViewStateWithPreset(
    saved,
    presetIdParam,
    localStorage.getItem('selected_preset_id')
  );
};

const makeSelectDataFromStorage = (columnType: string): string[] => {
  const localStorageItem = localStorage.getItem(columnType);
  const dataList = localStorageItem
    ? (JSON.parse(localStorageItem) as string[])
    : [];

  const dataMap: Map<number, string> = new Map();
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < dataList.length; index++) {
    dataMap.set(index + 1, dataList[index]);
  }
  return dataList;
};

const Patients = () => {
  const navigate = useNavigate();
  const url: string = useLocation().search;
  const userName = localStorage.getItem('display_name');
  // 保持していた表示状態（症例画面などから戻ったとき・再読み込みしたときに復元する。
  // 画面を開いた時点で 1 回だけ読み出し、各状態の初期値に使う）
  const [restoredViewState] = useState<PatientListViewState | null>(() =>
    restoreViewStateOnMount(url)
  );
  const restoredIsDetail = restoredViewState?.isDetail ?? false;
  // 検索メニュー・詳細表示メニューの開閉
  const [menuView, setMenuView] = useState<PatientListMenuView>(
    restoredViewState?.menuView ?? 'close'
  );
  const { searchFormOpen, simpleSearchButtons, detailSearchOpen, tableMode } =
    getMenuViewClasses(menuView);
  const [noSearch, setNoSearch] = useState(
    restoredIsDetail ? 'hidden' : 'table-cell'
  );
  const [search, setSearch] = useState(
    restoredIsDetail ? 'table-cell' : 'hidden'
  );
  const [, setProgressAndRecurrenceColumn] = useState('hidden');
  const [listMode, setListMode] = useState(
    restoredIsDetail ? ['', 'blue'] : ['blue', '']
  );
  const [userListJson, setUserListJson] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [csvData, setCsvData] = useState<object[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<Array<{ label: string; key: string }>>(csvHeader);
  const [jesgoPluginList, setJesgoPluginList] = useState<jesgoPluginColumns[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true); // 初期表示をローディング状態に設定
  const [reload, setReload] = useState<reloadState>({
    isReload: false,
    caller: '',
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedPresetDetail, setSelectedPresetDetail] = useState<any>(null);
  const [presetPatientData, setPresetPatientData] = useState<any[]>([]);
  
  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState<number>(
    restoredViewState?.currentPage ?? 1
  );
  const [pageSize, setPageSize] = useState<number>(
    restoredViewState?.pageSize ?? 50
  );
  const [defaultPageSize, setDefaultPageSize] = useState<number>(50);
  const pageSizeOptions = PATIENT_LIST_PAGE_SIZE_OPTIONS;
  const [totalCount, setTotalCount] = useState<number>(0);
  const [presetPagenationPatientData, setPresetPagenationPatientData] = useState<any[]>([]);

  // ソート関連の状態（カスタム項目の場合は 'custom_${field_id}' 形式）
  const [sortColumn, setSortColumn] = useState<string | null>(
    restoredViewState?.sortColumn ?? null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(
    restoredViewState?.sortDirection ?? null
  );

  // プリセット項目の絞り込み条件の状態管理
  // field_idをキーとして、各項目の絞り込み条件を管理
  // status型の場合、valueは選択されたステータスアイコンの配列（string[]）
  const [presetFilterConditions, setPresetFilterConditions] =
    useState<PresetFilterConditions>(
      restoredViewState?.presetFilterConditions ?? {}
    );

  // 初回治療開始日検索条件（両表示形式で共通）
  const [searchDateInfoInitialTreatment, setSearchDateInfoInitialTreatment] =
    useState<searchDateInfoDataSet | undefined>(
      restoredViewState?.initialTreatmentDate ?? undefined
    );
  // 診断日検索条件（腫瘍登録管理表示）
  const [searchDateInfoDiagnosis, setSearchDateInfoDiagnosis] =
    useState<searchDateInfoDataSet | undefined>(
      restoredViewState?.diagnosisDate ?? undefined
    );
  // イベント日検索条件（腫瘍登録管理表示）
  const [searchDateInfoEventDate, setSearchDateInfoEventDate] =
    useState<searchDateInfoDataSet | undefined>(
      restoredViewState?.eventDate ?? undefined
    );
  // イベント日検索種別
  const [searchDateEventDateType, setSearchDateEventDateType] =
    useState<string>(restoredViewState?.eventDateType ?? '最新');

  // 患者リスト表示用のフィルタリング条件
  const [normalSearchWord, setNormalSearchWord] = useState<PatientListSearchWord>(
    restoredViewState?.normalSearchWord ?? initialSearchWord
  );
  // 腫瘍登録管理表示用のフィルタリング条件
  // （がん種・腫瘍登録対象のみ表示は検索メニューの条件として両表示形式で共有する。setCurrentSearchWord 参照）
  const [tumorRegistrySearchWord, setTumorRegistrySearchWord] =
    useState<PatientListSearchWord>(
      restoredViewState?.tumorRegistrySearchWord ?? initialSearchWord
    );

  // 一覧の取得に使った条件
  // （画面の条件と一覧の条件を一致させ、戻ったときに同じ条件で取り直すために保持する）
  const [appliedViewState, setAppliedViewState] = useState<Omit<
    PatientListViewState,
    'menuView'
  > | null>(null);
  // 一覧に効いている絞り込みの名前（「絞り込み中」の表示に使う）
  const [activeFilterLabels, setActiveFilterLabels] = useState<string[]>([]);
  // 一覧の取り直しの要求（値が変わるたびに、その時点の画面の条件で一覧を取り直す）
  const [listReloadRequest, setListReloadRequest] = useState<number>(0);
  // 復元したページが、取り直した結果で存在するかを 1 回だけ確かめるための印
  const pageCheckAfterRestoreRef = useRef<boolean>(
    !!restoredViewState && restoredViewState.currentPage > 1
  );

  const dispatch = useDispatch();

  /**
   * 表示中の表示形式の検索条件から、一覧の取得に使う検索条件（ページ・並び順を除く）を作る
   * 検索メニューの条件（初回治療開始日・がん種・腫瘍登録対象のみ表示）と、
   * 表示形式ごとの条件（未入力項目、腫瘍登録管理表示の診断日・イベント日）を使う
   * @param isDetailMode 腫瘍登録管理表示の場合は true
   */
  const buildSearchParams = (isDetailMode: boolean): URLSearchParams => {
    const currentSearchWord = isDetailMode
      ? tumorRegistrySearchWord
      : normalSearchWord;
    const initialTreatment = generateSearchDateInfoStrings(
      searchDateInfoInitialTreatment
    );
    const diagnosisDate = generateSearchDateInfoStrings(searchDateInfoDiagnosis);
    const eventDate = generateSearchDateInfoStrings(searchDateInfoEventDate);

    // URLSearchParams.set()は自動的にエンコードするため、encodeURIComponentは不要
    const urlParams = new URLSearchParams();
    // 初回治療開始日
    urlParams.set('initialTreatmentDate', JSON.stringify(initialTreatment));
    // がん種
    urlParams.set('cancerType', currentSearchWord.cancerType);
    // 腫瘍登録対象のみ表示
    urlParams.set(
      'showOnlyTumorRegistry',
      String(currentSearchWord.showOnlyTumorRegistry)
    );
    // 診断日
    if (currentSearchWord.checkOfDiagnosisDate) {
      urlParams.set('diagnosisDate', JSON.stringify(diagnosisDate));
    }
    // イベント日
    if (currentSearchWord.checkOfEventDate) {
      urlParams.set(
        'eventDateType',
        searchDateEventDateType === '最新' ? '0' : '1'
      );
      urlParams.set('eventDate', JSON.stringify(eventDate));
    }
    // 未入力項目で絞り込み
    if (currentSearchWord.checkOfBlankFields) {
      const { blankFields } = currentSearchWord;
      urlParams.set('advancedStage', String(blankFields.advancedStage));
      urlParams.set(
        'pathlogicalDiagnosis',
        String(blankFields.pathlogicalDiagnosis)
      );
      urlParams.set('initialTreatment', String(blankFields.initialTreatment));
      urlParams.set('complications', String(blankFields.complications));
      urlParams.set(
        'threeYearPrognosis',
        String(blankFields.threeYearPrognosis)
      );
      urlParams.set('fiveYearPrognosis', String(blankFields.fiveYearPrognosis));
    }
    return urlParams;
  };

  /**
   * 一覧の取得に使った条件を記録する
   * （戻ったとき・再読み込みしたときに同じ条件で一覧を取り直すため、および「絞り込み中」の表示のため）
   * @param isDetailMode 腫瘍登録管理表示の場合は true
   * @param query 一覧の取得に使った検索条件（ページ・並び順を除く）
   * @param presetFilterCount 一覧の取得に使ったプリセット項目の絞り込みの数
   */
  const recordAppliedViewState = (
    isDetailMode: boolean,
    query: string,
    presetFilterCount: number
  ) => {
    const usePreset = !!(selectedPresetId && selectedPresetDetail);
    setAppliedViewState({
      version: PATIENT_LIST_VIEW_STATE_VERSION,
      isDetail: isDetailMode,
      usePreset,
      presetId: usePreset ? selectedPresetId : null,
      normalSearchWord,
      tumorRegistrySearchWord,
      initialTreatmentDate: searchDateInfoInitialTreatment ?? null,
      diagnosisDate: searchDateInfoDiagnosis ?? null,
      eventDate: searchDateInfoEventDate ?? null,
      eventDateType: searchDateEventDateType,
      presetFilterConditions,
      sortColumn,
      sortDirection,
      currentPage,
      pageSize,
      query,
    });
    setActiveFilterLabels(getActiveFilterLabels(query, presetFilterCount));
  };

  /**
   * 一覧の件数を設定する
   * 復元したページが取り直した結果で存在しない場合（保存で該当件数が減った等）は、存在する最後のページにする
   * @param count 件数
   */
  const applyTotalCount = (count: number) => {
    setTotalCount(count);
    if (pageCheckAfterRestoreRef.current) {
      pageCheckAfterRestoreRef.current = false;
      const page = clampPage(currentPage, count, pageSize);
      if (page !== currentPage) {
        setCurrentPage(page);
      }
    }
  };

  /**
   * その時点の画面の条件で一覧を取り直す（状態の更新が反映された後に取得する）
   */
  const requestListReload = () => {
    setListReloadRequest((prev) => prev + 1);
  };

  const reloadPatient = async () => {
    // 表示中の表示形式の検索条件でURLパラメータを構築
    const isDetailMode = search === 'table-cell';
    const urlParams = buildSearchParams(isDetailMode);
    const query = urlParams.toString();

    // ページング、ソート、表示件数のパラメータを追加
    urlParams.set('page', currentPage.toString());
    urlParams.set('pageSize', pageSize.toString());
    if (sortColumn && sortDirection) {
      urlParams.set('sortColumn', sortColumn);
      urlParams.set('sortDirection', sortDirection);
    } else {
      // ソートが無い場合はパラメータを削除
      urlParams.delete('sortColumn');
      urlParams.delete('sortDirection');
    }
    
    // プリセット項目の絞り込み条件をリクエストボディで送信
    const filterConditions: any[] = [];
    if (selectedPresetDetail && selectedPresetDetail.fields) {
      Object.entries(presetFilterConditions).forEach(([fieldId, condition]) => {
        const field = selectedPresetDetail.fields.find((f: PresetField) => f.field_id === Number(fieldId));
        if (field && isValidFilterCondition(condition, field.field_type)) {
          let filterValue: string;
          if (field.field_type === 'date') {
            // 日付の場合はSearchDateComponentと同じ形式で送信
            const dateInfo = condition.value as searchDateInfoDataSet;
            const dateStrings = generateSearchDateInfoStrings(dateInfo);
            filterValue = JSON.stringify(dateStrings);
          } else if (field.field_type === 'status') {
            // status型の場合は、選択されたステータスアイコンの配列をJSON文字列として送信
            filterValue = JSON.stringify(condition.value);
          } else if (field.field_type === 'boolean') {
            // bool型の場合は、チェックが有りの場合に"true"を送信
            filterValue = condition.value === true ? 'true' : 'false';
          } else {
            filterValue = String(condition.value);
          }
          filterConditions.push({
            field_id: Number(fieldId),
            field_name: field.field_name,
            field_path: field.field_path,
            field_type: field.field_type,
            value: filterValue,
          });
        }
      });
    }

    // 一覧の取得に使う条件を記録
    recordAppliedViewState(isDetailMode, query, filterConditions.length);

    // プリセット項目の絞り込み条件がある場合はPOSTリクエストで送信
    if (filterConditions.length > 0) {
      const requestBody = {
        page: currentPage,
        pageSize: pageSize,
        sortColumn: sortColumn || undefined,
        sortDirection: sortDirection || undefined,
        presetFilters: filterConditions,
      };

      const queryString = urlParams.toString();
      const apiUrl = queryString ? `patientlist?${queryString}` : 'patientlist';

      // 患者情報取得APIを呼ぶ（POSTリクエスト）
      const returnApiObject = await apiAccess(
        METHOD_TYPE.POST,
        apiUrl,
        requestBody
      );

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const responseBody = returnApiObject.body as { data: userData[]; totalCount?: number };
        setUserListJson(JSON.stringify(responseBody));
        // 総件数を設定
        if (responseBody.totalCount !== undefined) {
          applyTotalCount(responseBody.totalCount);
        } else {
          // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
          applyTotalCount(responseBody.data?.length || 0);
        }
      } else {
        navigate('/login');
      }
    } else {
      // プリセット項目の絞り込み条件がない場合はGETリクエストで送信
      const queryString = urlParams.toString();
      const apiUrl = queryString ? `patientlist?${queryString}` : 'patientlist';
      
      // 患者情報取得APIを呼ぶ
      const returnApiObject = await apiAccess(
        METHOD_TYPE.GET,
        apiUrl
      );

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const responseBody = returnApiObject.body as { data: userData[]; totalCount?: number };
        setUserListJson(JSON.stringify(responseBody));
        // 総件数を設定
        if (responseBody.totalCount !== undefined) {
          applyTotalCount(responseBody.totalCount);
        } else {
          // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
          applyTotalCount(responseBody.data?.length || 0);
        }
      } else {
        navigate('/login');
      }
    }
  };

  // 患者情報再読み込み
  useEffect(() => {
    const f = async () => {
      setIsLoading(true);

      // 患者情報の取得を行う
      await reloadPatient();

      setIsLoading(false);
    };

    if (reload.isReload) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      f();
      setReload({ isReload: false, caller: '' });
    }
  }, [reload]);

  // 設定から初期表示件数を読み込む（初回マウント時のみ）
  useEffect(() => {
    const loadDefaultPageSize = async () => {
      try {
        // jesgo_system_settingから設定を取得
        const returnApiObject = await apiAccess(METHOD_TYPE.GET, `getSettings`);
        
        if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          const returned = returnApiObject.body as settingsFromApi;
          // default_page_sizeの数値変換（無効な値の場合はデフォルト値100を使用）
          const pageSize = Number(returned.default_page_size);
          const validPageSize = isNaN(pageSize) || ![10, 25, 50, 100].includes(pageSize) ? 100 : pageSize;
          setDefaultPageSize(validPageSize);
          // 戻ったとき・再読み込みしたときは、離れる直前の表示件数を使う
          if (!restoredViewState) setPageSize(validPageSize);
        } else {
          // APIエラー時はデフォルト値（100）を使用
          setDefaultPageSize(100);
          if (!restoredViewState) setPageSize(100);
        }
      } catch (error) {
        // エラー時はデフォルト値（100）を使用
        setDefaultPageSize(100);
        if (!restoredViewState) setPageSize(100);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadDefaultPageSize();
  }, []);

  // Settings画面から設定が更新された場合のイベントリスナー
  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ default_page_size: number }>;
      const newPageSize = customEvent.detail?.default_page_size;
      if (newPageSize && [10, 25, 50, 100].includes(newPageSize)) {
        setDefaultPageSize(newPageSize);
        setPageSize(newPageSize);
        setCurrentPage(1); // 表示件数変更時は1ページ目に戻る
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // ソート、ページング、表示件数が変更されたときに患者リストを再取得
  useEffect(() => {
    // 初回マウント時や検索条件変更時はreload.isReloadで制御されるため、ここではスキップ
    if (reload.isReload) {
      return;
    }
    
    // プリセットモードの場合、selectedPresetDetailが設定されていない場合はスキップ
    if (selectedPresetId && !selectedPresetDetail) {
      return;
    }
    
    // 通常モードの場合、userListJsonが設定されていない場合はスキップ
    if (!selectedPresetId && !userListJson) {
      return;
    }
    
    const f = async () => {
      // プリセットモードの場合
      if (selectedPresetId && selectedPresetDetail) {
        await loadPresetPatientList();
      } 
      // 通常モードの場合
      else if (userListJson) {
        setIsLoading(true);
        await reloadPatient();
        setIsLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortColumn, sortDirection, selectedPresetId, selectedPresetDetail, listReloadRequest]);

  useEffect(() => {
    // カスタムプリセットの場合、フロント側でページング
    if (presetPatientData.length === 0 || Number(selectedPresetId) === 1) setPresetPagenationPatientData(presetPatientData);
    else {
      const startIndex = (currentPage - 1) * pageSize;
      setPresetPagenationPatientData(presetPatientData.slice(startIndex, startIndex + pageSize));
    }
  }, [presetPatientData, currentPage, pageSize, sortColumn, sortDirection, selectedPresetId, selectedPresetDetail]);

  // 一覧の取得に使った条件とメニューの開閉を保持する
  // （症例画面などから戻ったとき・再読み込みしたときに、同じ条件で一覧を取り直すため）
  useEffect(() => {
    if (!appliedViewState) return;
    savePatientListViewState({ ...appliedViewState, menuView });
    dispatch({
      type: 'SET_TOP_MENU_INFO',
      topMenuInfo: {
        paramString: `?${appliedViewState.query}`,
        isDetail: appliedViewState.isDetail,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedViewState, menuView]);

  // アドレスを一覧の取得に使った条件にそろえる（ブラウザの履歴は積まない）
  // CSV作成はアドレスの条件で対象を決めるため、画面の一覧と同じ検索条件になる
  useEffect(() => {
    if (!appliedViewState) return;
    const target = `?${appliedViewState.query}`;
    if (url === target) return;
    // アドレスにも一覧にも絞り込みが無い場合（ログイン直後など）は書き換えない
    // （CSVの対象は同じ全件のため、CSVの作り直しを避ける）
    if (
      getActiveFilterLabels(url, 0).length === 0 &&
      getActiveFilterLabels(appliedViewState.query, 0).length === 0
    ) {
      return;
    }
    navigate(`/Patients${target}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedViewState]);

  useEffect(() => {
    const f = async () => {
      setIsLoading(true);
      await storeSchemaInfo(dispatch);
      // 設定情報取得APIを呼ぶ
      const returnSettingApiObject = await apiAccess(
        METHOD_TYPE.GET,
        `getSettings`
      );

      // 正常に取得できた場合施設名を設定
      if (returnSettingApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = returnSettingApiObject.body as settingsFromApi;
        setFacilityName(returned.facility_name);
      }

      // 表示形式は、保持していた表示状態から状態の初期値として復元済み
      // （isDetailModeを渡すことで、状態更新のタイミングに依存しない）
      const isDetailMode = restoredIsDetail;

      // URLパラメータからプリセットIDを取得
      const searchParam = new URLSearchParams(url);
      const presetIdParam = searchParam.get('presetId');
      
      // URLパラメータがある場合はそちらを優先、なければlocalStorageから取得
      const presetId = presetIdParam || getSavedPresetId();
      
      // プリセットIDの優先順位に従って取得を試みる
      if (restoredViewState && !restoredViewState.usePreset && !presetIdParam) {
        // 離れる直前が通常表示だった場合は通常表示のまま戻す
        setSelectedPresetId(null);
        setSelectedPresetDetail(null);
        await reloadPatient();
        setIsLoading(false);
      } else if (presetId) {
        // ① URLパラメータまたはlocalStorageから取得したプリセットIDを使用
        setSelectedPresetId(presetId);
        // プリセット選択を保存
        saveSelectedPreset(presetId);
        // プリセット詳細を取得（戻ったときはページを保つ）
        const success = await loadPresetDetail(presetId, false);
        if (!success) {
          // 取得に失敗した場合は通常モードにフォールバック
          setSelectedPresetId(null);
          setSelectedPresetDetail(null);
          await reloadPatient();
          // 患者リスト取得完了後にローディングを解除
          setIsLoading(false);
        } else {
          // プリセット詳細取得成功後、患者リストを取得
          // loadPresetDetail内でsetSelectedPresetDetailが呼ばれているため、
          // 患者リストを取得する
          // loadPresetPatientList内でsetIsLoading(false)が呼ばれるため、
          // ここでは呼ばない
          // isDetailModeを渡すことで、状態更新のタイミングに依存しない
          await loadPresetPatientList(isDetailMode);
        }
      } else {
        // ② プリセットIDがない場合は、presetId=1（システムプリセット）を試す
        const defaultPresetId = '1';
        setSelectedPresetId(defaultPresetId);
        const success = await loadPresetDetail(defaultPresetId, false);
        if (!success) {
          // システムプリセットも取得に失敗した場合は通常モードで表示
          setSelectedPresetId(null);
          setSelectedPresetDetail(null);
          await reloadPatient();
          // 患者リスト取得完了後にローディングを解除
          setIsLoading(false);
        } else {
          // デフォルトプリセットの取得に成功した場合はlocalStorageに保存
          saveSelectedPreset(defaultPresetId);
          // プリセット詳細取得成功後、患者リストを取得
          // loadPresetDetail内でsetSelectedPresetDetailが呼ばれているため、
          // 患者リストを取得する
          // loadPresetPatientList内でsetIsLoading(false)が呼ばれるため、
          // ここでは呼ばない
          // isDetailModeを渡すことで、状態更新のタイミングに依存しない
          await loadPresetPatientList(isDetailMode);
        }
      }

      // プラグイン全ロード処理
      const pluginListReturn = await LoadPluginList();
      if (
        pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION ||
        pluginListReturn.statusNum === RESULT.PLUGIN_CACHE
      ) {
        const pluginList = pluginListReturn.body as jesgoPluginColumns[];

        if (pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION) {
          dispatch({ type: 'PLUGIN_LIST', pluginList });
        }

        setJesgoPluginList(pluginList);
      } else {
        navigate('/login');
      }

      // 注意: 患者リストの取得が完了した後にローディングを解除するため、
      // ここではsetIsLoading(false)を呼ばない
      // 患者リストの取得は上記の条件分岐内で完了後にsetIsLoading(false)が呼ばれる
    };

    // 検索条件などは、保持していた表示状態から状態の初期値として復元済み
    // （アドレスの条件は使わない。前の利用者の条件をブラウザの履歴から復元しないため）

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  useEffect(() => {
    const generateCsvData = async () => {
      const newData: any[] = [];
      let headers: Array<{ label: string; key: string }> = [];
      
      // プリセット管理を使用している場合は、プリセットデータからCSVを生成
      if (selectedPresetId && selectedPresetDetail) {
        // CSV出力対象のプリセット項目を取得（is_csv_export=true、固定項目＋カスタム項目）
        const csvExportFields = (selectedPresetDetail.fields || []).filter(
          (field: PresetField) => field.is_csv_export
        ).sort((a: PresetField, b: PresetField) => a.display_order - b.display_order);
        
        // CSVヘッダーを動的に生成
        const fieldToCsvHeaderMap: { [key: string]: Array<{ label: string; key: string }> } = {
          '患者ID': [{ label: '患者ID', key: 'patientId' }],
          '患者名': [{ label: '患者氏名', key: 'patinetName' }],
          '年齢': [{ label: '年齢', key: 'age' }],
          '初回治療開始日': [{ label: '初回治療開始日', key: 'startDate' }],
          '最終更新日': [{ label: '最終更新日', key: 'lastUpdate' }],
          '診断': [
            { label: '診断(主要がん種)', key: 'diagnosisMajor' },
            { label: '診断(その他)', key: 'diagnosisMinor' },
          ],
          '進行期': [{ label: '進行期', key: 'advancedStage' }],
          'ステータス': [
            { label: '再発', key: 'recurrence' },
            { label: '化学療法', key: 'chemotherapy' },
            { label: '手術療法', key: 'operation' },
            { label: '放射線療法', key: 'radiotherapy' },
            { label: '緩和療法', key: 'supportiveCare' },
            { label: '登録', key: 'registration' },
            { label: '死亡', key: 'death' },
            { label: '3年予後', key: 'threeYearPrognosis' },
            { label: '5年予後', key: 'fiveYearPrognosis' },
          ],
        };
        
        // ヘッダーを順序通りに生成
        for (const field of csvExportFields) {
          if (field.is_fixed) {
            // 固定項目は既存のマッピングを使用
            const headerItems = fieldToCsvHeaderMap[field.field_name] || [];
            // is_csv_header_display_nameがtrueの場合はdisplay_nameを使用
            if (field.is_csv_header_display_name) {
              const updatedHeaderItems = headerItems.map(item => ({
                ...item,
                label: field.display_name || item.label
              }));
              headers.push(...updatedHeaderItems);
            } else {
              headers.push(...headerItems);
            }
          } else {
            // カスタム項目はis_csv_header_display_nameに応じてヘッダーを生成
            // keyはfield_idをベースに生成して一意性を確保（field_nameは日本語のため使えない）
            const key = `custom_${field.field_id}`;
            const headerLabel = field.is_csv_header_display_name 
              ? (field.display_name || field.field_name)
              : (field.field_name || field.display_name);
            headers.push({ label: headerLabel, key });
          }
        }
        
        // CSV出力用に全件取得（ページング・ソート・プリセット項目のフィルタ条件を無視）
        // 検索条件（初回治療開始日、がん種、腫瘍登録対象のみなど）は維持
        const urlParams = new URLSearchParams(url);
        // ページング・ソートパラメータを削除
        urlParams.delete('page');
        urlParams.delete('pageSize');
        urlParams.delete('sortColumn');
        urlParams.delete('sortDirection');
        
        // プリセット項目の絞り込み条件は無視（空配列を送信）
        // 全件取得のため、pageSizeを非常に大きな値に設定
        const requestBody = {
          page: 1,
          pageSize: 100000, // 全件取得のため大きな値を設定
          presetFilters: [], // フィルタ条件を無視
        };
        
        const queryString = urlParams.toString();
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        
        const patientsResult = await apiAccess(METHOD_TYPE.POST, apiUrl, requestBody);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseData = patientsResult.body as any;
          let patientList: PatientInfo[] = [];
          
          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            patientList = responseData.data.map((patient: any) => ({
              case_id: patient.caseId || patient.case_id,
              name: patient.patientName || patient.name,
              date_of_birth: patient.date_of_birth || '',
              his_id: patient.patientId || patient.his_id || '',
              age: patient.age || 0,
              lastUpdate: patient.lastUpdate || patient.last_updated || '',
              date_of_death: patient.date_of_death || null,
              status: patient.status || []
            }));
          }
          
          // 全患者のドキュメントを一括取得
          const caseIds = patientList.map((p) => p.case_id);
          const isCsvExport = true;
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds, selectedPresetId, isCsvExport });
          
          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            
            // case_idをキーにしたマップを作成
            const documentsMap = new Map<number, Record<string, DocumentContent[]>>();
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documentGroups: Record<string, any[]> = {};
              for (const doc of caseData.jesgo_document) {
                if (!documentGroups[doc.root_key]) documentGroups[doc.root_key] = [];
                documentGroups[doc.root_key].push(doc);
              }
              for (const rootDocumentId of Object.keys(documentGroups)) {
                if (!documentsMap.has(caseId)) documentsMap.set(caseId, {});
                documentsMap.get(caseId)![rootDocumentId] = transformDocuments(documentGroups[rootDocumentId]);
              }
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }

            // 各患者のCSVデータを生成
            for (const patient of patientList) {
              try {
                const documentGroups = documentsMap.get(patient.case_id);
                if (documentGroups) {
                  for (const rootDocumentId of Object.keys(documentGroups)) {
                    const documents = documentGroups[rootDocumentId];
                    const csvFormattedRow = formatPatientRow(patient, csvExportFields, documents, GetSchemaInfo, selectedPresetId, true);
                    // CSVデータの初期化（動的オブジェクト）
                    const patientCsv: any = {};
                  
                    // formatPatientRowの結果を使用し、convertToCsvFormatでCSV用に変換
                    for (const field of csvExportFields) {
                      const csvFieldData = convertToCsvFormat(csvFormattedRow, field, documents, GetSchemaInfo);
                      Object.assign(patientCsv, csvFieldData);
                    }
                  
                    newData.push(patientCsv);
                  }
                }
              } catch (error) {
                console.error(`患者 ${patient.case_id} のCSVデータ生成エラー:`, error);
              }
            }
          } else {
            console.error('CSV出力用のドキュメント一括取得に失敗しました:', documentsResult);
          }
        } else {
          console.error('CSV出力用の全件取得に失敗しました:', patientsResult);
        }
      } else {
        // 通常モードの場合は全件取得（ページング・ソートを無視）
        // 検索条件（初回治療開始日、がん種、腫瘍登録対象のみなど）は維持
        headers = csvHeader;
        
        const urlParams = new URLSearchParams(url);
        // ページング・ソートパラメータを削除
        urlParams.delete('page');
        urlParams.delete('pageSize');
        urlParams.delete('sortColumn');
        urlParams.delete('sortDirection');
        
        // 全件取得のため、pageSizeを非常に大きな値に設定
        urlParams.set('page', '1');
        urlParams.set('pageSize', '10000');
        
        const queryString = urlParams.toString();
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        
        const patientsResult = await apiAccess(METHOD_TYPE.GET, apiUrl);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseBody = patientsResult.body as userDataList;
          
          // eslint-disable-next-line no-plusplus
          for (let index = 0; index < responseBody.data.length; index++) {
            const userData = responseBody.data[index];
            const patientCsv: patientListCsv = {
              patientId: userData.patientId,
              patinetName: userData.patientName,
              age: userData.age.toString(),
              startDate: userData.startDate ?? '',
              lastUpdate: userData.lastUpdate,
              diagnosisMajor: userData.diagnosisMajor,
              diagnosisMinor: userData.diagnosisMinor,
              advancedStage: userData.advancedStage,
              recurrence: userData.status.includes('recurrence') ? '有' : '無',
              chemotherapy: userData.status.includes('chemo') ? '有' : '無',
              operation: userData.status.includes('surgery') ? '有' : '無',
              radiotherapy: userData.status.includes('radio') ? '有' : '無',
              supportiveCare: userData.status.includes('surveillance')
                ? '有'
                : '無',
              registration:
                // eslint-disable-next-line no-nested-ternary
                userData.registration.includes('decline')
                  ? '拒否'
                  // eslint-disable-next-line no-nested-ternary
                  : userData.registration.includes('not_completed')
                    ? '無'
                    : userData.registration.includes('completed')
                      ? userData.registrationNumber.join('・')
                      : '有',
              death: userData.status.includes('death') ? '有' : '無',
              threeYearPrognosis: `無`,
              fiveYearPrognosis: `無`,
            };
            newData.push(patientCsv);
          }
        } else {
          console.error('CSV出力用の全件取得に失敗しました（通常モード）:', patientsResult);
        }
      }
      
      setCsvData(newData);
      setCsvHeaders(headers);
    };
    
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    generateCsvData();
  }, [url, selectedPresetId, selectedPresetDetail]);

  // 現在の表示モードに応じたフィルタリング条件を取得するヘルパー関数
  const getCurrentSearchWord = () => {
    return search === 'table-cell' ? tumorRegistrySearchWord : normalSearchWord;
  };
  
  const setCurrentSearchWord = (newValue: PatientListSearchWord) => {
    // 検索メニューの条件（がん種・腫瘍登録対象のみ表示）は両表示形式で共有する
    // （初回治療開始日はもともと両表示形式で 1 つの状態）
    const shareCommonCondition = (
      other: PatientListSearchWord
    ): PatientListSearchWord =>
      other.cancerType === newValue.cancerType &&
      other.showOnlyTumorRegistry === newValue.showOnlyTumorRegistry
        ? other
        : {
            ...other,
            cancerType: newValue.cancerType,
            showOnlyTumorRegistry: newValue.showOnlyTumorRegistry,
          };
    if (search === 'table-cell') {
      setTumorRegistrySearchWord(newValue);
      setNormalSearchWord(shareCommonCondition);
    } else {
      setNormalSearchWord(newValue);
      setTumorRegistrySearchWord(shareCommonCondition);
    }
  };
  
  // 後方互換性のため、searchWordを定義（使用時はgetCurrentSearchWord()を使用）
  const searchWord = getCurrentSearchWord();

  const setShowProgressAndRecurrence = (
    check: boolean,
    searchStyle: string
  ) => {
    if (check && searchStyle === 'table-cell') {
      setProgressAndRecurrenceColumn('table-cell');
    } else {
      setProgressAndRecurrenceColumn('hidden');
    }
  };

  const changeView = (type: PatientListMenuView) => {
    setMenuView(type);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSearchCondition = (event: any) => {
    // React BootstrapのCheckboxでは、event.targetが正しく取得できない場合があるため、
    // 複数の方法で値を取得を試みる
    let name: string | undefined;
    let checked: boolean | undefined;
    let value: string | undefined;

    // 方法1: event.targetから取得
    if (event.target) {
      const target = event.target as HTMLInputElement;
      name = target.name;
      checked = target.checked;
      value = target.value;
    }

    // 方法2: event.currentTargetから取得
    if (!name && event.currentTarget) {
      const currentTarget = event.currentTarget as HTMLInputElement;
      name = currentTarget.name || name;
      checked = currentTarget.checked !== undefined ? currentTarget.checked : checked;
      value = currentTarget.value !== undefined ? currentTarget.value : value;
    }

    // 方法3: eventオブジェクトから直接取得
    if (!name && event.name) {
      name = event.name;
    }
    if (checked === undefined && event.checked !== undefined) {
      checked = event.checked;
    }
    if (!value && event.value) {
      value = event.value;
    }

    // デバッグ用（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('handleSearchCondition event:', { event, name, checked, value });
    }

    if (!name) {
      console.warn('handleSearchCondition: name属性が取得できませんでした', event);
      return;
    }

    const currentSearchWord = getCurrentSearchWord();
    let blankFields = currentSearchWord.blankFields;

    switch (name) {
      case 'cancerType':
        setCurrentSearchWord({ ...currentSearchWord, cancerType: value || 'all' });
        break;

      case 'showOnlyTumorRegistry':
        setCurrentSearchWord({
          ...currentSearchWord,
          showOnlyTumorRegistry: checked ?? false,
        });
        break;

      case 'checkOfDiagnosisDate':
        setCurrentSearchWord({
          ...currentSearchWord,
          checkOfDiagnosisDate: checked ?? false,
        });
        break;

      case 'checkOfEventDate':
        setCurrentSearchWord({
          ...currentSearchWord,
          checkOfEventDate: checked ?? false,
        });
        break;

      case 'checkOfBlankFields':
        setCurrentSearchWord({
          ...currentSearchWord,
          checkOfBlankFields: checked ?? false,
        });
        break;

      case 'advancedStage':
        blankFields = { ...blankFields, advancedStage: checked ?? false };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'pathlogicalDiagnosis':
        blankFields = {
          ...blankFields,
          pathlogicalDiagnosis: checked ?? false,
        };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'initialTreatment':
        blankFields = {
          ...blankFields,
          initialTreatment: checked ?? false,
        };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'complications':
        blankFields = { ...blankFields, complications: checked ?? false };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'threeYearPrognosis':
        blankFields = {
          ...blankFields,
          threeYearPrognosis: checked ?? false,
        };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'fiveYearPrognosis':
        blankFields = {
          ...blankFields,
          fiveYearPrognosis: checked ?? false,
        };
        setCurrentSearchWord({ ...currentSearchWord, blankFields });
        break;

      case 'showProgressAndRecurrence':
        const progressChecked = checked ?? false;
        setCurrentSearchWord({
          ...currentSearchWord,
          showProgressAndRecurrence: progressChecked,
        });
        setShowProgressAndRecurrence(progressChecked, search);
        break;
      default:
    }
  };

  const changeListColumn = (isDetail: boolean) => {
    if (isDetail) {
      setListMode(['', 'blue']);
      setNoSearch('hidden');
      setSearch('table-cell');
      setShowProgressAndRecurrence(
        tumorRegistrySearchWord.showProgressAndRecurrence,
        'table-cell'
      );
    } else {
      setListMode(['blue', '']);
      setNoSearch('table-cell');
      setSearch('hidden');
      setShowProgressAndRecurrence(
        normalSearchWord.showProgressAndRecurrence,
        'hidden'
      );
    }

    // 切り替え後の表示形式の条件（検索メニューの条件は共有、詳細表示メニューの条件は表示形式ごと）で
    // 一覧を取り直す（プリセット表示・通常表示とも。画面の条件と一覧の条件を一致させるため）
    // 戻るための記録は、一覧を取得したときに更新する
    requestListReload();
  };

  // 現在表示されている患者リストの一覧をJesgoCaseDefineとして返す
  const getPatientList = () => {
    // userListJsonが空または無効な場合は空の配列を返す
    if (!userListJson || userListJson.trim() === '') {
      console.warn('患者リストがまだ読み込まれていません');
      return [];
    }

    try {
      const decordedJson = JSON.parse(userListJson) as userDataList;
      
      // dataが存在しない、または配列でない場合は空の配列を返す
      if (!decordedJson || !decordedJson.data || !Array.isArray(decordedJson.data)) {
        console.warn('患者リストのデータ形式が不正です');
        return [];
      }

      const caseInfoList = decordedJson.data.map((item) => {
        const caseinfo: jesgoCaseDefine = {
          case_id: item.caseId.toString(),
          name: item.patientName,
          date_of_birth: '1900-01-01',
          date_of_death: '1900-01-01',
          sex: 'F',
          his_id: item.patientId,
          decline: false,
          registrant: -1,
          last_updated: '1900-01-01',
          is_new_case: false,
        };
        return caseinfo;
      });
      return caseInfoList;
    } catch (error) {
      console.error('患者リストのJSON解析エラー:', error);
      // eslint-disable-next-line no-alert
      alert('患者リストの取得に失敗しました。ページを再読み込みしてください。');
      return [];
    }
  };

  /**
   * 日付文字列 From～Toを生成
   * @param srcDateInfo
   * @returns
   */
  const generateSearchDateInfoStrings = (
    srcDateInfo: searchDateInfoDataSet | undefined
  ): (string | Error)[] => {
    const ret: (string | Error)[] = [''];
    if (srcDateInfo) {
      // 範囲指定の場合は配列2つにする
      if (srcDateInfo.isRange) {
        ret.push('');
      }

      // fromの設定
      const from = convertSearchDate(
        srcDateInfo.fromInfo,
        srcDateInfo.searchType
      );

      ret[0] = from;

      // 範囲の場合はToを指定
      if (srcDateInfo.isRange) {
        const to = convertSearchDate(
          srcDateInfo.toInfo,
          srcDateInfo.searchType
        );
        ret[1] = to;
      }
    }
    return ret;
  };

  /**
   * フィルタリング条件が有効かどうかをチェック
   * チェックボックスがONでかつ、入力値が有効な場合のみtrueを返す
   * @param condition フィルタリング条件
   * @param fieldType フィールドタイプ
   * @returns 有効な場合true
   */
  const isValidFilterCondition = (
    condition: { enabled: boolean; value: string | number | boolean | searchDateInfoDataSet | string[] | {
      advancedStage?: boolean;
      pathlogicalDiagnosis?: boolean;
      initialTreatment?: boolean;
      complications?: boolean;
      threeYearPrognosis?: boolean;
      fiveYearPrognosis?: boolean;
    } | null },
    fieldType: string
  ): boolean => {
    // チェックボックスがOFFの場合は無効
    if (!condition.enabled) {
      return false;
    }

    // 値がnullまたは空文字列の場合は無効
    if (condition.value === null || condition.value === '') {
      return false;
    }

    // 日付フィールドの場合、実際に日付が入力されているかチェック
    if (fieldType === 'date') {
      const dateInfo = condition.value as searchDateInfoDataSet;
      if (!dateInfo) {
        return false;
      }
      // 日付文字列を生成して、空でないかチェック
      const dateStrings = generateSearchDateInfoStrings(dateInfo);
      // エラーが含まれている場合は無効
      if (dateStrings.some((d) => d instanceof Error)) {
        return false;
      }
      // すべての日付文字列が空の場合は無効
      if (dateStrings.every((d) => d === '' || (typeof d === 'string' && d.trim() === ''))) {
        return false;
      }
    }

    // boolean型の場合、値がtrueの場合のみ有効（チェックが有りの場合のみ絞り込み）
    if (fieldType === 'boolean') {
      if (condition.value !== true) {
        return false;
      }
    }

    // status型の場合、配列で少なくとも1つのステータスアイコンが選択されていることを確認
    if (fieldType === 'status') {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        return false;
      }
      // 配列の各要素が文字列であることを確認
      if (!condition.value.every((item: any) => typeof item === 'string')) {
        return false;
      }
    }

    return true;
  };

  // 日付検索条件のエラーチェック
  const hasSearchDateError = (
    title: string,
    srcDateInfo: (string | Error)[]
  ) => {
    if (srcDateInfo.some((p) => p instanceof Error)) {
      // エラーあり
      let message = '';
      srcDateInfo.forEach((err, i) => {
        if (!(err instanceof Error)) {
          return;
        }
        let prefix = '';
        // 範囲指定の場合は開始日か終了日がわかるようにprefix付ける
        if (srcDateInfo.length > 1) {
          prefix = i === 0 ? '開始日：' : '終了日：';
        }
        if (message) message += '\n';
        message += `・${prefix}${err.message}`;
      });
      // eslint-disable-next-line no-alert
      alert(
        `検索条件[${title}]の入力内容に誤りがあります。\n以下のエラーを解消後、再度検索してください\n[エラー]\n${message}`
      );
      return true;
    }
    // エラーなし
    return false;
  };

  // 「検索」「表示更新」
  const submit = () => {
    const token = localStorage.getItem('token');
    if (token == null) {
      navigate('/login');
      return;
    }

    // 表示中の表示形式の条件で検索する
    // （腫瘍登録管理表示では腫瘍登録管理表示の条件を使う。画面の条件と一覧の条件を一致させるため）
    const isDetailMode = search === 'table-cell';
    const currentSearchWord = getCurrentSearchWord();

    // 入力チェック
    // 初回治療開始日
    const initialTreatment = generateSearchDateInfoStrings(
      searchDateInfoInitialTreatment
    );
    if (hasSearchDateError('初回治療開始日', initialTreatment)) {
      return;
    }

    // 診断日（腫瘍登録管理表示）
    if (isDetailMode && currentSearchWord.checkOfDiagnosisDate) {
      const diagnosisDate = generateSearchDateInfoStrings(
        searchDateInfoDiagnosis
      );
      if (hasSearchDateError('診断日', diagnosisDate)) {
        return;
      }
    }

    // イベント日（腫瘍登録管理表示）
    if (isDetailMode && currentSearchWord.checkOfEventDate) {
      const eventDate = generateSearchDateInfoStrings(searchDateInfoEventDate);
      if (hasSearchDateError('イベント日', eventDate)) {
        return;
      }
    }

    // ページを1にリセット
    setCurrentPage(1);

    if (!selectedPresetDetail) {
      // 通常表示の場合は、従来どおり検索ごとにブラウザの履歴を積む
      navigate(`/Patients?${buildSearchParams(isDetailMode).toString()}`);
    }

    // 状態の更新（ページ）が反映された後に、画面の条件で一覧を取り直す
    // （アドレスと戻るための記録は、一覧を取得したときに更新する）
    requestListReload();
  };

  /**
   * 表示の初期化
   * 検索・詳細表示の条件、プリセット項目の絞り込み、並び順、ページ、表示件数、メニューの開閉を
   * 初期表示と同じにして一覧を取り直す。表示形式とプリセットの選択は変えない
   */
  const resetListView = () => {
    setNormalSearchWord(initialSearchWord);
    setTumorRegistrySearchWord(initialSearchWord);
    setSearchDateInfoInitialTreatment(undefined);
    setSearchDateInfoDiagnosis(undefined);
    setSearchDateInfoEventDate(undefined);
    setSearchDateEventDateType('最新');
    setPresetFilterConditions({});
    setSortColumn(null);
    setSortDirection(null);
    setCurrentPage(1);
    setPageSize(defaultPageSize);
    setShowProgressAndRecurrence(false, search);
    changeView('close');
    pageCheckAfterRestoreRef.current = false;
    requestListReload();
  };

  // イベント日種別選択時のイベント
  const onChangeEventDateType = (e: React.FormEvent<Radio>) => {
    const selectedValue = (e.target as HTMLInputElement).value;
    setSearchDateEventDateType(selectedValue);
  };

  // 検索条件のリセット
  const ResetSearchCondition = () => {
    setCurrentSearchWord({ ...initialSearchWord });
    setSearchDateInfoInitialTreatment(undefined);
    setSearchDateInfoDiagnosis(undefined);
    setSearchDateInfoEventDate(undefined);
    setSearchDateEventDateType('最新');
    // プリセット項目の絞り込み条件もリセット
    setPresetFilterConditions({});
  };

  // 新規作成
  const clickRegistration = () => {
    // 遷移前にstoreを初期化
    dispatch({ type: 'INIT_STORE' });
    navigate(`/registration`);
  };

  // プリセット表示時の編集ボタン処理
  const handlePresetEdit = (caseId: number) => {
    dispatch({ type: 'INIT_STORE' });
    navigate(`/registration?id=${caseId}`);
  };

  // プリセット表示時の削除ボタン処理
  const handlePresetDelete = async (caseId: number, hisId: string, name: string) => {
    // eslint-disable-next-line
    const result = confirm(`患者番号:${hisId} 氏名:${name} の患者を削除しても良いですか？`);
    if (result) {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      if (token == null) {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n処理に失敗しました。');
        setIsLoading(false);
        return;
      }

      // 削除APIを呼ぶ
      const returnApiObject = await apiAccess(METHOD_TYPE.DELETE, `deleteCase/${caseId}`);

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        // eslint-disable-next-line no-alert
        alert('削除しました。');
        
        // リストから削除
        const updatedData = presetPatientData.filter(p => p.case_id !== caseId);
        setPresetPatientData(updatedData);
      } else {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n処理に失敗しました。');
      }

      setIsLoading(false);
    }
  };

  const handleGotoPresetManager = () => {
    // プラグイン登録と同様の権限チェック
    const auth = localStorage.getItem('is_plugin_registerable');
    if (auth !== 'true') {
      // eslint-disable-next-line no-alert
      alert('権限がありません');
      return;
    }
    navigate('/PatientListPresetManager');
  };

  // プリセット表示と通常表示の切り替え
  const handleTogglePresetMode = async () => {
    if (selectedPresetId) {
      // プリセット表示モードから通常表示モードに切り替え
      setSelectedPresetId(null);
      setSelectedPresetDetail(null);
      setPresetPatientData([]);
      setPresetFilterConditions({});
      setIsLoading(true);
      await reloadPatient();
      setIsLoading(false);
    } else {
      // 通常表示モードからプリセット表示モードに切り替え
      const presetId = getSavedPresetId() || '1';
      setSelectedPresetId(presetId);
      saveSelectedPreset(presetId);
      setIsLoading(true);
      const success = await loadPresetDetail(presetId);
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 0));
        await loadPresetPatientList();
      } else {
        // プリセット取得に失敗した場合は通常モードに戻す
        setSelectedPresetId(null);
        setSelectedPresetDetail(null);
        await reloadPatient();
      }
      setIsLoading(false);
    }
  };

  // プリセット選択をlocalStorageに保存
  const saveSelectedPreset = (presetId: string) => {
    if (presetId) {
      localStorage.setItem('selected_preset_id', presetId);
    }
  };

  // 保存されたプリセットIDを取得
  const getSavedPresetId = (): string | null => {
    return localStorage.getItem('selected_preset_id');
  };

  // プリセットをクリア
  const clearPresetSelection = () => {
    localStorage.removeItem('selected_preset_id');
  };

  // プリセットモード用の患者リスト取得関数
  const loadPresetPatientList = async (isDetailMode?: boolean): Promise<void> => {
    if (!selectedPresetDetail) {
      return;
    }
    
    // 「腫瘍登録管理表示」の場合は、通常モードと同じAPIを呼び出してuserData形式で取得
    // isDetailModeが指定されている場合はそれを使用、なければsearchの状態を確認
    const isTumorRegistryMode = isDetailMode !== undefined ? isDetailMode : (search === 'table-cell');
    if (isTumorRegistryMode) {
      // 腫瘍登録管理表示用のフィルタリング条件でURLパラメータを生成
      // （プリセット項目のフィルタリング条件は使用しない）
      const urlParams = buildSearchParams(true);
      const query = urlParams.toString();
      // 一覧の取得に使う条件を記録
      recordAppliedViewState(true, query, 0);
      
      // ページング・ソートパラメータを追加
      urlParams.set('page', currentPage.toString());
      urlParams.set('pageSize', pageSize.toString());
      if (sortColumn && sortDirection) {
        urlParams.set('sortColumn', sortColumn);
        urlParams.set('sortDirection', sortDirection);
      }
      
      setIsLoading(true);
      
      try {
        // 通常表示と同じようにGETリクエストで送信（プリセット項目のフィルタリング条件は使用しない）
        const queryString = urlParams.toString();
        const returnApiObject = await apiAccess(
          METHOD_TYPE.GET,
          `patientlist?${queryString}`
        );
        
        if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseBody = returnApiObject.body as { data: userData[]; totalCount?: number };
          setUserListJson(JSON.stringify(responseBody));
          // 総件数を設定
          if (responseBody.totalCount !== undefined) {
            applyTotalCount(responseBody.totalCount);
          } else {
            // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
            applyTotalCount(responseBody.data?.length || 0);
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('プリセット患者リスト取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // 「患者リスト表示」の場合は、プリセットのフィールド定義に基づいて表示
    setIsLoading(true);
    try {
      // プリセット項目の絞り込み条件をリクエストボディで送信
      const filterConditions: any[] = [];
      Object.entries(presetFilterConditions).forEach(([fieldId, condition]) => {
        const field = selectedPresetDetail.fields.find((f: PresetField) => f.field_id === Number(fieldId));
        if (field && isValidFilterCondition(condition, field.field_type)) {
          let filterValue: string;
          if (field.field_type === 'date') {
            // 日付の場合はSearchDateComponentと同じ形式で送信
            const dateInfo = condition.value as searchDateInfoDataSet;
            const dateStrings = generateSearchDateInfoStrings(dateInfo);
            filterValue = JSON.stringify(dateStrings);
          } else if (field.field_type === 'status') {
            // status型の場合は、選択されたステータスアイコンの配列をJSON文字列として送信
            filterValue = JSON.stringify(condition.value);
          } else if (field.field_type === 'boolean') {
            // bool型の場合は、チェックが有りの場合に"true"を送信
            filterValue = condition.value === true ? 'true' : 'false';
          } else {
            filterValue = String(condition.value);
          }
          filterConditions.push({
            field_id: Number(fieldId),
            field_name: field.field_name,
            field_path: field.field_path,
            field_type: field.field_type,
            value: filterValue,
          });
        }
      });
      
      // 患者リスト表示用のフィルタリング条件でURLパラメータを生成
      const urlParams = buildSearchParams(false);
      // 一覧の取得に使う条件を記録
      recordAppliedViewState(false, urlParams.toString(), filterConditions.length);

      const isCsvExport = false;
      
      // プリセット項目の絞り込み条件がある場合はPOSTリクエストで送信
      if (filterConditions.length > 0) {
        const requestBody = {
          page: currentPage,
          pageSize: pageSize,
          sortColumn: sortColumn || undefined,
          sortDirection: sortDirection || undefined,
          presetId: selectedPresetId || undefined,
          presetFilters: filterConditions,
        };
        
        const queryString = urlParams.toString();
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        const patientsResult = await apiAccess(METHOD_TYPE.POST, apiUrl, requestBody);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseData = patientsResult.body as any;
          let patientList: PatientInfo[] = [];
          
          // 総件数を設定（標準プリセットの場合のみ、カスタムプリセットの場合は後でformattedData.lengthを使用）
          if (Number(selectedPresetId) === 1) {
            // 標準プリセット（presetId=1）の場合、バックエンドから返されたtotalCountを使用
            if (responseData.totalCount !== undefined) {
              applyTotalCount(responseData.totalCount);
            } else {
              // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
              applyTotalCount(responseData.data?.length || 0);
            }
          }
          
          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            patientList = responseData.data.map((patient: any) => ({
              case_id: patient.caseId || patient.case_id,
              name: patient.patientName || patient.name,
              date_of_birth: patient.date_of_birth || '',
              his_id: patient.patientId || patient.his_id || '',
              age: patient.age || 0,
              lastUpdate: patient.lastUpdate || patient.last_updated || '',
              date_of_death: patient.date_of_death || null,
              status: patient.status || []
            }));
          }

          let filteredDocuments: number[][] = [];
          if (responseData && responseData.filteredDocuments && Array.isArray(responseData.filteredDocuments)) filteredDocuments = responseData.filteredDocuments;
          
          // 全患者のドキュメントを一括取得
          const caseIds = patientList.map((p) => p.case_id);
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds, selectedPresetId, filteredDocuments, isCsvExport });
          
          // ドキュメント取得に失敗した場合でも、空のドキュメント配列で表示を試みる
          const documentsMap = new Map<number, Record<string, DocumentContent[]>>();

          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documentGroups: Record<string, any[]> = {};
              const documents = Array.isArray(caseData.jesgo_document) ? caseData.jesgo_document : [];
              if (documents.length == 0) { documentGroups['0'] = []; }
              else {
                for (const document of documents) {
                  if (!documentGroups[document.root_key]) documentGroups[document.root_key] = [];
                  documentGroups[document.root_key].push(document);
                }
              }
              for (const rootDocumentId of Object.keys(documentGroups)) {
                if (!documentsMap.has(caseId)) documentsMap.set(caseId, {});
                documentsMap.get(caseId)![rootDocumentId] = transformDocuments(documentGroups[rootDocumentId]);
              }
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }
          } else {
            console.error('loadPresetPatientList: ドキュメント取得失敗', { statusNum: documentsResult.statusNum, body: documentsResult.body });
            // ドキュメント取得に失敗した場合でも、患者リストだけでも表示できるように空のマップを使用
          }
          
          // 表示用データを作成（ドキュメント取得に失敗した場合でも、空のドキュメント配列で表示）
          let formattedData = patientList.flatMap((patient) => {
            const documentGroups = documentsMap.get(patient.case_id);
            const rows = [];
            if (documentGroups) {
              for (const rootDocumentId of Object.keys(documentGroups)) {
                const documents = documentGroups[rootDocumentId];
                const row = formatPatientRow(patient, selectedPresetDetail.fields || [], documents, GetSchemaInfo, selectedPresetId);
                if (row) rows.push(row);
              }
            }
            return rows;
          });
          
          // カスタム項目のソート処理（フロントエンドで実装）
          if (sortColumn && sortDirection && sortColumn.startsWith('custom_')) {
            const fieldIdMatch = sortColumn.match(/^custom_(\d+)$/);
            if (fieldIdMatch) {
              const fieldId = parseInt(fieldIdMatch[1], 10);
              const field = selectedPresetDetail.fields?.find((f: any) => f.field_id === fieldId);
              
              if (field) {
                const isAscending = sortDirection === 'asc';
                formattedData.sort((a, b) => {
                  const valueA = a[field.field_name] ?? '';
                  const valueB = b[field.field_name] ?? '';
                  return compareValues(valueA, valueB, isAscending);
                });
              }
            }
          }

          // カスタムプリセット（presetId > 1）の場合、表示行数（formattedData.length）をtotalCountに設定
          // 標準プリセット（presetId = 1）の場合は、バックエンドから返されたtotalCountを使用（既に設定済み）
          if (Number(selectedPresetId) !== 1) {
            applyTotalCount(formattedData.length);
          }
          setPresetPatientData(formattedData);
        } else {
          console.error('loadPresetPatientList: API呼び出し失敗', { statusNum: patientsResult.statusNum, body: patientsResult.body });
        }
      } else {
        // プリセット項目の絞り込み条件がない場合はGETリクエストで送信
        // ページング・ソートパラメータを追加
        urlParams.set('page', currentPage.toString());
        urlParams.set('pageSize', pageSize.toString());
        if (sortColumn && sortDirection) {
          urlParams.set('sortColumn', sortColumn);
          urlParams.set('sortDirection', sortDirection);
        }
        if (selectedPresetId) {
          urlParams.set('presetId', selectedPresetId);
        }
        
        const queryString = urlParams.toString();
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        const patientsResult = await apiAccess(METHOD_TYPE.GET, apiUrl);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseData = patientsResult.body as any;
          let patientList: PatientInfo[] = [];
          
          // 総件数を設定（標準プリセットの場合のみ、カスタムプリセットの場合は後でformattedData.lengthを使用）
          if (Number(selectedPresetId) === 1) {
            // 標準プリセット（presetId=1）の場合、バックエンドから返されたtotalCountを使用
            if (responseData.totalCount !== undefined) {
              applyTotalCount(responseData.totalCount);
            } else {
              // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
              applyTotalCount(responseData.data?.length || 0);
            }
          }
          
          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            patientList = responseData.data.map((patient: any) => ({
              case_id: patient.caseId || patient.case_id,
              name: patient.patientName || patient.name,
              date_of_birth: patient.date_of_birth || '',
              his_id: patient.patientId || patient.his_id || '',
              age: patient.age || 0,
              lastUpdate: patient.lastUpdate || patient.last_updated || '',
              date_of_death: patient.date_of_death || null,
              status: patient.status || []
            }));
          }
          
          // 全患者のドキュメントを一括取得
          const caseIds = patientList.map((p) => p.case_id);
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds, selectedPresetId, isCsvExport });
          
          // ドキュメント取得に失敗した場合でも、空のドキュメント配列で表示を試みる
          const documentsMap = new Map<number, Record<string, DocumentContent[]>>();
          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documentGroups: Record<string, any[]> = {};
              const documents = Array.isArray(caseData.jesgo_document) ? caseData.jesgo_document : [];
              if (documents.length == 0) { documentGroups['0'] = []; }
              else {
                for (const document of documents) {
                  if (!documentGroups[document.root_key]) documentGroups[document.root_key] = [];
                  documentGroups[document.root_key].push(document);
                }
              }
              for (const rootDocumentId of Object.keys(documentGroups)) {
                if (!documentsMap.has(caseId)) documentsMap.set(caseId, {});
                documentsMap.get(caseId)![rootDocumentId] = transformDocuments(documentGroups[rootDocumentId]);
              }
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }
          } else {
            console.error('loadPresetPatientList: ドキュメント取得失敗', { statusNum: documentsResult.statusNum, body: documentsResult.body });
            // ドキュメント取得に失敗した場合でも、患者リストだけでも表示できるように空のマップを使用
          }
          
          // 表示用データを作成（ドキュメント取得に失敗した場合でも、空のドキュメント配列で表示）
          let formattedData = patientList.flatMap((patient) => {
            const documentGroups = documentsMap.get(patient.case_id);
            const rows = [];
            if (documentGroups) {
              for (const rootDocumentId of Object.keys(documentGroups)) {
                const documents = documentGroups[rootDocumentId];
                const row = formatPatientRow(patient, selectedPresetDetail.fields || [], documents, GetSchemaInfo, selectedPresetId);
                if (row) rows.push(row);
              }
            }
            return rows;
          });
          
          // カスタム項目のソート処理（フロントエンドで実装）
          if (sortColumn && sortDirection && sortColumn.startsWith('custom_')) {
            const fieldIdMatch = sortColumn.match(/^custom_(\d+)$/);
            if (fieldIdMatch) {
              const fieldId = parseInt(fieldIdMatch[1], 10);
              const field = selectedPresetDetail.fields?.find((f: any) => f.field_id === fieldId);
              
              if (field) {
                const isAscending = sortDirection === 'asc';
                formattedData.sort((a, b) => {
                  const valueA = a[field.field_name] ?? '';
                  const valueB = b[field.field_name] ?? '';
                  return compareValues(valueA, valueB, isAscending);
                });
              }
            }
          }

          // カスタムプリセット（presetId > 1）の場合、表示行数（formattedData.length）をtotalCountに設定
          // 標準プリセット（presetId = 1）の場合は、バックエンドから返されたtotalCountを使用（既に設定済み）
          if (Number(selectedPresetId) !== 1) {
            applyTotalCount(formattedData.length);
          }
          setPresetPatientData(formattedData);
        } else {
          console.error('loadPresetPatientList: API呼び出し失敗', { statusNum: patientsResult.statusNum, body: patientsResult.body });
        }
      }
    } catch (error) {
      console.error('プリセット患者リスト取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // プリセット詳細を取得して表示（成功/失敗を返す）
  // resetPage: ページを1に戻す場合は true（画面を開いたときは、戻る前のページを保つため false）
  const loadPresetDetail = async (
    presetId: string,
    resetPage = true
  ): Promise<boolean> => {
    try {
      // プリセット詳細を取得
      const presetResult = await apiAccess(METHOD_TYPE.GET, `/preset-detail/${presetId}`);
      
      if (presetResult.statusNum === RESULT.NORMAL_TERMINATION) {
        const presetDetail = presetResult.body as any;
        setSelectedPresetDetail(presetDetail);
        
        // ページを1にリセット
        // 注意: setCurrentPage(1)を実行するとuseEffectが実行されるため、
        // 患者リストの取得はuseEffectに任せる
        // （画面を開いたときは、保持していたページを保つためリセットしない。
        //   保持していない場合は初期値が1のため同じ）
        if (resetPage) setCurrentPage(1);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('プリセット詳細取得エラー:', error);
      return false;
    }
  };

  return (
    <>
      <div className="relative">
        <Navbar collapseOnSelect fixedTop>
          <Navbar.Header>
            <Navbar.Brand>
              <img src="./image/logo.png" alt="JESGO" className="img" />
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <NavItem
                eventKey={1}
                href="#"
                className={`header-text ${listMode[0]}`}
                onClick={() => changeListColumn(false)}
              >
                患者リスト表示
              </NavItem>
              <NavItem
                eventKey={2}
                href="#"
                className={`header-text ${listMode[1]}`}
                onClick={() => changeListColumn(true)}
              >
                腫瘍登録管理表示
              </NavItem>
            </Nav>
            <Navbar.Text pullRight>Ver.{Const.VERSION}</Navbar.Text>

            <Nav pullRight>
              <Navbar.Brand>
                <div>
                  <UserMenu title={userName} i={0} isConfirm={null} />
                </div>
              </Navbar.Brand>
              <Navbar.Brand>
                <div>
                  <SystemMenu title="設定" i={0} isConfirm={null} />
                </div>
              </Navbar.Brand>
            </Nav>
            <Navbar.Text pullRight>{facilityName}&nbsp;&nbsp;</Navbar.Text>
          </Navbar.Collapse>
        </Navbar>
        <div className="page-menu">
          <div className="search-form-closed flex">
            {/* 初期表示と異なる絞り込みが一覧に効いていることを示す（絞り込まれた一覧を全件と誤認しないため） */}
            {activeFilterLabels.length > 0 && (
              <div
                className="list-filter-notice"
                title={`絞り込みに使っている条件：${activeFilterLabels.join('・')}`}
              >
                <Glyphicon glyph="filter" />
                検索条件で絞り込み中（{activeFilterLabels.join('・')}）
              </div>
            )}
            <ButtonToolbar style={{ marginTop: '14px', marginBottom: '14px' }}>
              <ButtonGroup>
                <Button title="検索" onClick={() => changeView('simpleSearch')}>
                  <Glyphicon glyph="search" />
                </Button>
                <Button
                  title="表示設定"
                  onClick={() => changeView('detailSearch')}
                >
                  <Glyphicon glyph="eye-open" />
                </Button>
                <Button
                  title="プリセット選択"
                  onClick={handleGotoPresetManager}
                  bsStyle="info"
                  disabled={!!(listMode[1] && listMode[1] !== '')}
                >
                  <Glyphicon glyph="bookmark" />
                  プリセット
                </Button>
                <Button
                  title="検索・絞り込みの条件、並び順、ページ、表示件数を初期表示に戻します（表示形式とプリセットの選択は変わりません）"
                  onClick={resetListView}
                >
                  <Glyphicon glyph="erase" />
                  表示の初期化
                </Button>
                {/*<Button
                  title={selectedPresetId ? "通常表示に切り替え" : "プリセット表示に切り替え"}
                  onClick={handleTogglePresetMode}
                  bsStyle={selectedPresetId ? "warning" : "success"}
                >
                  <Glyphicon glyph={selectedPresetId ? "list" : "th-list"} />
                  {selectedPresetId ? "通常表示" : "プリセット表示"}
                </Button>*/}
              </ButtonGroup>
            </ButtonToolbar>
            <PatientListPluginButton
              pluginList={jesgoPluginList}
              getTargetFunction={getPatientList}
              setIsLoading={setIsLoading}
              setReload={setReload}
            />
            <div className="spacer10" />
            {localStorage.getItem('is_add_roll') === 'true' && (
              <Button
                bsStyle="primary"
                className="normal-button"
                onClick={clickRegistration}
              >
                新規作成
              </Button>
            )}
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={csvFileName}
              onClick={() => {
                // eslint-disable-next-line
                if (confirm('CSVファイルをダウンロードしますか？')) {
                  setCsvFileName(
                    `jesgo_patients_list_${formatDate(new Date())}_${formatTime(
                      new Date()
                    )}`
                  );
                  return true;
                }
                return false;
              }}
            >
              <Button bsStyle="success" className="normal-button">
                CSV作成
              </Button>
            </CSVLink>
          </div>
        </div>
        <div className="search-form-outer">
          <Jumbotron className={searchFormOpen}>
            <div className="flex">
              初回治療開始日：
              <SearchDateComponent
                ctrlId="initialTreatmentDate"
                searchValue={searchDateInfoInitialTreatment}
                setSearchDateInfoDataSet={setSearchDateInfoInitialTreatment}
              />
              <div className="spacer10" />
              <div className="flex-wrap">
                がん種：
                <FormControl
                  name="cancerType"
                  onChange={handleSearchCondition}
                  componentClass="select"
                  value={searchWord.cancerType}
                >
                  <option value="all">すべて</option>
                  {makeSelectDataFromStorage('cancer_type').map(
                    (value: string, index: number) => (
                      <option value={index + 1} key={`cancer_type_${index}`}>
                        {value}
                      </option>
                    )
                  )}
                </FormControl>
              </div>
              <div className="spacer10" />
              <Checkbox
                name="showOnlyTumorRegistry"
                onChange={(e: any) => {
                  const currentSearchWord = getCurrentSearchWord();
                  const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.showOnlyTumorRegistry;
                  setCurrentSearchWord({
                    ...currentSearchWord,
                    showOnlyTumorRegistry: checked,
                  });
                }}
                inline
                checked={searchWord.showOnlyTumorRegistry}
              >
                腫瘍登録対象のみ表示
              </Checkbox>
              <div className="close-icon">
                <a href="#" onClick={() => changeView('close')}>
                  <span
                    className="glyphicon glyphicon-remove"
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>
            {/* 未入力項目で絞り込み（患者リスト表示のみ表示） */}
            {search !== 'table-cell' && (
              <div className="flex">
                <div className="flex-wrap">
                  <Checkbox
                    name="checkOfBlankFields"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.checkOfBlankFields;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        checkOfBlankFields: checked,
                      });
                    }}
                    inline
                    checked={searchWord.checkOfBlankFields}
                  >
                    未入力項目で絞り込み：
                  </Checkbox>
                  <Checkbox
                    name="advancedStage"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.advancedStage;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          advancedStage: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.advancedStage}
                  >
                    進行期
                  </Checkbox>
                  <Checkbox
                    name="pathlogicalDiagnosis"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.pathlogicalDiagnosis;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          pathlogicalDiagnosis: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.pathlogicalDiagnosis}
                  >
                    診断
                  </Checkbox>
                  <Checkbox
                    name="initialTreatment"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.initialTreatment;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          initialTreatment: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.initialTreatment}
                  >
                    初回治療
                  </Checkbox>
                  <Checkbox
                    name="complications"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.complications;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          complications: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.complications}
                  >
                    合併症
                  </Checkbox>
                  <Checkbox
                    name="threeYearPrognosis"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.threeYearPrognosis;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          threeYearPrognosis: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.threeYearPrognosis}
                  >
                    3年予後
                  </Checkbox>
                  <Checkbox
                    name="fiveYearPrognosis"
                    onChange={(e: any) => {
                      const currentSearchWord = getCurrentSearchWord();
                      const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.fiveYearPrognosis;
                      setCurrentSearchWord({
                        ...currentSearchWord,
                        blankFields: {
                          ...currentSearchWord.blankFields,
                          fiveYearPrognosis: checked,
                        },
                      });
                    }}
                    inline
                    checked={searchWord.blankFields.fiveYearPrognosis}
                  >
                    5年予後
                  </Checkbox>
                </div>
              </div>
            )}
            <div className={simpleSearchButtons}>
              <a href="#" onClick={() => changeView('detailSearch')}>
                <span
                  className="glyphicon glyphicon-eye-open"
                  aria-hidden="true"
                />
                詳細表示設定
              </a>
              <div className="spacer10" />
              <div className="spacer10" />
              <a href="#" onClick={ResetSearchCondition}>
                <span
                  className="glyphicon glyphicon-refresh"
                  aria-hidden="true"
                />
                条件リセット
              </a>
              <div className="spacer10" />
              <div className="spacer10" />
              <a href="#" onClick={() => submit()}>
                <span
                  className="glyphicon glyphicon-search"
                  aria-hidden="true"
                />
                検索
              </a>
            </div>
            <div className={detailSearchOpen}>
              <div className="detail-column">
                <span
                  className="detail-setting-icon glyphicon glyphicon-eye-open"
                  aria-hidden="true"
                />
                <span className="detail-setting-text">詳細表示設定：</span>
              </div>
              {/* 腫瘍登録管理表示の場合は通常表示のフィルタリング条件を表示 */}
              {search === 'table-cell' ? (
                <>
                  {/* 診断日 */}
                  <div className="detail-column">
                    <Checkbox
                      name="checkOfDiagnosisDate"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.checkOfDiagnosisDate;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          checkOfDiagnosisDate: checked,
                        });
                      }}
                      inline
                      checked={searchWord.checkOfDiagnosisDate}
                    >
                      <span className="detail-setting-content">診断日：</span>
                    </Checkbox>
                    <SearchDateComponent
                      ctrlId="diagnosisDate"
                      searchValue={searchDateInfoDiagnosis}
                      setSearchDateInfoDataSet={setSearchDateInfoDiagnosis}
                    />
                  </div>
                  {/* イベント日 */}
                  <div className="detail-column">
                    <Checkbox
                      name="checkOfEventDate"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.checkOfEventDate;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          checkOfEventDate: checked,
                        });
                      }}
                      inline
                      checked={searchWord.checkOfEventDate}
                    >
                      <span className="detail-setting-content">
                        イベント日【
                        <Radio
                          name="eventDateType"
                          value="最新"
                          checked={searchDateEventDateType === '最新'}
                          onChange={onChangeEventDateType}
                          inline
                        >
                          最新
                        </Radio>
                        <Radio
                          name="eventDateType"
                          value="全て"
                          checked={searchDateEventDateType === '全て'}
                          onChange={onChangeEventDateType}
                          inline
                        >
                          全て
                        </Radio>
                        】：
                      </span>
                    </Checkbox>
                    <SearchDateComponent
                      ctrlId="eventDate"
                      searchValue={searchDateInfoEventDate}
                      setSearchDateInfoDataSet={setSearchDateInfoEventDate}
                    />
                  </div>
                  {/* 未入力項目で絞り込み */}
                  <div className="detail-column">
                    <Checkbox
                      name="checkOfBlankFields"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.checkOfBlankFields;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          checkOfBlankFields: checked,
                        });
                      }}
                      inline
                      checked={searchWord.checkOfBlankFields}
                    >
                      <span className="detail-setting-content">未入力項目で絞り込み：</span>
                    </Checkbox>
                    <Checkbox
                      name="advancedStage"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.advancedStage;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            advancedStage: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.advancedStage}
                    >
                      進行期
                    </Checkbox>
                    <Checkbox
                      name="pathlogicalDiagnosis"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.pathlogicalDiagnosis;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            pathlogicalDiagnosis: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.pathlogicalDiagnosis}
                    >
                      診断
                    </Checkbox>
                    <Checkbox
                      name="initialTreatment"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.initialTreatment;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            initialTreatment: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.initialTreatment}
                    >
                      初回治療
                    </Checkbox>
                    <Checkbox
                      name="complications"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.complications;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            complications: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.complications}
                    >
                      合併症
                    </Checkbox>
                    <Checkbox
                      name="threeYearPrognosis"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.threeYearPrognosis;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            threeYearPrognosis: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.threeYearPrognosis}
                    >
                      3年予後
                    </Checkbox>
                    <Checkbox
                      name="fiveYearPrognosis"
                      onChange={(e: any) => {
                        const currentSearchWord = getCurrentSearchWord();
                        const checked = e?.target?.checked ?? e?.checked ?? !currentSearchWord.blankFields.fiveYearPrognosis;
                        setCurrentSearchWord({
                          ...currentSearchWord,
                          blankFields: {
                            ...currentSearchWord.blankFields,
                            fiveYearPrognosis: checked,
                          },
                        });
                      }}
                      inline
                      checked={searchWord.blankFields.fiveYearPrognosis}
                    >
                      5年予後
                    </Checkbox>
                  </div>
                </>
              ) : (
                /* 患者リスト表示の場合はプリセット項目の絞り込み条件を表示 */
                selectedPresetDetail && selectedPresetDetail.fields && (
                <>
                  {selectedPresetDetail.fields
                    .filter((field: PresetField) => field.is_visible)
                    .sort((a: PresetField, b: PresetField) => a.display_order - b.display_order)
                    .map((field: PresetField) => {
                      const fieldId = field.field_id;
                      const condition = presetFilterConditions[fieldId] || { enabled: false, value: null };
                      
                      return (
                        <div key={`preset-filter-${fieldId}`} className="detail-column">
                          <Checkbox
                            checked={condition.enabled}
                            onChange={(e: any) => {
                              setPresetFilterConditions({
                                ...presetFilterConditions,
                                [fieldId]: {
                                  enabled: e.target.checked,
                                  value: condition.value,
                                },
                              });
                            }}
                            inline
                          >
                            <span className="detail-setting-content">
                              {field.display_name}：
                            </span>
                          </Checkbox>
                          {field.field_type === 'string' && (
                            <FormControl
                              type="text"
                              value={condition.value as string || ''}
                              onChange={(e: any) => {
                                setPresetFilterConditions({
                                  ...presetFilterConditions,
                                  [fieldId]: {
                                    enabled: condition.enabled,
                                    value: e.target.value,
                                  },
                                });
                              }}
                              style={{ width: '200px', display: 'inline-block', marginLeft: '10px' }}
                            />
                          )}
                          {field.field_type === 'number' && (
                            <FormControl
                              type="text"
                              value={condition.value != null ? String(condition.value) : ''}
                              onChange={(e: any) => {
                                const inputValue = e.target.value;
                                setPresetFilterConditions({
                                  ...presetFilterConditions,
                                  [fieldId]: {
                                    enabled: condition.enabled,
                                    value: inputValue === '' ? null : inputValue,
                                  },
                                });
                              }}
                              style={{ width: '200px', display: 'inline-block', marginLeft: '10px' }}
                            />
                          )}
                          {field.field_type === 'date' && (
                            <SearchDateComponent
                              ctrlId={`preset-filter-date-${fieldId}`}
                              searchValue={condition.value as searchDateInfoDataSet | undefined}
                              setSearchDateInfoDataSet={(value) => {
                                setPresetFilterConditions({
                                  ...presetFilterConditions,
                                  [fieldId]: {
                                    enabled: condition.enabled,
                                    value: (value || null) as searchDateInfoDataSet | null,
                                  },
                                } as any);
                              }}
                            />
                          )}
                          {field.field_type === 'status' && (
                            <>
                              {/* ステータスアイコンの定義（IconList.tsxと同じ順序） */}
                              {[
                                { key: 'surgery', caption: '手術療法' },
                                { key: 'chemo', caption: '化学療法' },
                                { key: 'radio', caption: '放射線療法' },
                                { key: 'supportivecare', caption: '緩和療法' },
                                { key: 'complications', caption: '合併症' },
                                { key: 'recurrence', caption: '再発' },
                                { key: 'death', caption: '死亡' }
                              ].map((statusIcon) => {
                                // 現在のvalueが配列の場合はそのまま使用、オブジェクトの場合は空配列、それ以外も空配列
                                const currentStatusArray = Array.isArray(condition.value) 
                                  ? condition.value 
                                  : (typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value))
                                    ? []
                                    : [];
                                const isSelected = currentStatusArray.includes(statusIcon.key);
                                
                                return (
                                  <span
                                    key={`preset-status-${fieldId}-${statusIcon.key}`}
                                    onClick={() => {
                                      const currentStatusArray = Array.isArray(condition.value) 
                                        ? condition.value 
                                        : (typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value))
                                          ? []
                                          : [];
                                      const newStatusArray = isSelected
                                        ? currentStatusArray.filter((s: string) => s !== statusIcon.key)
                                        : [...currentStatusArray, statusIcon.key];
                                      
                                      setPresetFilterConditions({
                                        ...presetFilterConditions,
                                        [fieldId]: {
                                          enabled: condition.enabled,
                                          value: newStatusArray.length > 0 ? newStatusArray : [],
                                        },
                                      });
                                    }}
                                    style={{
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.3,
                                      marginRight: '5px',
                                      display: 'inline-block',
                                      border: isSelected ? '2px solid #337ab7' : '2px solid transparent',
                                      borderRadius: '3px',
                                      padding: '2px',
                                    }}
                                    title={statusIcon.caption}
                                  >
                                    <img
                                      src={`./image/icon_${statusIcon.key}.svg`}
                                      alt={statusIcon.caption}
                                      style={{ width: '20px', height: '20px' }}
                                    />
                                  </span>
                                );
                              })}
                            </>
                          )}
                          {field.field_type === 'boolean' && (
                            <Checkbox
                              checked={condition.value === true}
                              onChange={(e: any) => {
                                if (e.target.checked) {
                                  // チェックが有りの場合は、enabled=true、value=trueを設定
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: true,
                                      value: true,
                                    },
                                  });
                                } else {
                                  // チェックが無しの場合は、presetFilterConditionsから削除（フィルタリング条件から除外）
                                  const newConditions = { ...presetFilterConditions };
                                  delete newConditions[fieldId];
                                  setPresetFilterConditions(newConditions);
                                }
                              }}
                              inline
                            >
                              有
                            </Checkbox>
                          )}
                        </div>
                      );
                    })}
                </>
                )
              )}
              <div className="detail-column flex-right">
                <Button
                  bsStyle="default"
                  className="detail-footer-button"
                  onClick={ResetSearchCondition}
                >
                  条件リセット
                </Button>
                <Button
                  bsStyle="primary"
                  className="detail-footer-button"
                  onClick={() => submit()}
                >
                  表示更新
                </Button>
              </div>
            </div>
          </Jumbotron>
        </div>

        <div className={`search-result ${tableMode}`}>
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>読み込み中...</div>
          ) : selectedPresetId && selectedPresetDetail && search !== 'table-cell' ? (
            <>
              <PresetPatientTable
                patientData={presetPagenationPatientData}
                presetFields={selectedPresetDetail.fields || []}
                currentPage={currentPage}
                pageSize={pageSize}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(column, direction) => {
                  setSortColumn(column);
                  setSortDirection(direction);
                  setCurrentPage(1); // ソート変更時は1ページ目に戻る
                }}
                onEdit={handlePresetEdit}
                onDelete={handlePresetDelete}
                search={search}
                noSearch={noSearch}
              />
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
                isFiltered={activeFilterLabels.length > 0}
                pageSizeOptions={pageSizeOptions}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1); // 表示件数変更時は1ページ目に戻る
                }}
              />
            </>
          ) : (
            <>
              <UserTables
                userListJson={userListJson}
                search={search}
                noSearch={noSearch}
                setUserListJson={setUserListJson}
                setIsLoading={setIsLoading}
                currentPage={currentPage}
                pageSize={pageSize}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(column, direction) => {
                  setSortColumn(column);
                  setSortDirection(direction);
                  setCurrentPage(1); // ソート変更時は1ページ目に戻る
                }}
              />
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
                isFiltered={activeFilterLabels.length > 0}
                pageSizeOptions={pageSizeOptions}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1); // 表示件数変更時は1ページ目に戻る
                }}
              />
            </>
          )}
        </div>
      </div>
      {isLoading && <Loading />}
    </>
  );
};
export default Patients;
