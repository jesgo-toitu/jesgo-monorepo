/* eslint-disable no-use-before-define */
// ★TODO: JSXの属性を修正する
/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/anchor-is-valid */
import lodash from 'lodash';
import React, { useEffect, useState } from 'react';
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
import axios from 'axios';
import UserTables, { userDataList, userData } from '../components/Patients/UserTables';
import PresetPatientTable from '../components/Patients/PresetPatientTable';
import Pagination from '../components/Patients/Pagination';
import './Patients.css';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import { settingsFromApi } from './Settings';
import { csvHeader, patientListCsv } from '../common/MakeCsv';
import { formatDate, formatTime } from '../common/CommonUtility';
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
import store from '../store';
import { PresetField, DocumentContent, PatientInfo, transformDocuments, formatPatientRow, convertToCsvFormat } from '../common/PresetPatientDisplay';
import { GetSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import { WebAppConfig } from '@jesgo/common';

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

const initialSearchWord = {
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

const setSearchDateUI = (
  searchValue: string | null,
  setSearchDateInfoDataSet: React.Dispatch<
    React.SetStateAction<searchDateInfoDataSet | undefined>
  >
) => {
  const dataset: searchDateInfoDataSet = {
    fromInfo: {
      year: '',
      month: '',
      day: '',
    },
    toInfo: {
      year: '',
      month: '',
      day: '',
    },
    isRange: false,
    searchType: '年次',
  };

  if (!searchValue) {
    setSearchDateInfoDataSet(dataset);
    return;
  }

  const dateArray = JSON.parse(searchValue) as string[];
  dataset.isRange = dateArray.length > 1;
  // from
  if (dateArray[0]) {
    const splitDate = dateArray[0].split('-');
    if (splitDate[0]) {
      dataset.fromInfo.year = splitDate[0];
      dataset.searchType = '年次';
    }
    if (splitDate[1]) {
      dataset.fromInfo.month = splitDate[1];
      dataset.searchType = '月次';
    }
    if (splitDate[2]) {
      dataset.fromInfo.day = splitDate[2];
      dataset.searchType = '日次';
    }
  }
  // To
  if (dateArray[1]) {
    const splitDate = dateArray[1].split('-');
    if (splitDate[0]) {
      dataset.toInfo.year = splitDate[0];
    }
    if (splitDate[1]) {
      dataset.toInfo.month = splitDate[1];
    }
    if (splitDate[2]) {
      dataset.toInfo.day = splitDate[2];
    }
  }

  setSearchDateInfoDataSet(dataset);
};

const Patients = () => {
  const navigate = useNavigate();
  const url: string = useLocation().search;
  const userName = localStorage.getItem('display_name');
  const [searchFormOpen, setSearchFormOpen] = useState('hidden');
  const [simpleSearchButtons, setSimpleSearchButtons] = useState('hidden');
  const [detailSearchOpen, setDetailSearchOpen] = useState('hidden');
  const [noSearch, setNoSearch] = useState('table-cell');
  const [search, setSearch] = useState('hidden');
  const [, setProgressAndRecurrenceColumn] = useState('hidden');
  const [listMode, setListMode] = useState(['blue', '']);
  const [userListJson, setUserListJson] = useState('');
  const [tableMode, setTableMode] = useState('normal');
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [defaultPageSize, setDefaultPageSize] = useState<number>(50);
  const pageSizeOptions = [10, 25, 50, 100];
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // ソート関連の状態
  const [sortColumn, setSortColumn] = useState<'patientId' | 'patientName' | 'age' | 'startDate' | 'lastUpdate' | 'diagnosis' | 'advancedStage' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // プリセット項目の絞り込み条件の状態管理
  // field_idをキーとして、各項目の絞り込み条件を管理
  // status型の場合、valueは各項目のチェック状態を管理するオブジェクト
  const [presetFilterConditions, setPresetFilterConditions] = useState<{
    [fieldId: number]: {
      enabled: boolean;
      value: string | number | boolean | searchDateInfoDataSet | {
        advancedStage?: boolean;
        pathlogicalDiagnosis?: boolean;
        initialTreatment?: boolean;
        complications?: boolean;
        threeYearPrognosis?: boolean;
        fiveYearPrognosis?: boolean;
      } | null;
    };
  }>({});

  // 初回治療開始日検索条件
  const [searchDateInfoInitialTreatment, setSearchDateInfoInitialTreatment] =
    useState<searchDateInfoDataSet>();
  // 診断日検索条件
  const [searchDateInfoDiagnosis, setSearchDateInfoDiagnosis] =
    useState<searchDateInfoDataSet>();
  // イベント日検索条件
  const [searchDateInfoEventDate, setSearchDateInfoEventDate] =
    useState<searchDateInfoDataSet>();
  // イベント日検索種別
  const [searchDateEventDateType, setSearchDateEventDateType] =
    useState<string>('最新');

  const dispatch = useDispatch();

  const reloadPatient = async () => {
    // URLパラメータを構築（既存の検索条件用）
    const urlParams = new URLSearchParams(url);
    
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
          setTotalCount(responseBody.totalCount);
        } else {
          // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
          setTotalCount(responseBody.data?.length || 0);
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
          setTotalCount(responseBody.totalCount);
        } else {
          // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
          setTotalCount(responseBody.data?.length || 0);
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

  // 設定ファイルから初期表示件数を読み込む（初回マウント時のみ）
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configResponse = await axios.get('./config.json');
        const configJson = configResponse.data as { webApp: WebAppConfig };
        const config = configJson.webApp || {};
        const defaultSize = config.defaultPageSize || 50;
        setDefaultPageSize(defaultSize);
        setPageSize(defaultSize);
      } catch (error) {
        // エラー時はデフォルト値（50）を使用
        setDefaultPageSize(50);
        setPageSize(50);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadConfig();
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
  }, [currentPage, pageSize, sortColumn, sortDirection, selectedPresetId, selectedPresetDetail]);

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

      // URLパラメータから検索条件などをUIに復元
      // 先に表示モードを設定してから、プリセットデータを取得する必要がある
      const topMenuInfo = store.getState().commonReducer.topMenuInfo;
      let isDetailMode = false;
      if (topMenuInfo) {
        // 患者リスト表示、腫瘍登録管理表示の選択状態を復元
        // ただし、この時点ではselectedPresetIdがまだ設定されていないため、
        // changeListColumn内のloadPresetPatientListは呼ばれない
        // 状態のみを設定する
        isDetailMode = topMenuInfo.isDetail;
        if (topMenuInfo.isDetail) {
          setListMode(['', 'blue']);
          setNoSearch('hidden');
          setSearch('table-cell');
        } else {
          setListMode(['blue', '']);
          setNoSearch('table-cell');
          setSearch('hidden');
        }
      }

      // URLパラメータからプリセットIDを取得
      const searchParam = new URLSearchParams(url);
      const presetIdParam = searchParam.get('presetId');
      
      // URLパラメータがある場合はそちらを優先、なければlocalStorageから取得
      const presetId = presetIdParam || getSavedPresetId();
      
      // プリセットIDの優先順位に従って取得を試みる
      if (presetId) {
        // ① URLパラメータまたはlocalStorageから取得したプリセットIDを使用
        setSelectedPresetId(presetId);
        // プリセット選択を保存
        saveSelectedPreset(presetId);
        // プリセット詳細を取得
        const success = await loadPresetDetail(presetId);
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
        const success = await loadPresetDetail(defaultPresetId);
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

    // URLパラメータから検索条件などをUIに復元
    const topMenuInfoForSearch = store.getState().commonReducer.topMenuInfo;
    if (topMenuInfoForSearch) {
      const searchParam = new URLSearchParams(url);

      const copySearchWord = lodash.cloneDeep(searchWord);

      // 検索条件の復元

      // 腫瘍登録対象のみ
      let paramValue = searchParam.get('showOnlyTumorRegistry');
      copySearchWord.showOnlyTumorRegistry = paramValue === 'true';

      // がん種
      paramValue = searchParam.get('cancerType');
      copySearchWord.cancerType = paramValue ?? '';

      // 初回治療開始日
      paramValue = searchParam.get('initialTreatmentDate');
      setSearchDateUI(paramValue, setSearchDateInfoInitialTreatment);
      // 診断日
      paramValue = searchParam.get('diagnosisDate');
      copySearchWord.checkOfDiagnosisDate = !!paramValue;
      setSearchDateUI(paramValue, setSearchDateInfoDiagnosis);
      // イベント日
      paramValue = searchParam.get('eventDate');
      copySearchWord.checkOfEventDate = !!paramValue;
      let eventDateType = searchParam.get('eventDateType');
      if (!eventDateType || eventDateType === '') {
        eventDateType = '最新';
      }
      setSearchDateEventDateType(eventDateType);
      setSearchDateUI(paramValue, setSearchDateInfoEventDate);

      // 未入力項目
      // 進行期
      paramValue = searchParam.get('advancedStage');
      copySearchWord.blankFields.advancedStage = paramValue === 'true';
      // 診断
      paramValue = searchParam.get('pathlogicalDiagnosis');
      copySearchWord.blankFields.pathlogicalDiagnosis = paramValue === 'true';
      // 初回治療
      paramValue = searchParam.get('initialTreatment');
      copySearchWord.blankFields.initialTreatment = paramValue === 'true';
      // 合併症
      paramValue = searchParam.get('complications');
      copySearchWord.blankFields.complications = paramValue === 'true';
      // 3年予後
      paramValue = searchParam.get('threeYearPrognosis');
      copySearchWord.blankFields.threeYearPrognosis = paramValue === 'true';
      // 5年予後
      paramValue = searchParam.get('fiveYearPrognosis');
      copySearchWord.blankFields.fiveYearPrognosis = paramValue === 'true';

      // 未入力項目で絞り込みのチェックはいずれかの項目にチェックがあればON
      copySearchWord.checkOfBlankFields = Object.entries(
        copySearchWord.blankFields
      ).some((blankItem) => blankItem[1]);

      setSearchWord(copySearchWord);
    }

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
            headers.push(...headerItems);
          } else {
            // カスタム項目はdisplay_nameを使用してヘッダーを生成
            // keyはfield_idをベースに生成して一意性を確保（field_nameは日本語のため使えない）
            const key = `custom_${field.field_id}`;
            headers.push({ label: field.display_name || field.field_name, key });
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
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds });
          
          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            
            // case_idをキーにしたマップを作成
            const documentsMap = new Map();
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documents = transformDocuments(caseData.jesgo_document || []);
              documentsMap.set(caseId, documents);
              
              // getCasesAndDocuments APIから取得したdate_of_deathをpatientオブジェクトに追加
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }
            
            // 各患者のCSVデータを生成
            for (const patient of patientList) {
              try {
                const documents = documentsMap.get(patient.case_id) || [];
                
                // CSV出力用にformatPatientRowを再実行（is_csv_export=trueの全項目を含める）
                // これにより、is_visible=falseだがis_csv_export=trueの項目も取得できる
                const csvFormattedRow = formatPatientRow(
                  patient,
                  csvExportFields, // is_csv_export=trueの項目のみ
                  documents,
                  GetSchemaInfo,
                  true // includeInvisible=trueでis_visibleをチェックしない
                );
                
                // CSVデータの初期化（動的オブジェクト）
                const patientCsv: any = {};
                
                // formatPatientRowの結果を使用し、convertToCsvFormatでCSV用に変換
                for (const field of csvExportFields) {
                  const csvFieldData = convertToCsvFormat(csvFormattedRow, field, documents, GetSchemaInfo);
                  Object.assign(patientCsv, csvFieldData);
                }
                
                newData.push(patientCsv);
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

  const [searchWord, setSearchWord] = useState(initialSearchWord);

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

  const changeView = (type: string) => {
    switch (type) {
      case 'close':
        setSearchFormOpen('hidden');
        setSimpleSearchButtons('hidden');
        setDetailSearchOpen('hidden');
        setTableMode('normal');
        break;

      case 'simpleSearch':
        setSearchFormOpen('search-form-opened block');
        setSimpleSearchButtons('block');
        setDetailSearchOpen('hidden');
        setTableMode('search_on');
        break;

      case 'detailSearch':
        setSearchFormOpen('search-form-opened block');
        setSimpleSearchButtons('hidden');
        setDetailSearchOpen('detail-form-opened block');
        setTableMode('detail_on');
        break;

      default:
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSearchCondition = (event: any) => {
    const eventTarget: EventTarget & HTMLInputElement =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      event.target as EventTarget & HTMLInputElement;

    let blankFields = searchWord.blankFields;

    switch (eventTarget.name) {
      case 'cancerType':
        setSearchWord({ ...searchWord, cancerType: eventTarget.value });
        break;

      case 'showOnlyTumorRegistry':
        setSearchWord({
          ...searchWord,
          showOnlyTumorRegistry: eventTarget.checked,
        });
        break;

      case 'checkOfDiagnosisDate':
        setSearchWord({
          ...searchWord,
          checkOfDiagnosisDate: eventTarget.checked,
        });
        break;

      case 'checkOfEventDate':
        setSearchWord({
          ...searchWord,
          checkOfEventDate: eventTarget.checked,
        });
        break;

      case 'checkOfBlankFields':
        setSearchWord({
          ...searchWord,
          checkOfBlankFields: eventTarget.checked,
        });
        break;

      case 'advancedStage':
        blankFields = { ...blankFields, advancedStage: eventTarget.checked };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'pathlogicalDiagnosis':
        blankFields = {
          ...blankFields,
          pathlogicalDiagnosis: eventTarget.checked,
        };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'initialTreatment':
        blankFields = {
          ...blankFields,
          initialTreatment: eventTarget.checked,
        };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'complications':
        blankFields = { ...blankFields, complications: eventTarget.checked };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'threeYearPrognosis':
        blankFields = {
          ...blankFields,
          threeYearPrognosis: eventTarget.checked,
        };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'fiveYearPrognosis':
        blankFields = {
          ...blankFields,
          fiveYearPrognosis: eventTarget.checked,
        };
        setSearchWord({ ...searchWord, blankFields });
        break;

      case 'showProgressAndRecurrence':
        setSearchWord({
          ...searchWord,
          showProgressAndRecurrence: eventTarget.checked,
        });
        setShowProgressAndRecurrence(eventTarget.checked, search);
        break;
      default:
    }
  };

  const changeListColumn = async (isDetail: boolean) => {
    if (isDetail) {
      setListMode(['', 'blue']);
      setNoSearch('hidden');
      setSearch('table-cell');
      setShowProgressAndRecurrence(
        searchWord.showProgressAndRecurrence,
        'table-cell'
      );
    } else {
      setListMode(['blue', '']);
      setNoSearch('table-cell');
      setSearch('hidden');
      setShowProgressAndRecurrence(
        searchWord.showProgressAndRecurrence,
        'hidden'
      );
    }

    dispatch({
      type: 'SET_TOP_MENU_INFO',
      topMenuInfo: {
        paramString: url,
        isDetail,
      },
    });
    
    // プリセット管理モードの場合もデータを再取得
    // isDetailを直接渡すことで、状態更新のタイミングに依存しない
    if (selectedPresetId && selectedPresetDetail) {
      setIsLoading(true);
      await loadPresetPatientList(isDetail);
      setIsLoading(false);
    }
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
    condition: { enabled: boolean; value: string | number | boolean | searchDateInfoDataSet | {
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

    // status型の場合、オブジェクトで少なくとも1つの項目がtrueであることを確認
    if (fieldType === 'status') {
      if (typeof condition.value !== 'object' || condition.value === null || Array.isArray(condition.value)) {
        return false;
      }
      const statusValue = condition.value as {
        advancedStage?: boolean;
        pathlogicalDiagnosis?: boolean;
        initialTreatment?: boolean;
        complications?: boolean;
        threeYearPrognosis?: boolean;
        fiveYearPrognosis?: boolean;
      };
      // 少なくとも1つの項目がtrueであることを確認
      if (!statusValue.advancedStage && !statusValue.pathlogicalDiagnosis && !statusValue.initialTreatment && 
          !statusValue.complications && !statusValue.threeYearPrognosis && !statusValue.fiveYearPrognosis) {
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

  const submit = async (type: string) => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (token == null) {
      navigate('/login');
      return;
    }

    // 入力チェック
    // 初回治療開始日
    const initialTreatment = generateSearchDateInfoStrings(
      searchDateInfoInitialTreatment
    );
    if (hasSearchDateError('初回治療開始日', initialTreatment)) {
      setIsLoading(false);
      return;
    }

    // 診断日
    const diagnosisDate = generateSearchDateInfoStrings(
      searchDateInfoDiagnosis
    );
    if (searchWord.checkOfDiagnosisDate) {
      if (hasSearchDateError('診断日', diagnosisDate)) {
        setIsLoading(false);
        return;
      }
    }

    // イベント日
    const eventDate = generateSearchDateInfoStrings(searchDateInfoEventDate);
    if (searchWord.checkOfEventDate) {
      if (hasSearchDateError('イベント日', eventDate)) {
        setIsLoading(false);
        return;
      }
    }

    const makeQueryString = () => {
      let query = `type=${type}`;
      // 初回治療開始日
      query += `&initialTreatmentDate=${encodeURIComponent(
        JSON.stringify(initialTreatment)
      )}`;
      // がん腫
      query += `&cancerType=${encodeURIComponent(searchWord.cancerType)}`;
      // 腫瘍登録対象のみ表示
      query += `&showOnlyTumorRegistry=${encodeURIComponent(
        searchWord.showOnlyTumorRegistry
      )}`;

      if (type === 'detail') {
        // 診断日
        if (searchWord.checkOfDiagnosisDate) {
          query += `&diagnosisDate=${encodeURIComponent(
            JSON.stringify(diagnosisDate)
          )}`;
        }

        // イベント日
        if (searchWord.checkOfEventDate) {
          query += `&eventDateType=${encodeURIComponent(
            searchDateEventDateType === '最新' ? '0' : '1'
          )}`;
          query += `&eventDate=${encodeURIComponent(
            JSON.stringify(eventDate)
          )}`;
        }

        // 未入力項目で絞り込み
        if (searchWord.checkOfBlankFields) {
          query += `&advancedStage=${encodeURIComponent(
            searchWord.blankFields.advancedStage
          )}`;
          query += `&pathlogicalDiagnosis=${encodeURIComponent(
            searchWord.blankFields.pathlogicalDiagnosis
          )}`;
          query += `&initialTreatment=${encodeURIComponent(
            searchWord.blankFields.initialTreatment
          )}`;
          query += `&complications=${encodeURIComponent(
            searchWord.blankFields.complications
          )}`;
          query += `&threeYearPrognosis=${encodeURIComponent(
            searchWord.blankFields.threeYearPrognosis
          )}`;
          query += `&fiveYearPrognosis=${encodeURIComponent(
            searchWord.blankFields.fiveYearPrognosis
          )}`;
        }
      }

      return query;
    };

    const param: string = makeQueryString();

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
            // status型の場合は、各項目のチェック状態を含むオブジェクトをJSON文字列として送信
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

    // プリセットモードの場合は、loadPresetPatientListを呼び出す（フィルタリング条件の有無に関わらず）
    if (selectedPresetDetail) {
      // ページを1にリセット
      setCurrentPage(1);
      // 腫瘍登録管理表示モードかどうかを判定
      const isDetailMode = listMode[1] && listMode[1] !== '';
      await loadPresetPatientList(isDetailMode);
      // URLとReduxストアを更新
      dispatch({
        type: 'SET_TOP_MENU_INFO',
        topMenuInfo: {
          paramString: `?${param}`,
          isDetail: isDetailMode,
        },
      });
      // navigateを呼び出さず、URLのみ更新
      window.history.replaceState(null, '', `/Patients?${param}`);
    } else {
      // 通常モードの場合
      // プリセット項目の絞り込み条件がある場合はPOSTリクエストで送信
      if (filterConditions.length > 0) {
        const requestBody = {
          page: currentPage,
          pageSize: pageSize,
          sortColumn: sortColumn || undefined,
          sortDirection: sortDirection || undefined,
          presetFilters: filterConditions,
        };
        
        // 患者情報取得APIを呼ぶ（POSTリクエスト）
        const returnApiObject = await apiAccess(
          METHOD_TYPE.POST,
          `patientlist?${param}`,
          requestBody
        );

        if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          setUserListJson(JSON.stringify(returnApiObject.body));
          // ページを1にリセット
          setCurrentPage(1);
          dispatch({
            type: 'SET_TOP_MENU_INFO',
            topMenuInfo: {
              paramString: `?${param}`,
              isDetail: listMode[1] && listMode[1] !== '',
            },
          });
          // navigateを呼び出さず、URLのみ更新
          window.history.replaceState(null, '', `/Patients?${param}`);
        } else {
          navigate('/login');
        }
      } else {
        // プリセット項目の絞り込み条件がない場合はGETリクエストで送信
        const returnApiObject = await apiAccess(
          METHOD_TYPE.GET,
          `patientlist?${param}`
        );

        if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          setUserListJson(JSON.stringify(returnApiObject.body));
          // ページを1にリセット
          setCurrentPage(1);
          dispatch({
            type: 'SET_TOP_MENU_INFO',
            topMenuInfo: {
              paramString: `?${param}`,
              isDetail: listMode[1] && listMode[1] !== '',
            },
          });
          navigate(`/Patients?${param}`);
        } else {
          navigate('/login');
        }
      }
    }
    setIsLoading(false);
  };

  // イベント日種別選択時のイベント
  const onChangeEventDateType = (e: React.FormEvent<Radio>) => {
    const selectedValue = (e.target as HTMLInputElement).value;
    setSearchDateEventDateType(selectedValue);
  };

  // 検索条件のリセット
  const ResetSearchCondition = () => {
    setSearchWord({ ...initialSearchWord });
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
      // 通常表示と同じ検索条件をURLパラメータとして生成
      const initialTreatment = generateSearchDateInfoStrings(
        searchDateInfoInitialTreatment
      );
      const diagnosisDate = generateSearchDateInfoStrings(
        searchDateInfoDiagnosis
      );
      const eventDate = generateSearchDateInfoStrings(searchDateInfoEventDate);
      
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
              // status型の場合は、各項目のチェック状態を含むオブジェクトをJSON文字列として送信
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
      
      // URLSearchParamsを使用してクエリパラメータを構築
      const urlParams = new URLSearchParams();
      urlParams.set('type', 'search');
      // 初回治療開始日
      urlParams.set('initialTreatmentDate', JSON.stringify(initialTreatment));
      // がん種
      urlParams.set('cancerType', searchWord.cancerType);
      // 腫瘍登録対象のみ表示
      urlParams.set('showOnlyTumorRegistry', String(searchWord.showOnlyTumorRegistry));
      
      // ページング・ソートパラメータを追加
      urlParams.set('page', currentPage.toString());
      urlParams.set('pageSize', pageSize.toString());
      if (sortColumn && sortDirection) {
        urlParams.set('sortColumn', sortColumn);
        urlParams.set('sortDirection', sortDirection);
      }
      
      setIsLoading(true);
      
      try {
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
          const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
          const returnApiObject = await apiAccess(METHOD_TYPE.POST, apiUrl, requestBody);
          
          if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
            const responseData = returnApiObject.body as any;
            setUserListJson(JSON.stringify(responseData));
            // 総件数を設定
            if (responseData.totalCount !== undefined) {
              setTotalCount(responseData.totalCount);
            } else {
              // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
              setTotalCount(responseData.data?.length || 0);
            }
          } else {
            navigate('/login');
          }
        } else {
          // プリセット項目の絞り込み条件がない場合はGETリクエストで送信
          const queryString = urlParams.toString();
          const returnApiObject = await apiAccess(
            METHOD_TYPE.GET,
            `patientlist?${queryString}`
          );
          
          if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
            setUserListJson(JSON.stringify(returnApiObject.body));
            // 総件数を設定
            const responseData = returnApiObject.body as userDataList;
            setTotalCount(responseData.data?.length || 0);
          } else {
            navigate('/login');
          }
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
      // 通常表示と同じ検索条件をURLパラメータとして生成
      const initialTreatment = generateSearchDateInfoStrings(
        searchDateInfoInitialTreatment
      );
      const diagnosisDate = generateSearchDateInfoStrings(
        searchDateInfoDiagnosis
      );
      const eventDate = generateSearchDateInfoStrings(searchDateInfoEventDate);
      
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
            // status型の場合は、各項目のチェック状態を含むオブジェクトをJSON文字列として送信
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
      
      // 通常表示と同じ検索条件をURLパラメータとして追加
      // URLSearchParams.set()は自動的にエンコードするため、encodeURIComponentは不要
      const urlParams = new URLSearchParams();
      // 初回治療開始日
      urlParams.set('initialTreatmentDate', JSON.stringify(initialTreatment));
      // がん種
      urlParams.set('cancerType', searchWord.cancerType);
      // 腫瘍登録対象のみ表示
      urlParams.set('showOnlyTumorRegistry', String(searchWord.showOnlyTumorRegistry));
      
      // 診断日
      if (searchWord.checkOfDiagnosisDate) {
        urlParams.set('diagnosisDate', JSON.stringify(diagnosisDate));
      }
      
      // イベント日
      if (searchWord.checkOfEventDate) {
        urlParams.set('eventDateType', searchDateEventDateType === '最新' ? '0' : '1');
        urlParams.set('eventDate', JSON.stringify(eventDate));
      }
      
      // 未入力項目で絞り込み
      if (searchWord.checkOfBlankFields) {
        urlParams.set('advancedStage', String(searchWord.blankFields.advancedStage));
        urlParams.set('pathlogicalDiagnosis', String(searchWord.blankFields.pathlogicalDiagnosis));
        urlParams.set('initialTreatment', String(searchWord.blankFields.initialTreatment));
        urlParams.set('complications', String(searchWord.blankFields.complications));
        urlParams.set('threeYearPrognosis', String(searchWord.blankFields.threeYearPrognosis));
        urlParams.set('fiveYearPrognosis', String(searchWord.blankFields.fiveYearPrognosis));
      }
      
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
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        const patientsResult = await apiAccess(METHOD_TYPE.POST, apiUrl, requestBody);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseData = patientsResult.body as any;
          let patientList: PatientInfo[] = [];
          
          // 総件数を設定
          if (responseData.totalCount !== undefined) {
            setTotalCount(responseData.totalCount);
          } else {
            // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
            setTotalCount(responseData.data?.length || 0);
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
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds });
          
          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            
            // case_idをキーにしたマップを作成
            const documentsMap = new Map();
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documents = transformDocuments(caseData.jesgo_document || []);
              documentsMap.set(caseId, documents);
              
              // getCasesAndDocuments APIから取得したdate_of_deathをpatientオブジェクトに追加
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }
            
            // 表示用データを作成
            const formattedData = patientList.map((patient) => {
              const documents = documentsMap.get(patient.case_id) || [];
              const row = formatPatientRow(patient, selectedPresetDetail.fields || [], documents, GetSchemaInfo);
              return row;
            }).filter(row => row !== null);
            
            setPresetPatientData(formattedData);
          } else {
            console.error('loadPresetPatientList: ドキュメント取得失敗', { statusNum: documentsResult.statusNum, body: documentsResult.body });
          }
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
        
        const queryString = urlParams.toString();
        const apiUrl = queryString ? `/patientlist?${queryString}` : '/patientlist';
        const patientsResult = await apiAccess(METHOD_TYPE.GET, apiUrl);
        
        if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
          const responseData = patientsResult.body as any;
          let patientList: PatientInfo[] = [];
          
          // 総件数を設定
          if (responseData.totalCount !== undefined) {
            setTotalCount(responseData.totalCount);
          } else {
            // totalCountが返されていない場合は、dataの長さを使用（フォールバック）
            setTotalCount(responseData.data?.length || 0);
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
          const documentsResult = await apiAccess(METHOD_TYPE.POST, '/getCasesAndDocuments', { caseIds });
          
          if (documentsResult.statusNum === RESULT.NORMAL_TERMINATION) {
            const casesData = documentsResult.body as any[];
            
            // case_idをキーにしたマップを作成
            const documentsMap = new Map();
            for (const caseData of casesData) {
              const caseId = Number(caseData.jesgo_case.case_id);
              const documents = transformDocuments(caseData.jesgo_document || []);
              documentsMap.set(caseId, documents);
              
              // getCasesAndDocuments APIから取得したdate_of_deathをpatientオブジェクトに追加
              const patient = patientList.find(p => p.case_id === caseId);
              if (patient && caseData.jesgo_case.date_of_death) {
                patient.date_of_death = caseData.jesgo_case.date_of_death;
              }
            }
            
            // 表示用データを作成
            const formattedData = patientList.map((patient) => {
              const documents = documentsMap.get(patient.case_id) || [];
              const row = formatPatientRow(patient, selectedPresetDetail.fields || [], documents, GetSchemaInfo);
              return row;
            }).filter(row => row !== null);
            
            setPresetPatientData(formattedData);
          }
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
  const loadPresetDetail = async (presetId: string): Promise<boolean> => {
    try {
      // プリセット詳細を取得
      const presetResult = await apiAccess(METHOD_TYPE.GET, `/preset-detail/${presetId}`);
      
      if (presetResult.statusNum === RESULT.NORMAL_TERMINATION) {
        const presetDetail = presetResult.body as any;
        setSelectedPresetDetail(presetDetail);
        
        // ページを1にリセット（初回表示時のみ）
        // 注意: setCurrentPage(1)を実行するとuseEffectが実行されるため、
        // 患者リストの取得はuseEffectに任せる
        setCurrentPage(1);
        
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
                >
                  <Glyphicon glyph="bookmark" />
                  プリセット
                </Button>
                <Button
                  title={selectedPresetId ? "通常表示に切り替え" : "プリセット表示に切り替え"}
                  onClick={handleTogglePresetMode}
                  bsStyle={selectedPresetId ? "warning" : "success"}
                >
                  <Glyphicon glyph={selectedPresetId ? "list" : "th-list"} />
                  {selectedPresetId ? "通常表示" : "プリセット表示"}
                </Button>
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
                onChange={handleSearchCondition}
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
              <a href="#" onClick={() => submit('search')}>
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
              {/* プリセット項目の絞り込み条件 */}
              {selectedPresetDetail && selectedPresetDetail.fields && (
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
                              <Checkbox
                                name={`preset-status-${fieldId}-advancedStage`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'advancedStage' in condition.value ? (condition.value as any).advancedStage : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'advancedStage' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        advancedStage: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                進行期
                              </Checkbox>
                              <Checkbox
                                name={`preset-status-${fieldId}-pathlogicalDiagnosis`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'pathlogicalDiagnosis' in condition.value ? (condition.value as any).pathlogicalDiagnosis : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'pathlogicalDiagnosis' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        pathlogicalDiagnosis: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                診断
                              </Checkbox>
                              <Checkbox
                                name={`preset-status-${fieldId}-initialTreatment`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'initialTreatment' in condition.value ? (condition.value as any).initialTreatment : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'initialTreatment' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        initialTreatment: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                初回治療
                              </Checkbox>
                              <Checkbox
                                name={`preset-status-${fieldId}-complications`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'complications' in condition.value ? (condition.value as any).complications : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'complications' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        complications: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                合併症
                              </Checkbox>
                              <Checkbox
                                name={`preset-status-${fieldId}-threeYearPrognosis`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'threeYearPrognosis' in condition.value ? (condition.value as any).threeYearPrognosis : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'threeYearPrognosis' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        threeYearPrognosis: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                3年予後
                              </Checkbox>
                              <Checkbox
                                name={`preset-status-${fieldId}-fiveYearPrognosis`}
                                checked={typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'fiveYearPrognosis' in condition.value ? (condition.value as any).fiveYearPrognosis : false}
                                onChange={(e: any) => {
                                  const currentValue = typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value) && 'fiveYearPrognosis' in condition.value ? condition.value as any : {};
                                  setPresetFilterConditions({
                                    ...presetFilterConditions,
                                    [fieldId]: {
                                      enabled: condition.enabled,
                                      value: {
                                        ...currentValue,
                                        fiveYearPrognosis: e.target.checked,
                                      },
                                    },
                                  });
                                }}
                                inline
                              >
                                5年予後
                              </Checkbox>
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
                  onClick={() => submit('detail')}
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
                patientData={presetPatientData}
                presetFields={selectedPresetDetail.fields || []}
                currentPage={currentPage}
                pageSize={pageSize}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(column, direction) => {
                  setSortColumn(column as 'patientId' | 'patientName' | 'age' | 'startDate' | 'lastUpdate' | 'diagnosis' | 'advancedStage' | null);
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
