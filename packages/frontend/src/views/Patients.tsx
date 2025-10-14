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
import UserTables, { userDataList } from '../components/Patients/UserTables';
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
  const [jesgoPluginList, setJesgoPluginList] = useState<jesgoPluginColumns[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [reload, setReload] = useState<reloadState>({
    isReload: false,
    caller: '',
  });

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
    // 患者情報取得APIを呼ぶ
    const returnApiObject = await apiAccess(
      METHOD_TYPE.GET,
      `patientlist${url}`
    );

    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      setUserListJson(JSON.stringify(returnApiObject.body));
    } else {
      navigate('/login');
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

      // 患者情報の取得を行う
      await reloadPatient();

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

      setIsLoading(false);
    };

    // URLパラメータから検索条件などをUIに復元
    const topMenuInfo = store.getState().commonReducer.topMenuInfo;
    if (topMenuInfo) {
      // 患者リスト表示、腫瘍登録管理表示の選択状態を復元
      changeListColumn(topMenuInfo.isDetail);

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
    const newData: patientListCsv[] = [];
    if (userListJson !== null && userListJson !== '') {
      const decordedJson = JSON.parse(userListJson) as userDataList;

      // eslint-disable-next-line no-plusplus
      for (let index = 0; index < decordedJson.data.length; index++) {
        const userData = decordedJson.data[index];
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

      setCsvData(newData);
    }
  }, [userListJson]);

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

  const changeListColumn = (isDetail: boolean) => {
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
  };

  // 現在表示されている患者リストの一覧をJesgoCaseDefineとして返す
  const getPatientList = () => {
    const decordedJson = JSON.parse(userListJson) as userDataList;
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

    // 患者情報取得APIを呼ぶ
    const returnApiObject = await apiAccess(
      METHOD_TYPE.GET,
      `patientlist?${param}`
    );

    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      setUserListJson(JSON.stringify(returnApiObject.body));
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
  };

  // 新規作成
  const clickRegistration = () => {
    // 遷移前にstoreを初期化
    dispatch({ type: 'INIT_STORE' });
    navigate(`/registration`);
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
              headers={csvHeader}
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
              <div className="detail-column">
                <Checkbox
                  name="checkOfDiagnosisDate"
                  onChange={handleSearchCondition}
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
              <div className="detail-column">
                <Checkbox
                  name="checkOfEventDate"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.checkOfEventDate}
                >
                  <span className="detail-setting-content">イベント日 </span>
                </Checkbox>
                【
                <Radio
                  name="searchEventdateType"
                  className="searchdate-radio"
                  style={{ marginLeft: '2px' }}
                  value="最新"
                  onChange={onChangeEventDateType}
                  checked={searchDateEventDateType === '最新'}
                >
                  最新
                </Radio>
                <Radio
                  name="searchEventdateType"
                  className="searchdate-radio"
                  style={{ marginRight: '2px' }}
                  value="全て"
                  onChange={onChangeEventDateType}
                  checked={searchDateEventDateType === '全て'}
                >
                  全て
                </Radio>
                】：
                <SearchDateComponent
                  ctrlId="eventDate"
                  searchValue={searchDateInfoEventDate}
                  setSearchDateInfoDataSet={setSearchDateInfoEventDate}
                />
              </div>
              <div className="detail-column">
                <Checkbox
                  name="checkOfBlankFields"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.checkOfBlankFields}
                >
                  <span className="detail-setting-content">
                    未入力項目で絞り込み：
                  </span>
                </Checkbox>
                <Checkbox
                  name="advancedStage"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.advancedStage}
                >
                  進行期
                </Checkbox>
                <Checkbox
                  name="pathlogicalDiagnosis"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.pathlogicalDiagnosis}
                >
                  診断
                </Checkbox>
                <Checkbox
                  name="initialTreatment"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.initialTreatment}
                >
                  初回治療
                </Checkbox>
                <Checkbox
                  name="complications"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.complications}
                >
                  合併症
                </Checkbox>
                <Checkbox
                  name="threeYearPrognosis"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.threeYearPrognosis}
                >
                  3年予後
                </Checkbox>
                <Checkbox
                  name="fiveYearPrognosis"
                  onChange={handleSearchCondition}
                  inline
                  checked={searchWord.blankFields.fiveYearPrognosis}
                >
                  5年予後
                </Checkbox>
              </div>
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
          <UserTables
            userListJson={userListJson}
            search={search}
            noSearch={noSearch}
            setUserListJson={setUserListJson}
            setIsLoading={setIsLoading}
          />
        </div>
      </div>
      {isLoading && <Loading />}
    </>
  );
};
export default Patients;
