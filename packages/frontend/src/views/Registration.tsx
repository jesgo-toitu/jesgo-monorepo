/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable camelcase */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Tab,
  FormControl,
  FormGroup,
  ControlLabel,
  Row,
  Col,
  Panel,
  Checkbox,
  Glyphicon,
  Radio,
} from 'react-bootstrap';
import {
  ControlButton,
  COMP_TYPE,
} from '../components/CaseRegistration/ControlButton';
import RootSchema from '../components/CaseRegistration/RootSchema';
import SubmitButton from '../components/CaseRegistration/SubmitButton';
import {
  convertTabKey,
  GetSchemaTitle,
  IsNotUpdate,
  SetSameSchemaTitleNumbering,
  getErrorMsgObject,
  JesgoRequiredHighlight,
} from '../common/CaseRegistrationUtility';
import './Registration.css';
import {
  headerInfoAction,
  dispSchemaIdAndDocumentIdDefine,
  SaveDataObjDefine,
  jesgoDocumentObjDefine,
} from '../store/formDataReducer';
import SaveCommand, {
  hasJesgoCaseError,
  loadJesgoCaseAndDocument,
  responseResult,
} from '../common/DBUtility';
import Loading from '../components/CaseRegistration/Loading';
import apiAccess, { RESULT, METHOD_TYPE } from '../common/ApiAccess';
import {
  AddBeforeUnloadEvent,
  backToPatientsList,
  calcAge,
  RemoveBeforeUnloadEvent,
} from '../common/CommonUtility';
import store from '../store';
import { Const } from '../common/Const';
import SaveConfirmDialog from '../components/CaseRegistration/SaveConfirmDialog';
import {
  GetRootSchema,
  GetSchemaInfo,
  CustomSchemaWithoutAppend,
  getPropItemsAndNames,
} from '../components/CaseRegistration/SchemaUtility';
import { JSONSchema7 } from 'webpack/node_modules/schema-utils/declarations/ValidationError';
import {
  ShowSaveDialogState,
  RegistrationErrors,
} from '../components/CaseRegistration/Definition';
import {
  PluginOverwriteConfirm,
  OverwriteDialogPlop,
} from '../components/common/PluginOverwriteConfirm';
import ErrorRow from '../components/CaseRegistration/ErrorRow';

export type reloadState = {
  isReload: boolean;
  caller: string;
};

