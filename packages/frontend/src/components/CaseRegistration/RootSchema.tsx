/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import lodash from 'lodash';
import { useDispatch } from 'react-redux';
import '../../views/Registration.css';
import CustomDivForm from './JESGOCustomForm';
import {
  GetBeforeInheritDocumentData,
  GetHiddenPropertyNames,
  GetSchemaTitle,
  hasFormDataInput,
  isInfiniteLoopBlackList,
  SetSameSchemaTitleNumbering,
  SetTabStyle,
} from '../../common/CaseRegistrationUtility';
import { ControlButton, COMP_TYPE } from './ControlButton';
import { CustomSchema, GetSchemaInfo } from './SchemaUtility';
import {
  dispSchemaIdAndDocumentIdDefine,
  jesgoDocumentObjDefine,
  SaveDataObjDefine,
} from '../../store/formDataReducer';
import { createTabs } from './FormCommonComponents';
import { ChildTabSelectedFuncObj, RegistrationErrors } from './Definition';
import { getEventDate, responseResult } from '../../common/DBUtility';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';
import store from '../../store';
import { Const } from '../../common/Const';
import { reloadState } from '../../views/Registration';
import { OverwriteDialogPlop } from '../common/PluginOverwriteConfirm';

type Props = {
  tabId: string;
  parentTabsId: string;
  schemaId: number;
  dispSchemaIds: dispSchemaIdAndDocumentIdDefine[];
  setDispSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >;
  documentId: string;
  setSelectedTabKey: React.Dispatch<React.SetStateAction<any>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveResponse: React.Dispatch<React.SetStateAction<responseResult>>;
  isSchemaChange: boolean | undefined;
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>;
  selectedTabKey: any;
  schemaAddModFunc: (isTabSelected: boolean, eventKey: any) => void;
  setReload: (value: React.SetStateAction<reloadState>) => void;
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void;
};

