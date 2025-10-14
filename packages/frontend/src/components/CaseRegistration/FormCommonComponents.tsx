/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import React, { useEffect, useState } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import {
  convertTabKey,
  IsNotUpdate,
} from '../../common/CaseRegistrationUtility';
import SaveCommand, { responseResult } from '../../common/DBUtility';
import store from '../../store';
import {
  dispSchemaIdAndDocumentIdDefine,
  SaveDataObjDefine,
} from '../../store/formDataReducer';
import { reloadState } from '../../views/Registration';
import { OverwriteDialogPlop } from '../common/PluginOverwriteConfirm';
import {
  RegistrationErrors,
  ShowSaveDialogState,
  ChildTabSelectedFuncObj,
} from './Definition';
import PanelSchema from './PanelSchema';
import SaveConfirmDialog from './SaveConfirmDialog';
import TabSchema from './TabSchema';

export const createTab = (
  parentTabsId: string,
  parentEventDate: string | null,
  schemaIds: dispSchemaIdAndDocumentIdDefine[],
  filteredSchemaIds: dispSchemaIdAndDocumentIdDefine[],
  setSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,
  isChildSchema: boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSaveResponse: React.Dispatch<React.SetStateAction<responseResult>>,
  subSchemaCount: number,
  setSelectedTabKey: React.Dispatch<React.SetStateAction<any>>,
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>,
  selectedTabKey: any,
  schemaAddModFunc: (isTabSelected: boolean, eventKey: any) => void,
  setUpdateFormData: React.Dispatch<React.SetStateAction<boolean>>,
  setReload: (value: React.SetStateAction<reloadState>) => void,
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void
) =>
  // subschema表示
  filteredSchemaIds.map((info: dispSchemaIdAndDocumentIdDefine) => {
    const title = info.title + (info.titleNum?.toString() ?? '');

    // TODO TabSchemaにTabを置くとうまく動作しなくなる
    return (
      <Tab
        key={`tab-${info.compId}-${info.schemaId}`}
        className="panel-style"
        eventKey={`${parentTabsId}-tab-${info.compId}`}
        title={<span>{title}</span>}
      >
        <TabSchema
          key={`tabitem-${info.compId}`}
          tabId={`${parentTabsId}-tab-${info.compId}`}
          parentTabsId={parentTabsId}
          parentEventDate={parentEventDate}
          isChildSchema={isChildSchema}
          schemaId={info.schemaId}
          documentId={info.documentId}
          dispSchemaIds={[...schemaIds]}
          setDispSchemaIds={setSchemaIds}
          setIsLoading={setIsLoading}
          setSaveResponse={setSaveResponse}
          setSelectedTabKey={setSelectedTabKey}
          subSchemaCount={subSchemaCount}
          isSchemaChange={info.isSchemaChange}
          isParentSchemaChange={info.isParentSchemaChange}
          setErrors={setErrors}
          selectedTabKey={selectedTabKey}
          schemaAddModFunc={schemaAddModFunc}
          setUpdateFormData={setUpdateFormData}
          setReload={setReload}
          setOverwriteDialogPlop={setOverwriteDialogPlop}
        />
      </Tab>
    );
  });