// 症例入力のおおもとの画面
const Registration = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { search } = useLocation();

  // 表示中のルートドキュメント
  const [dispRootSchemaIds, setDispRootSchemaIds] = useState<
    dispSchemaIdAndDocumentIdDefine[]
  >([]);
  const [dispRootSchemaIdsNotDeleted, setDispRootSchemaIdsNotDeleted] =
    useState<dispSchemaIdAndDocumentIdDefine[]>([]);

  const [loadedJesgoCase, setLoadedJesgoCase] = useState<responseResult>({
    message: '',
    resCode: undefined,
    loadedSaveData: undefined,
  });

  // 症例ID
  const [caseId, setCaseId] = useState<number>();
  // リロードフラグ
  const [reload, setReload] = useState<reloadState>({
    isReload: false,
    caller: '',
  });

  // 読み込み中フラグ
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 保存時の応答
  const [saveResponse, setSaveResponse] = useState<responseResult>({
    message: '',
  });

  // スキーマ所持中フラグ
  const [hasSchema, setHasSchema] = useState<boolean>(
    GetRootSchema().length > 0
  );

  // ヘッダの患者情報
  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [decline, setDecline] = useState<boolean>(false);

  const [isSaved, setIsSaved] = useState(false); // 保存済みフラグ

  // プラグイン用上書き確認ダイアログ
  const [overwriteDialogPlop, setOverwriteDialogPlop] = useState<
    OverwriteDialogPlop | undefined
  >();

  let age = ''; // 年齢

  // jesgo:requiredのハイライト設定
  const highlightSettingStr = localStorage.getItem('jesgo_required_highlight');
  const highlightSetting: JesgoRequiredHighlight =
    highlightSettingStr != null && highlightSettingStr !== "null" ?
      JSON.parse(highlightSettingStr) : { jsog: false, jsgoe: false, others: false } as JesgoRequiredHighlight;
  const [highlight, setHighlight] = useState<JesgoRequiredHighlight>(highlightSetting);

  // 選択中のタブeventKey
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [selectedTabKey, setSelectedTabKey] = useState<any>();
  // 選択中のタブインデックス
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);

  const [, setAddedDocumentCount] = useState<number>(-1);

  // eslint-disable-next-line prefer-const
  let [loadData, setLoadData] = useState<SaveDataObjDefine | undefined>();

  // エラーメッセージ
  const [errors, setErrors] = useState<RegistrationErrors[]>([]);
  const saveFunction = (eventKey: any) => {
    const formDatas = store.getState().formDataReducer.formDatas;
    const saveData = store.getState().formDataReducer.saveData;

    // スクロール位置保存
    dispatch({
      type: 'SCROLL_POSITION',
      scrollTop: document.scrollingElement
        ? document.scrollingElement.scrollTop
        : undefined,
    });

    // 保存処理
    SaveCommand(
      formDatas,
      saveData,
      dispatch,
      setIsLoading,
      setSaveResponse,
      false,
      setErrors
    );

    // インデックスからタブ名に変換
    const convTabKey = convertTabKey('root-tab', eventKey);

    setSelectedTabKey(convTabKey);
  };

  const [showSaveDialog, setShowSaveDialog] = useState<ShowSaveDialogState>({
    showFlg: false,
    eventKey: undefined,
  });

  // 保存確認ダイアログ はい選択
  const saveDialogOk = useCallback(
    (eventKey: any) => {
      setShowSaveDialog({ showFlg: false, eventKey });

      dispatch({ type: 'SAVE_MESSAGE_STATE', isSaveAfterTabbing: true });
      dispatch({ type: 'SHOWN_SAVE_MESSAGE', isShownSaveMessage: false });

      saveFunction(eventKey);
    },
    [showSaveDialog]
  );

  // 保存確認ダイアログ いいえ選択
  const saveDialogCancel = useCallback(
    (eventKey: any) => {
      dispatch({ type: 'SAVE_MESSAGE_STATE', isSaveAfterTabbing: false });
      dispatch({ type: 'SHOWN_SAVE_MESSAGE', isShownSaveMessage: false });

      setShowSaveDialog({ showFlg: false, eventKey });

      // インデックスからタブ名に変換
      const convTabKey = convertTabKey('root-tab', showSaveDialog.eventKey);

      setSelectedTabKey(convTabKey);
    },
    [showSaveDialog]
  );

  // 初期設定
  useEffect(() => {
    const asyncFunc = async () => {
      // スキーマ取得処理
      const returnSchemaApiObject = await apiAccess(
        METHOD_TYPE.GET,
        `getJsonSchema`
      );

      // ルートスキーマID取得処理
      if (returnSchemaApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        dispatch({
          type: 'SCHEMA',
          schemaDatas: returnSchemaApiObject.body,
        });
      }

      const returnRootSchemaIdsApiObject = await apiAccess(
        METHOD_TYPE.GET,
        `getRootSchemaIds`
      );
      if (
        returnRootSchemaIdsApiObject.statusNum === RESULT.NORMAL_TERMINATION
      ) {
        dispatch({
          type: 'ROOT',
          rootSchemas: returnRootSchemaIdsApiObject.body,
        });
      }
      setHasSchema(true);
    };

    if (!hasSchema) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      asyncFunc();
    }

    // ハイライト設定を保持
    dispatch({
      type: 'JESGO_REQUIRED_HIGHLIGHT',
      isJesgoRequiredHighlight: highlight,
    });
  });

  const LoadDataFromDB = () => {
    let paramCaseId = '';
    if (caseId) {
      paramCaseId = caseId.toString();
    } else {
      const query = new URLSearchParams(search);
      paramCaseId = query.get('id') ?? '';
    }

    if (
      paramCaseId &&
      (loadedJesgoCase.resCode === undefined || reload.isReload)
    ) {
      // DBからデータ読み込み
      loadJesgoCaseAndDocument(parseInt(paramCaseId, 10), setLoadedJesgoCase);
    } else {
      // 新規の場合は読み込み完了とする
      setIsLoading(false);
    }
  };

  // 初期設定
  useEffect(() => {
    // ブラウザの戻る・更新の防止
    AddBeforeUnloadEvent();

    // 初回のデータ読み込み
    LoadDataFromDB();
  }, []);

  useEffect(() => {
    if (reload.isReload) {
      setIsLoading(true);
      LoadDataFromDB();
    }
  }, [reload]);

  // データ読み込み後のコールバック
  useEffect(() => {
    // 初回描画時などコールバック以外で呼び出された場合は何もしない
    if (loadedJesgoCase.resCode === undefined) {
      return;
    }

    if (loadedJesgoCase.resCode === RESULT.NORMAL_TERMINATION) {
      // 読み込み成功

      loadData = loadedJesgoCase.loadedSaveData as SaveDataObjDefine;
      loadData.jesgo_case.is_new_case = false;

      setPatientId(loadData.jesgo_case.his_id);
      setPatientName(loadData.jesgo_case.name);
      setBirthday(loadData.jesgo_case.date_of_birth);
      setDecline(loadData.jesgo_case.decline);

      setIsSaved(true);
      // 読み込んだデータをstoreに反映
      dispatch({ type: 'SAVE_LOADDATA', saveData: loadData });

      // console.log(JSON.stringify(loadData));

      // 読み込んだデータからルートドキュメント追加
      const jesgoDocument = loadData.jesgo_document;
      if (jesgoDocument.length > 0) {
        // 初期化
        dispRootSchemaIds.length = 0;

        jesgoDocument
          .filter((p) => p.root_order !== -1) // root_orderが-1のものは子ドキュメントなのでそれ以外で読み込む
          .sort((first, second) => first.root_order - second.root_order)
          .forEach((doc: jesgoDocumentObjDefine) => {
            dispRootSchemaIds.push({
              documentId: doc.key,
              schemaId: doc.value.schema_id,
              deleted: doc.value.deleted,
              compId: doc.compId,
              title: GetSchemaTitle(doc.value.schema_id),
            });
          });

        // 同一スキーマのドキュメントが複数ある場合はタブ名に番号付与
        SetSameSchemaTitleNumbering(dispRootSchemaIds);

        setDispRootSchemaIds([...dispRootSchemaIds]);
        setLoadData(loadData);

        // 初回読み込みの場合は先頭のタブを選択する
        if (!selectedTabKey && dispRootSchemaIds.length > 0) {
          setSelectedTabKey(`root-tab-${dispRootSchemaIds[0].compId}`);
        } else if (
          selectedTabIndex > -1 &&
          dispRootSchemaIds.length > selectedTabIndex
        ) {
          // 手動保存後の読込時は保存前に選択していたタブを選択しておく
          setSelectedTabKey(
            `root-tab-${dispRootSchemaIds[selectedTabIndex].compId}`
          );
        }
      }

      if (reload.isReload && reload.caller === 'update_plugin') {
        // プラグインのデータ更新後のリロード時はエラー再設定
        hasJesgoCaseError(loadData, setErrors, dispatch);
      }

      setReload({ isReload: false, caller: '' });

      // 患者情報しか入力されてない場合はローディング画面解除されないのでここで解除する
      if (jesgoDocument.length === 0) {
        setIsLoading(false);
      }

      // TODO: これだと読み込み後にまた再描画かかる？
      if (caseId) {
        navigate(`/registration?id=${caseId}`, {
          state: {
            scrollX: window.scrollX,
            scrollY: document.scrollingElement
              ? document.scrollingElement.scrollTop
              : undefined,
          },
        });
      }
    } else {
      let errMsg = '【エラー】\n読み込みに失敗しました。';
      if (loadedJesgoCase.resCode === RESULT.NOT_FOUND_CASE) {
        errMsg = '【エラー】\n存在しない症例情報です。';
      }
      // eslint-disable-next-line no-alert
      alert(errMsg);
      setIsLoading(false);
      RemoveBeforeUnloadEvent();

      backToPatientsList(navigate);
    }
  }, [loadedJesgoCase]);

  // タブ選択イベント
  const onTabSelectEvent = (isTabSelected: boolean, eventKey: any) => {
    if (isTabSelected && eventKey === selectedTabKey) return;

    // スクロール位置保存
    dispatch({
      type: 'SCROLL_POSITION',
      scrollTop: document.scrollingElement
        ? document.scrollingElement.scrollTop
        : undefined,
    });

    const commonReducer = store.getState().commonReducer;

    // インデックスからタブ名に変換
    const convTabKey = convertTabKey('root-tab', eventKey);

    // 変更ない場合はそのままタブ移動。編集権限ない場合も同様
    if (IsNotUpdate() || localStorage.getItem('is_edit_roll') !== 'true') {
      setSelectedTabKey(convTabKey);
      return;
    }

    const isHiddenSaveMessage = commonReducer.isHiddenSaveMassage;
    if (!isHiddenSaveMessage) {
      // 確認ダイアログの表示
      if (!commonReducer.isShownSaveMessage) {
        dispatch({ type: 'SHOWN_SAVE_MESSAGE', isShownSaveMessage: true });
        setShowSaveDialog({ showFlg: true, eventKey });
      }
    } else if (commonReducer.isSaveAfterTabbing) {
      // 確認ダイアログを表示しない＆保存する場合は保存処理だけする
      saveFunction(eventKey);
    } else {
      // 確認ダイアログを表示しない＆保存しない場合はタブ移動だけする
      setSelectedTabKey(convTabKey);
    }
  };

  useEffect(() => {
    if (dispRootSchemaIds.length > 0) {
      dispRootSchemaIds.forEach((info: dispSchemaIdAndDocumentIdDefine) => {
        // ドキュメントIDがなければ作成する
        const schemaInfo = GetSchemaInfo(info.schemaId);
        if (!info.documentId) {
          dispatch({
            type: 'ADD_PARENT',
            schemaId: info.schemaId,
            documentId: info.documentId,
            formData: {},
            dispChildSchemaIds: dispRootSchemaIds,
            setDispChildSchemaIds: setDispRootSchemaIds,
            isRootSchema: true,
            schemaInfo,
            setAddedDocumentCount,
          });
        }

        // タイトル振り直し
        info.title = GetSchemaTitle(info.schemaId);
      });

      // 同一スキーマのドキュメントが複数ある場合はタブ名に番号付与
      SetSameSchemaTitleNumbering(dispRootSchemaIds);
    }

    const filteredIdList = dispRootSchemaIds.filter((p) => p.deleted === false);
    // 削除済みはフィルタ
    setDispRootSchemaIdsNotDeleted(filteredIdList);

    if (filteredIdList.length === 1) {
      setSelectedTabKey(`root-tab-${filteredIdList[0].compId}`);
    }
  }, [dispRootSchemaIds, loadData]);

  useEffect(() => {
    // ドキュメントの並び順更新
    dispatch({
      type: 'SORT',
      subSchemaIds: [], // ルートにはサブスキーマない
      dispChildSchemaIds: dispRootSchemaIds,
      isRootSchema: true,
    });
  }, [dispRootSchemaIds]);

  useEffect(() => {
    // 子ドキュメントのタブ名取得
    const allTabIds = dispRootSchemaIdsNotDeleted.map(
      (info) => `root-tab-${info.compId}`
    );

    if (!Number.isNaN(Number(selectedTabKey))) {
      const tabIndex = parseInt(selectedTabKey as string, 10);
      if (allTabIds.length > tabIndex) {
        const convTabKey = allTabIds[parseInt(selectedTabKey as string, 10)];
        setSelectedTabKey(convTabKey);
      }
    }

    dispatch({
      type: 'TAB_LIST',
      parentTabsId: 'root-tab',
      tabList: allTabIds,
    });

    // ドキュメントの並び替えも考慮してTabIndex更新しておく
    if (allTabIds.length > 0) {
      const idx = allTabIds.findIndex((p) => p === selectedTabKey);
      setSelectedTabIndex(idx);
    }

    // 表示用のルートスキーマ更新終わった時点でローディング解除
    if (isLoading && loadedJesgoCase.resCode !== undefined) {
      setIsLoading(false);
    }
  }, [dispRootSchemaIdsNotDeleted]);

  // ヘッダ情報更新時のイベント
  const onChangeItem = (event: any) => {
    const eventTarget: EventTarget & HTMLInputElement =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      event.target as EventTarget & HTMLInputElement;

    let value: string | boolean;
    switch (eventTarget.id) {
      case 'patientId':
        value = eventTarget.value;
        setPatientId(value);
        break;
      case 'patientName':
        value = eventTarget.value;
        setPatientName(value);
        break;
      case 'birthday':
        value = eventTarget.value;
        setBirthday(value);
        break;
      case 'decline':
        value = eventTarget.checked;
        // eslint-disable-next-line
        if (!decline && !confirm('登録拒否にしますか？')) {
          return;
        }
        setDecline(value);
        break;

      default:
        return;
    }

    // storeに保存する
    const action: headerInfoAction = {
      type: 'INPUT_HEADER',
      headerItemName: eventTarget.id,
      value,
    };
    dispatch(action);
  };

  // 年齢
  age = calcAge(birthday);

  // 保存後のコールバック
  useEffect(() => {
    // 初回描画時などコールバック以外で呼び出された場合は何もしない
    if (saveResponse.resCode === undefined) {
      return;
    }

    if (saveResponse.resCode !== RESULT.NORMAL_TERMINATION) {
      // eslint-disable-next-line no-alert
      alert(saveResponse.message);
    }

    setIsLoading(false);

    if (saveResponse.resCode === RESULT.NORMAL_TERMINATION) {
      // 再読み込みする
      if (saveResponse.caseId) {
        setIsLoading(true);
        setLoadedJesgoCase({
          message: '',
          resCode: undefined,
          loadedSaveData: undefined,
        });
        setCaseId(saveResponse.caseId);
        setReload({ isReload: true, caller: '' });
      } else {
        // 読み込み失敗
        setIsLoading(false);
        RemoveBeforeUnloadEvent();
        backToPatientsList(navigate);
      }
    } else if (saveResponse.resCode === RESULT.TOKEN_EXPIRED_ERROR) {
      // トークン期限切れはログイン画面に戻る
      RemoveBeforeUnloadEvent();
      navigate('/login');
    }
  }, [saveResponse]);

  const generalMessage: string[] = []; // getErrMsg(errors);
  const messageObj = getErrorMsgObject(errors);

  // validationのメッセージを利用して注釈メッセージ表示
  if (!isSaved) {
    generalMessage.push(
      'ドキュメントを作成する場合は患者情報を入力後、保存してから下のボタンより追加してください。'
    );
  } else if (dispRootSchemaIdsNotDeleted.length === 0) {
    generalMessage.push(
      'ドキュメントを作成する場合は下のボタンより追加してください。'
    );
  }

  // 選択されているタブをstoreに保存
  useEffect(() => {
    dispatch({
      type: 'SELECTED_TAB',
      parentTabsId: `root-tab`,
      selectedChildTabId: selectedTabKey as string,
    });

    const tabList = store.getState().formDataReducer.allTabList.get('root-tab');
    if (tabList && tabList.length > 0) {
      const idx = tabList.findIndex((p) => p === (selectedTabKey as string));
      setSelectedTabIndex(idx);
    }
  }, [selectedTabKey]);

  // スクロール位置復元
  useLayoutEffect(() => {
    const scrollTop = store.getState().commonReducer.scrollTop;
    if (scrollTop && document.scrollingElement) {
      document.scrollingElement.scrollTop = scrollTop;
    }
  }, []);

  // タブタイトル振り直し ※タイミングによってスキーマ情報が取得できない
  useEffect(() => {
    if (hasSchema) {
      const noTitles = dispRootSchemaIds.filter(
        (p) => p.title === '' || !Number.isNaN(Number(p.title))
      );
      if (noTitles.length > 0) {
        noTitles.forEach((item) => {
          item.title = GetSchemaTitle(item.schemaId);
        });

        SetSameSchemaTitleNumbering(dispRootSchemaIds);

        setDispRootSchemaIds([...dispRootSchemaIds]);
      }
    }
  }, [hasSchema]);

  /**
   * jesgo:requiredのハイライト設定変更
   * @param event 
   */
  const handleSettingHighlight = (event: any) => {
    const eventTarget: EventTarget & HTMLInputElement =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      event.target as EventTarget & HTMLInputElement;

    const value = eventTarget.checked ?? false;
    const result = {...highlight};
    switch (eventTarget.id) {
      case "jesgo_required_highlight_jsog":
        result.jsog = value;
        break;
      case "jesgo_required_highlight_jsgoe":
        result.jsgoe = value;
        break;
      default:
        result.others = value;
        break;
    }

    dispatch({
      type: 'JESGO_REQUIRED_HIGHLIGHT',
      isJesgoRequiredHighlight: result,
    });
    setHighlight(result);
  };

  return (
    <>
      {overwriteDialogPlop && (
        <PluginOverwriteConfirm
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...overwriteDialogPlop}
        />
      )}
      <div className="page-area">
        {/* 患者情報入力 */}
        <div className="patient-area">
          <Panel className="panel-style patient-area-panel">
            <Row className="patientInfo user-info-row">
              <Col className="user-info-col">
                <FormGroup controlId="patientId">
                  <ControlLabel>患者ID：</ControlLabel>
                  <FormControl
                    type="text"
                    onChange={onChangeItem}
                    value={patientId}
                    readOnly={isSaved}
                    autoComplete="off"
                  />
                </FormGroup>
              </Col>
              <Col className="user-info-col">
                <FormGroup controlId="patientName">
                  <ControlLabel>患者氏名：</ControlLabel>
                  <FormControl
                    type="text"
                    onChange={onChangeItem}
                    value={patientName}
                    autoComplete="off"
                  />
                </FormGroup>
              </Col>
              <Col className="user-info-col">
                <FormGroup controlId="birthday">
                  <ControlLabel>生年月日</ControlLabel>
                  <FormControl
                    type="date"
                    min={Const.INPUT_DATE_MIN}
                    max={Const.INPUT_DATE_MAX()}
                    onChange={onChangeItem}
                    value={birthday}
                  />
                </FormGroup>
              </Col>
              <Col className="user-info-age">
                <FormGroup>
                  <ControlLabel>年齢</ControlLabel>
                  <div>
                    <FormControl.Static className="user-info-age">
                      {age}歳
                    </FormControl.Static>
                  </div>
                </FormGroup>
              </Col>
              <Col>
                <FormGroup>
                  <ControlLabel />
                  <div className="user-info-checkbox-group">
                    <Checkbox
                      className="user-info-checkbox"
                      id="decline"
                      onChange={onChangeItem}
                      checked={decline}
                    >
                      登録拒否
                    </Checkbox>
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <FormGroup>
              <ControlLabel>必須項目ハイライト設定</ControlLabel>
              <div className="setting-checkbox-group">
                <Checkbox
                  className="no-checkbox-auto-styling"
                  id="jesgo_required_highlight_jsog"
                  onChange={handleSettingHighlight}
                  checked={highlight.jsog}
                >
                  JSOG
                </Checkbox>
                <Checkbox
                  className="no-checkbox-auto-styling"
                  id="jesgo_required_highlight_jsgoe"
                  onChange={handleSettingHighlight}
                  checked={highlight.jsgoe}
                >
                  JSGOE
                </Checkbox>
                <Checkbox
                  className="no-checkbox-auto-styling"
                  id="jesgo_required_highlight_others"
                  onChange={handleSettingHighlight}
                  checked={highlight.others}
                >
                  JSOG/JSGOE以外
                </Checkbox>
              </div>
            </FormGroup>
            <SubmitButton
              setIsLoading={setIsLoading}
              setLoadedJesgoCase={setLoadedJesgoCase}
              setCaseId={setCaseId}
              setReload={setReload}
              setErrors={setErrors}
            />
          </Panel>
        </div>
        {!isLoading && hasSchema && (
          <>
            {(generalMessage.length > 0 || messageObj.length > 0) && (
              <Panel className="error-msg-panel">
                {generalMessage.map((error: string) => (
                  <p key={error}>
                    {error.split('\n').map((item, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <br />}
                        {item}
                      </React.Fragment>
                    ))}
                  </p>
                ))}
                {messageObj.map((errItem, index) => (
                  <ErrorRow key={`error-${errItem.registErrors.documentId}-${index}`} errMsgObj={errItem} setErrors={setErrors} />
                ))}
              </Panel>
            )}
            <div className="content-area">
              <div className="input-form">
                {dispRootSchemaIdsNotDeleted.length > 0 && (
                  <Tabs
                    id="root-tabs"
                    activeKey={selectedTabKey} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
                    onSelect={(eventKey) => onTabSelectEvent(true, eventKey)}
                  >
                    {dispRootSchemaIdsNotDeleted.map(
                      (info: dispSchemaIdAndDocumentIdDefine) => {
                        const title =
                          info.title + (info.titleNum?.toString() ?? '');

                        // TODO TabSchemaにTabを置くとうまく動作しなくなる
                        return (
                          <Tab
                            key={`root-tab-${info.compId}`}
                            className="panel-style"
                            eventKey={`root-tab-${info.compId}`}
                            title={<span>{title}</span>}
                          >
                            <RootSchema
                              key={`root-${info.compId}`}
                              tabId={`root-tab-${info.compId}`}
                              parentTabsId="root-tab"
                              schemaId={info.schemaId}
                              documentId={info.documentId}
                              dispSchemaIds={[...dispRootSchemaIds]}
                              setDispSchemaIds={setDispRootSchemaIds}
                              setSelectedTabKey={setSelectedTabKey}
                              setIsLoading={setIsLoading}
                              setSaveResponse={setSaveResponse}
                              isSchemaChange={info.isSchemaChange}
                              setErrors={setErrors}
                              selectedTabKey={selectedTabKey}
                              schemaAddModFunc={onTabSelectEvent}
                              setReload={setReload}
                              setOverwriteDialogPlop={setOverwriteDialogPlop}
                            />
                          </Tab>
                        );
                      }
                    )}
                  </Tabs>
                )}
              </div>
              <ControlButton
                tabId="root-tab"
                parentTabsId=""
                Type={COMP_TYPE.ROOT}
                isChildSchema={false} // eslint-disable-line react/jsx-boolean-value
                schemaId={0}
                dispSubSchemaIds={[]}
                dispChildSchemaIds={[...dispRootSchemaIds]}
                setDispSubSchemaIds={undefined}
                setDispChildSchemaIds={setDispRootSchemaIds}
                dispatch={dispatch}
                documentId=""
                subSchemaCount={0}
                tabSelectEvents={{
                  fnAddDocument: onTabSelectEvent,
                  fnSchemaChange: undefined,
                }}
                disabled={!isSaved}
                setIsLoading={setIsLoading}
                setReload={setReload}
                setOverwriteDialogPlop={setOverwriteDialogPlop}
                setErrors={setErrors}
              />
            </div>
          </>
        )}
        {/* ローディング画面表示 */}
        {(isLoading || !hasSchema) && <Loading />}
        {/* 保存確認ダイアログ */}
        <SaveConfirmDialog
          show={showSaveDialog}
          onOk={() => saveDialogOk(showSaveDialog.eventKey)}
          onCancel={() => saveDialogCancel(showSaveDialog.eventKey)}
          title="JESGO"
          message="保存します。よろしいですか？"
        />
      </div>
    </>
  );
};

export default Registration;