// ルートディレクトリのスキーマ
const RootSchema = React.memo((props: Props) => {
  const {
    tabId,
    parentTabsId,
    schemaId,
    dispSchemaIds,
    setDispSchemaIds,
    documentId,
    setSelectedTabKey,
    setIsLoading,
    setSaveResponse,
    isSchemaChange,
    setErrors,
    schemaAddModFunc,
    setReload,
    setOverwriteDialogPlop,
  } = props;

  // 表示中のchild_schema
  const [dispChildSchemaIds, setDispChildSchemaIds] = useState<
    dispSchemaIdAndDocumentIdDefine[]
  >([]);
  const [dispChildSchemaIdsNotDeleted, setDispChildSchemaIdsNotDeleted] =
    useState<dispSchemaIdAndDocumentIdDefine[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});
  // const [formData, setFormData] = useState<any>({});
  // サブスキーマ用
  const [dispSubSchemaIds, setDispSubSchemaIds] = useState<
    dispSchemaIdAndDocumentIdDefine[]
  >([]);

  const [dispSubSchemaIdsNotDeleted, setDispSubSchemaIdsNotDeleted] = useState<
    dispSchemaIdAndDocumentIdDefine[]
  >([]);

  // ドキュメント追加検知用
  const [addedDocumentCount, setAddedDocumentCount] = useState<number>(-1);

  // 子ドキュメントの更新有無
  const [updateChildFormData, setUpdateChildFormData] =
    useState<boolean>(false);

  const dispatch = useDispatch();

  const saveDoc = store
    .getState()
    .formDataReducer.saveData.jesgo_document.find((p) => p.key === documentId);
  const eventDate = useMemo(
    () => (saveDoc ? getEventDate(saveDoc, formData) : null),
    [saveDoc, formData]
  );

  // ルートのschema情報を取得
  const schemaInfo = useMemo(
    () => GetSchemaInfo(schemaId, eventDate) as JesgoDocumentSchema,
    [schemaId, eventDate]
  );
  if (schemaInfo === undefined) {
    return null;
  }
  const {
    document_schema: documentSchema,
    subschema,
    child_schema: childSchema,
  } = schemaInfo;
  const customSchema = useMemo(
    () => CustomSchema({ orgSchema: documentSchema, formData }),
    [documentSchema, formData]
  ); // eslint-disable-line @typescript-eslint/no-unsafe-assignment

  // unique=falseの追加可能なサブスキーマまたは未作成サブスキーマ
  const addableSubSchemaIds = useMemo(() => {
    const retIds: number[] = [];
    if (subschema.length > 0) {
      subschema.forEach((id) => {
        const info = GetSchemaInfo(id);
        if (info) {
          if (
            (info.document_schema[Const.EX_VOCABULARY.UNIQUE] ?? false) ===
              false ||
            !dispSubSchemaIds.find(
              (p) => p.deleted === false && p.schemaId === info.schema_id
            )
          ) {
            retIds.push(id);
          }
        }
      });
    }
    return retIds;
  }, [subschema, dispSubSchemaIds]);

  // サブスキーマとサブスキーマから派生できる継承スキーマ一覧取得
  const subSchemaAndInherit = useMemo(() => {
    let subSchemaArray: number[] = [];
    if (subschema.length > 0) {
      subSchemaArray.push(...subschema);
      subschema.forEach((subSchemaId: number) => {
        // 基底スキーマを取得
        const baseSchemaId = GetSchemaInfo(subSchemaId)?.base_schema;
        // 継承スキーマを取得
        const inheritIds = baseSchemaId
          ? GetSchemaInfo(baseSchemaId)?.inherit_schema
          : GetSchemaInfo(subSchemaId)?.inherit_schema;

        if (baseSchemaId) {
          subSchemaArray.push(baseSchemaId);
        }
        if (inheritIds) {
          subSchemaArray.push(...inheritIds);
        }
      });

      subSchemaArray = lodash.uniq(subSchemaArray);
    }
    return subSchemaArray;
  }, [subschema]);

  // サブスキーマのドキュメント作成
  const createSubSchemaDocument = () => {
    // サブスキーマにドキュメント追加時
    if (
      subschema.length > 0 &&
      dispSubSchemaIds.length > 0 &&
      dispSubSchemaIds.find((p) => p.documentId === '')
    ) {
      // unieque=falseのサブスキーマ追加
      const newItemIdx = dispSubSchemaIds.findIndex((p) => p.documentId === '');
      if (newItemIdx > -1) {
        const newItem = dispSubSchemaIds[newItemIdx];
        const itemSchemaInfo = GetSchemaInfo(newItem.schemaId);
        dispatch({
          type: 'ADD_CHILD',
          schemaId: newItem.schemaId,
          documentId: newItem.documentId,
          formData: {},
          parentDocumentId: documentId,
          dispChildSchemaIds: dispSubSchemaIds,
          setDispChildSchemaIds: setDispSubSchemaIds,
          isRootSchema: false,
          schemaInfo: itemSchemaInfo,
          setAddedDocumentCount,
          isNotUniqueSubSchemaAdded: true,
          schemaIndex: newItemIdx,
        });
      }
    } else if (
      // 新規または継承時、スキーマ変更時
      subschema.length > 0 &&
      (isSchemaChange ||
        (dispSubSchemaIds.length === 0 && documentId.startsWith('K')))
    ) {
      dispSubSchemaIds.length = 0; // 一旦クリア
      subschema.forEach((id) => {
        const item: dispSchemaIdAndDocumentIdDefine = {
          documentId: '',
          schemaId: id,
          deleted: false,
          compId: '',
          title: GetSchemaTitle(id),
          isParentSchemaChange: isSchemaChange,
        };
        if (isInfiniteLoopBlackList(item.schemaId) === false) {
          dispSubSchemaIds.push(item);

          let inheritDocuments: jesgoDocumentObjDefine[] = [];
          // 継承した場合は削除したドキュメントの中から同じスキーマのドキュメントを取得
          // ※ルートスキーマには親はいないので自身の継承だけ気にする
          if (isSchemaChange) {
            inheritDocuments = GetBeforeInheritDocumentData(documentId, id);
          }
          if (inheritDocuments.length > 0) {
            inheritDocuments.forEach((inheritItem) => {
              const itemSchemaInfo = GetSchemaInfo(
                inheritItem.value.schema_id,
                inheritItem.value.event_date
              );

              // 同一サブスキーマが複数あった場合の対応
              if (
                inheritDocuments.length >
                dispSubSchemaIds.filter((p) => p.schemaId === id).length
              ) {
                dispSubSchemaIds.push({
                  documentId: '',
                  schemaId: inheritItem.value.schema_id,
                  deleted: false,
                  compId: '',
                  title: GetSchemaTitle(inheritItem.value.schema_id),
                  isParentSchemaChange: isSchemaChange,
                });
              }

              dispatch({
                type: 'ADD_CHILD',
                schemaId: inheritItem.value.schema_id,
                documentId: '',
                formData: inheritItem.value.document,
                parentDocumentId: documentId,
                dispChildSchemaIds: dispSubSchemaIds,
                setDispChildSchemaIds: setDispSubSchemaIds,
                isRootSchema: false,
                schemaInfo: itemSchemaInfo,
                setAddedDocumentCount,
                processedDocId: inheritItem.key,
              });
            });
          } else if (!item.documentId) {
            // 新規時は必ずドキュメント作成する
            const itemSchemaInfo = GetSchemaInfo(item.schemaId);
            dispatch({
              type: 'ADD_CHILD',
              schemaId: item.schemaId,
              documentId: item.documentId,
              formData: {},
              parentDocumentId: documentId,
              dispChildSchemaIds: dispSubSchemaIds,
              setDispChildSchemaIds: setDispSubSchemaIds,
              isRootSchema: false,
              schemaInfo: itemSchemaInfo,
              setAddedDocumentCount,
            });
          }
        }
      });
    } else if (dispSubSchemaIds.length > 0) {
      // サブスキーマがあるスキーマからないスキーマへ継承時に残ってしまうのでクリアする
      if (subschema.length === 0 && isSchemaChange) {
        dispSubSchemaIds.length = 0;
      }

      // タイトル振り直し
      dispSubSchemaIds.forEach((item) => {
        // eslint-disable-next-line no-param-reassign
        item.title = GetSchemaTitle(item.schemaId);
      });
    }

    SetSameSchemaTitleNumbering(dispSubSchemaIds, dispChildSchemaIds);

    setDispSubSchemaIdsNotDeleted(
      dispSubSchemaIds.filter((p) => p.deleted === false)
    );

    // 継承スキーマの場合は再作成完了後に親ドキュメントのフラグを降ろす
    if (isSchemaChange) {
      setDispSchemaIds(
        dispSchemaIds.map((p) => {
          if (p.documentId === documentId) {
            p.isSchemaChange = false;
          }
          return p;
        })
      );
    }
  };

  // ドキュメント追加後の保存
  useEffect(() => {
    const {
      maxDocumentCount: maxCount,
      addedDocumentCount: nowCount,
      selectedTabKeyName: eventKey,
    } = store.getState().formDataReducer;
    const tabSelectEvent = store.getState().formDataReducer.tabSelectEvent;
    // すべてのドキュメントが作成完了したら保存する
    if (maxCount !== undefined && maxCount === nowCount) {
      if (tabSelectEvent) {
        tabSelectEvent(false, eventKey);
      }
      dispatch({ type: 'ADD_DOCUMENT_STATUS', maxDocumentCount: undefined });
    }
  }, [addedDocumentCount]);

  // DBから読み込んだデータを設定
  useEffect(() => {
    // 編集中のデータ
    const editedDocuments =
      store.getState().formDataReducer.saveData.jesgo_document;

    const parentDoc = editedDocuments.find((p) => p.key === documentId);

    if (parentDoc) {
      setFormData(parentDoc.value.document);
      dispatch({
        type: 'INPUT',
        schemaId,
        formData: parentDoc.value.document,
        documentId,
        isUpdateInput: false,
      });

      const childDocuments = parentDoc.value.child_documents;

      // 子ドキュメントがあればサブスキーマとchildスキーマを判定してそれぞれの配列に格納
      if (childDocuments.length > 0) {
        childDocuments.forEach((childDocId) => {
          const childDoc = editedDocuments.find((p) => p.key === childDocId);

          if (childDoc) {
            const item: dispSchemaIdAndDocumentIdDefine = {
              documentId: childDoc.key,
              schemaId: childDoc.value.schema_id,
              deleted: childDoc.value.deleted,
              compId: childDoc.compId,
              title: GetSchemaTitle(childDoc.value.schema_id),
            };

            const cDocSchemaInfo = GetSchemaInfo(childDoc.value.schema_id);

            // サブスキーマに追加
            // unique=falseのサブスキーマの場合もサブスキーマに追加する
            if (
              subschema.length > 0 &&
              (!dispSubSchemaIds.find(
                (p) => p.schemaId === childDoc.value.schema_id
              ) ||
                addableSubSchemaIds.includes(childDoc.value.schema_id)) &&
              subSchemaAndInherit.includes(childDoc.value.schema_id)
            ) {
              dispSubSchemaIds.push(item);
            } else if (
              cDocSchemaInfo?.base_schema &&
              addableSubSchemaIds.includes(cDocSchemaInfo.base_schema)
            ) {
              // 継承元のスキーマがサブスキーマの場合もサブスキーマに追加
              dispSubSchemaIds.push(item);
            } else {
              // childスキーマに追加
              dispChildSchemaIds.push(item);
            }
          }
        });

        // 同一スキーマ存在時のタブ名
        SetSameSchemaTitleNumbering(dispSubSchemaIds, dispChildSchemaIds);

        if (dispSubSchemaIds.length > 0) {
          setDispSubSchemaIds([...dispSubSchemaIds]);
        }
        if (dispChildSchemaIds.length > 0) {
          setDispChildSchemaIds([...dispChildSchemaIds]);
        }
      }
    }
  }, [documentId]);

  // サブスキーマ
  useEffect(() => {
    createSubSchemaDocument();
  }, [dispSubSchemaIds, isSchemaChange]);

  // childスキーマ
  useEffect(() => {
    if (isSchemaChange) {
      dispChildSchemaIds.length = 0; // 一旦クリア
      // 継承した場合は削除したドキュメントの中から同じスキーマのドキュメントを取得
      if (childSchema.length > 0) {
        const searchChildDocs: jesgoDocumentObjDefine[] = [];
        childSchema.forEach((id) => {
          searchChildDocs.push(...GetBeforeInheritDocumentData(documentId, id));
        });

        if (searchChildDocs && searchChildDocs.length > 0) {
          searchChildDocs.forEach((doc) => {
            const item: dispSchemaIdAndDocumentIdDefine = {
              documentId: '',
              schemaId: doc.value.schema_id,
              deleted: false,
              compId: '',
              title: GetSchemaTitle(doc.value.schema_id),
            };
            dispChildSchemaIds.push(item);

            dispatch({
              type: 'ADD_CHILD',
              schemaId: item.schemaId,
              documentId: item.documentId,
              formData: doc.value.document,
              parentDocumentId: documentId,
              dispChildSchemaIds,
              setDispChildSchemaIds,
              isRootSchema: false,
              schemaInfo: GetSchemaInfo(
                doc.value.schema_id,
                doc.value.event_date
              ),
              setAddedDocumentCount,
              processedDocId: doc.key,
            });
          });
        }
      }
    }

    if (dispChildSchemaIds.length > 0 && !isSchemaChange) {
      dispChildSchemaIds.forEach((item) => {
        // 新規時は必ずドキュメント作成する
        if (!item.documentId) {
          const itemSchemaInfo = GetSchemaInfo(item.schemaId);
          dispatch({
            type: 'ADD_CHILD',
            schemaId: item.schemaId,
            documentId: item.documentId,
            formData: {},
            parentDocumentId: documentId,
            dispChildSchemaIds,
            setDispChildSchemaIds,
            isRootSchema: false,
            schemaInfo: itemSchemaInfo,
            setAddedDocumentCount,
          });
        }
        // タイトル振り直し
        item.title = GetSchemaTitle(item.schemaId);
      });

      SetSameSchemaTitleNumbering(dispSubSchemaIds, dispChildSchemaIds);
    }
    setDispChildSchemaIdsNotDeleted(
      dispChildSchemaIds.filter((p) => p.deleted === false)
    );
  }, [dispChildSchemaIds, isSchemaChange]);

  // ドキュメントの並び順を更新
  useEffect(() => {
    dispatch({
      type: 'SORT',
      subSchemaIds: dispSubSchemaIds,
      dispChildSchemaIds,
      isRootSchema: false,
    });
  }, [dispSubSchemaIds, dispChildSchemaIds]);

  const [childTabSelectedFunc, setChildTabSelectedFunc] =
    useState<ChildTabSelectedFuncObj>({
      fnAddDocument: schemaAddModFunc,
      fnSchemaChange: schemaAddModFunc,
    });

  useEffect(() => {
    // 入力内容に応じてタブのフォントを設定

    // 変更前の現在のドキュメントの入力状態
    const beforeInputState =
      store.getState().formDataReducer.formDataInputStates.get(documentId) ??
      false;

    let hasInput = false;
    // 子のドキュメントはsaveDataから検索
    const docIdList = dispSubSchemaIdsNotDeleted.map((p) => p.documentId);
    docIdList.push(...dispChildSchemaIdsNotDeleted.map((p) => p.documentId));

    const formDataInputStates =
      store.getState().formDataReducer.formDataInputStates;
    // eslint-disable-next-line no-restricted-syntax
    for (const docId of docIdList) {
      if (formDataInputStates.get(docId)) {
        hasInput = true;
        break;
      }
    }
    setUpdateChildFormData(false);

    // 子ドキュメントに入力がなければ自身のドキュメントチェック
    if (!hasInput) {
      const hiddenItems = GetHiddenPropertyNames(customSchema);
      // 非表示項目は除外
      const copyFormData = lodash.omit(formData, hiddenItems);
      hasInput = hasFormDataInput(copyFormData, schemaId);
    }

    if (beforeInputState !== hasInput) {
      dispatch({
        type: 'SET_FORMDATA_INPUT_STATE',
        documentId,
        hasFormDataInput: hasInput,
      });
    }

    SetTabStyle(`root-tabs-tab-${tabId}`, hasInput);

    // 適応するスキーマが変更された場合、バージョンなどの情報を更新する
    if (
      saveDoc &&
      saveDoc.value.schema_primary_id !== schemaInfo.schema_primary_id
    ) {
      dispatch({ type: 'CHANGED_SCHEMA', documentId, schemaInfo });
    }
  }, [formData, updateChildFormData, schemaInfo]);

  return (
    <>
      <div className="content-area">
        {/* <Button onClick={onClick}>validationテスト</Button> */}
        <CustomDivForm
          documentId={documentId}
          schemaId={schemaId}
          dispatch={dispatch}
          setFormData={setFormData}
          formData={formData} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          schema={customSchema}
          isTabItem
          dispSchemaIds={[...dispSchemaIds]}
          setDispSchemaIds={setDispSchemaIds}
          setErrors={setErrors}
          parentEventDate={eventDate}
        />
        <ControlButton
          tabId={tabId}
          parentTabsId={parentTabsId}
          schemaId={schemaId}
          Type={COMP_TYPE.ROOT_TAB}
          isChildSchema={true} // eslint-disable-line react/jsx-boolean-value
          dispSchemaIds={[...dispSchemaIds]}
          setDispSchemaIds={setDispSchemaIds}
          dispChildSchemaIds={[...dispChildSchemaIds]}
          dispSubSchemaIds={[...dispSubSchemaIds]}
          setDispSubSchemaIds={setDispSubSchemaIds}
          setDispChildSchemaIds={setDispChildSchemaIds}
          childSchemaIds={childSchema}
          dispatch={dispatch}
          documentId={documentId}
          setFormData={setFormData}
          setSelectedTabKey={setSelectedTabKey}
          formData={formData} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          subSchemaCount={0}
          tabSelectEvents={childTabSelectedFunc}
          addableSubSchemaIds={addableSubSchemaIds}
          setIsLoading={setIsLoading}
          setReload={setReload}
          setOverwriteDialogPlop={setOverwriteDialogPlop}
          setErrors={setErrors}
        />
      </div>
      {createTabs(
        tabId,
        eventDate,
        dispSubSchemaIds,
        dispSubSchemaIdsNotDeleted,
        setDispSubSchemaIds,
        dispChildSchemaIds,
        dispChildSchemaIdsNotDeleted,
        setDispChildSchemaIds,
        setIsLoading,
        setSaveResponse,
        setErrors,
        childTabSelectedFunc,
        setChildTabSelectedFunc,
        setUpdateChildFormData,
        setReload,
        setOverwriteDialogPlop
      )}
    </>
  );
});

export default RootSchema;