export const createTabs = (
  id: string,
  parentEventDate: string | null,
  subschemaIds: dispSchemaIdAndDocumentIdDefine[],
  subschemaIdsNotDeleted: dispSchemaIdAndDocumentIdDefine[],
  setSubschemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,

  dispChildSchemaIds: dispSchemaIdAndDocumentIdDefine[],
  dispChildSchemaIdsNotDeleted: dispSchemaIdAndDocumentIdDefine[],
  setDispChildSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSaveResponse: React.Dispatch<React.SetStateAction<responseResult>>,
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>,
  childTabSelectedFunc: ChildTabSelectedFuncObj,
  setChildTabSelectedFunc:
    | React.Dispatch<React.SetStateAction<ChildTabSelectedFuncObj>>
    | undefined,
  setUpdateFormData: React.Dispatch<React.SetStateAction<boolean>>,
  setReload: (value: React.SetStateAction<reloadState>) => void,
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void
) => {
  // 選択中のタブeventKey
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [selectedTabKey, setSelectedTabKey] = useState<any>();

  const dispatch = useDispatch();

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

    dispatch({
      type: 'SELECTED_TAB',
      parentTabsId: id,
      selectedChildTabId: eventKey as string,
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
    const convTabKey = convertTabKey(id, eventKey);

    setSelectedTabKey(convTabKey);
  };

  const [showSaveDialog, setShowSaveDialog] = useState<ShowSaveDialogState>({
    showFlg: false,
    eventKey: undefined,
  });

  // 保存確認ダイアログ はい選択
  const saveDialogOk = (eventKey: any) => {
    // const eventKey = showSaveDialog.eventKey;

    setShowSaveDialog({ showFlg: false, eventKey });

    dispatch({ type: 'SAVE_MESSAGE_STATE', isSaveAfterTabbing: true });
    dispatch({ type: 'SHOWN_SAVE_MESSAGE', isShownSaveMessage: false });

    saveFunction(eventKey);
  };

  // 保存確認ダイアログ いいえ選択
  const saveDialogCancel = (eventKey: any) => {
    dispatch({ type: 'SAVE_MESSAGE_STATE', isSaveAfterTabbing: false });
    dispatch({ type: 'SHOWN_SAVE_MESSAGE', isShownSaveMessage: false });

    setShowSaveDialog({ showFlg: false, eventKey });

    // インデックスからタブ名に変換
    const convTabKey = convertTabKey(id, eventKey);

    setSelectedTabKey(convTabKey);
  };

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

    dispatch({
      type: 'SELECTED_TAB',
      parentTabsId: id,
      selectedChildTabId: eventKey as string,
    });

    // インデックスからタブ名に変換
    const convTabKey = convertTabKey(id, eventKey);

    // 変更ない場合は保存しないでタブ移動。編集権限ない場合も同様
    if (IsNotUpdate() || localStorage.getItem('is_edit_roll') !== 'true') {
      setSelectedTabKey(convTabKey);
      return;
    }

    const commonReducer = store.getState().commonReducer;
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

  // 子タブでの保存後の選択タブ復元処理
  useEffect(() => {
    // TODO: 親IDが被っているので一意になるような命名にしなければならない

    const allTabIds: string[] = [];
    subschemaIdsNotDeleted.forEach((info) =>
      allTabIds.push(`${id}-tab-${info.compId}`)
    );
    dispChildSchemaIdsNotDeleted.forEach((info) =>
      allTabIds.push(`${id}-tab-${info.compId}`)
    );

    const tabIds = store.getState().formDataReducer.selectedTabIds;
    const tabId = tabIds.get(id);
    let targetTabId = tabId;
    if (tabId) {
      // 数値の場合はドキュメント追加時なので正しいタブ名に変換する
      if (!Number.isNaN(Number(tabId))) {
        const tabIndex = parseInt(tabId, 10);
        if (allTabIds.length > tabIndex) {
          const convTabKey = allTabIds[tabIndex];
          targetTabId = convTabKey;
        }
      } else if (allTabIds.length > 0 && !allTabIds.find((p) => p === tabId)) {
        // 保存してタブ名変わった場合は最初のドキュメント選択
        targetTabId = allTabIds[0];
      }
    } else if (allTabIds.length > 0) {
      // 初回表示時
      targetTabId = allTabIds[0];
    }

    setSelectedTabKey(targetTabId);

    // 親で子のタブ選択イベントを使いたいため、親に渡す
    if (setChildTabSelectedFunc) {
      setChildTabSelectedFunc({
        fnAddDocument: onTabSelectEvent,
        fnSchemaChange: childTabSelectedFunc.fnSchemaChange,
      });
    }

    dispatch({
      type: 'TAB_LIST',
      parentTabsId: id,
      tabList: allTabIds,
    });
  }, [subschemaIdsNotDeleted, dispChildSchemaIdsNotDeleted]);

  // 選択されているタブをstoreに保存
  useEffect(() => {
    dispatch({
      type: 'SELECTED_TAB',
      parentTabsId: id,
      selectedChildTabId: selectedTabKey as string,
    });
  }, [selectedTabKey]);

  return (
    (subschemaIds.length > 0 || dispChildSchemaIds.length > 0) && (
      <>
        <Tabs
          id={`${id}-tabs`}
          activeKey={selectedTabKey} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          onSelect={(eventKey) => onTabSelectEvent(true, eventKey)}
        >
          {/* subschema表示 */}
          {createTab(
            id,
            parentEventDate,
            subschemaIds,
            subschemaIdsNotDeleted,
            setSubschemaIds,
            false,
            setIsLoading,
            setSaveResponse,
            0,
            setSelectedTabKey,
            setErrors,
            selectedTabKey,
            onTabSelectEvent,
            setUpdateFormData,
            setReload,
            setOverwriteDialogPlop
          )}

          {/* childSchema表示 */}
          {createTab(
            id,
            parentEventDate,
            dispChildSchemaIds,
            dispChildSchemaIdsNotDeleted,
            setDispChildSchemaIds,
            true,
            setIsLoading,
            setSaveResponse,
            subschemaIdsNotDeleted.length,
            setSelectedTabKey,
            setErrors,
            selectedTabKey,
            onTabSelectEvent,
            setUpdateFormData,
            setReload,
            setOverwriteDialogPlop
          )}
        </Tabs>
        <SaveConfirmDialog
          show={showSaveDialog}
          onOk={() => saveDialogOk(showSaveDialog.eventKey)}
          onCancel={() => saveDialogCancel(showSaveDialog.eventKey)}
          title="JESGO"
          message="保存します。よろしいですか？"
        />
      </>
    )
  );
};

// パネル作成
export const createPanel = (
  schemaIds: dispSchemaIdAndDocumentIdDefine[],
  filteredSchemaIds: dispSchemaIdAndDocumentIdDefine[],
  setSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,
  isChildSchema: boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSaveResponse: React.Dispatch<React.SetStateAction<responseResult>>,
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>,
  selectedTabKey: any,
  schemaAddModFunc: (isTabSelected: boolean, eventKey: any) => void,
  parentTabsId: string,
  parentEventDate: string | null,
  setUpdateFormData: React.Dispatch<React.SetStateAction<boolean>>,
  setReload: (value: React.SetStateAction<reloadState>) => void,
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void
) =>
  // subschema表示
  filteredSchemaIds.map((info: dispSchemaIdAndDocumentIdDefine) => (
    // TODO TabSchemaにTabを置くとうまく動作しなくなる
    <PanelSchema
      key={`panel-${info.compId}`}
      parentTabsId={parentTabsId}
      parentEventDate={parentEventDate}
      isChildSchema={isChildSchema} // eslint-disable-line react/jsx-boolean-value
      schemaId={info.schemaId}
      documentId={info.documentId}
      dispSchemaIds={[...schemaIds]}
      setDispSchemaIds={setSchemaIds}
      setIsLoading={setIsLoading}
      setSaveResponse={setSaveResponse}
      isSchemaChange={info.isSchemaChange}
      isParentSchemaChange={info.isParentSchemaChange}
      setErrors={setErrors}
      selectedTabKey={selectedTabKey}
      schemaAddModFunc={schemaAddModFunc}
      setUpdateFormData={setUpdateFormData}
      setReload={setReload}
      setOverwriteDialogPlop={setOverwriteDialogPlop}
    />
  ));

// パネル作成
export const createPanels = (
  subschemaIds: dispSchemaIdAndDocumentIdDefine[],
  subschemaIdsNotDeleted: dispSchemaIdAndDocumentIdDefine[],
  setSubschemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,

  dispChildSchemaIds: dispSchemaIdAndDocumentIdDefine[],
  dispChildSchemaIdsNotDeleted: dispSchemaIdAndDocumentIdDefine[],
  setDispChildSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSaveResponse: React.Dispatch<React.SetStateAction<responseResult>>,
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>,
  selectedTabKey: any,
  schemaAddModFunc: (isTabSelected: boolean, eventKey: any) => void,
  parentTabsId: string,
  parentEventDate: string | null,
  setUpdateFormData: React.Dispatch<React.SetStateAction<boolean>>,
  setReload: (value: React.SetStateAction<reloadState>) => void,
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void
) =>
  (subschemaIdsNotDeleted.length > 0 ||
    dispChildSchemaIdsNotDeleted.length > 0) && (
    <>
      {createPanel(
        subschemaIds,
        subschemaIdsNotDeleted,
        setSubschemaIds,
        false,
        setIsLoading,
        setSaveResponse,
        setErrors,
        selectedTabKey,
        schemaAddModFunc,
        parentTabsId,
        parentEventDate,
        setUpdateFormData,
        setReload,
        setOverwriteDialogPlop
      )}
      {createPanel(
        dispChildSchemaIds,
        dispChildSchemaIdsNotDeleted,
        setDispChildSchemaIds,
        true,
        setIsLoading,
        setSaveResponse,
        setErrors,
        selectedTabKey,
        schemaAddModFunc,
        parentTabsId,
        parentEventDate,
        setUpdateFormData,
        setReload,
        setOverwriteDialogPlop
      )}
    </>
  );
