import React, { useEffect, useState } from 'react';
import { Dispatch } from 'redux';
import { Dropdown, Glyphicon, MenuItem, SelectCallback } from 'react-bootstrap';
import {
  GetAllSubSchemaIds,
  GetCreatedDocCountAfterInherit,
  GetInheritFormData,
  GetSchemaTitle,
  OpenOutputView,
} from '../../common/CaseRegistrationUtility';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';
import './ControlButton.css';
import { dispSchemaIdAndDocumentIdDefine } from '../../store/formDataReducer';
import store from '../../store/index';
import { ChildTabSelectedFuncObj, RegistrationErrors } from './Definition';
import { Const } from '../../common/Const';
import { GetRootSchema, GetSchemaInfo } from './SchemaUtility';
import { fTimeout } from '../../common/CommonUtility';
import { executePlugin, jesgoPluginColumns } from '../../common/Plugin';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { LoadPluginList } from '../../common/DBUtility';
import { reloadState } from '../../views/Registration';
import { OverwriteDialogPlop } from '../common/PluginOverwriteConfirm';

export const COMP_TYPE = {
  ROOT: 'root',
  ROOT_TAB: 'rootTab',
  TAB: 'tab',
  PANEL: 'panel',
} as const;
type CompType = typeof COMP_TYPE[keyof typeof COMP_TYPE];

// TODO defaultpropsが設定できない
type ControlButtonProps = {
  tabId: string;
  parentTabsId: string;
  Type: CompType;
  schemaId: number;
  // このドキュメントの表示中の子スキーマ
  dispChildSchemaIds: dispSchemaIdAndDocumentIdDefine[];
  // このドキュメントの表示中のサブスキーマ
  dispSubSchemaIds: dispSchemaIdAndDocumentIdDefine[];
  setDispSubSchemaIds:
    | React.Dispatch<React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>>
    | undefined;
  setDispChildSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >;
  childSchemaIds?: number[]; // eslint-disable-line react/require-default-props
  addableSubSchemaIds?: number[]; // eslint-disable-line react/require-default-props
  // このドキュメント自身が所属しているスキーマ(ドキュメント)一覧
  dispSchemaIds?: dispSchemaIdAndDocumentIdDefine[]; // eslint-disable-line react/require-default-props
  // eslint-disable-next-line react/require-default-props
  setDispSchemaIds?: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >;
  dispatch: Dispatch;
  documentId: string;
  isChildSchema: boolean;
  // eslint-disable-next-line react/require-default-props
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  // eslint-disable-next-line
  formData?: any;
  setSelectedTabKey?: React.Dispatch<React.SetStateAction<any>>;
  subSchemaCount: number;
  tabSelectEvents?: ChildTabSelectedFuncObj;
  disabled?: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setReload: (value: React.SetStateAction<reloadState>) => void;
  setOverwriteDialogPlop: (
    value: React.SetStateAction<OverwriteDialogPlop | undefined>
  ) => void;
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>;
};

// ルートドキュメント操作用コントロールボタン
export const ControlButton = React.memo((props: ControlButtonProps) => {
  const {
    tabId,
    parentTabsId,
    Type,
    schemaId,
    childSchemaIds = [],
    addableSubSchemaIds = [],
    dispChildSchemaIds,
    dispSubSchemaIds,
    setDispChildSchemaIds,
    setDispSubSchemaIds,
    dispSchemaIds = [],
    setDispSchemaIds = null,
    dispatch,
    documentId,
    isChildSchema,
    setFormData,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    formData,
    setSelectedTabKey,
    tabSelectEvents,
    disabled,
    setIsLoading,
    setReload,
    setOverwriteDialogPlop,
    setErrors,
  } = props;

  const [jesgoPluginList, setJesgoPluginList] = useState<jesgoPluginColumns[]>(
    []
  );

  useEffect(() => {
    const f = async () => {
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

        setJesgoPluginList(pluginList.filter((p) => p.plugin_id));
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // 追加可能判定
  const canAddSchema = (
    tInfo: JesgoDocumentSchema | undefined,
    tSchemaId: number
  ) => {
    if (tInfo == null) return false;
    // ユニークフラグ取得
    // ※継承元、継承先のスキーマがすべて同じ設定であることが前提
    const isUnique = tInfo.document_schema[Const.EX_VOCABULARY.UNIQUE] ?? false;

    // 基底スキーマを取得
    const baseSchemaId = GetSchemaInfo(tSchemaId)?.base_schema;

    // 継承スキーマを取得
    const inheritIds = baseSchemaId
      ? GetSchemaInfo(baseSchemaId)?.inherit_schema
      : GetSchemaInfo(tSchemaId)?.inherit_schema;

    // 関連スキーマIDをまとめる(判定対象スキーマ＋基底スキーマ＋継承スキーマ)
    const relatedSchemaIds: Set<number> = new Set();
    relatedSchemaIds.add(tSchemaId);
    if (baseSchemaId) {
      relatedSchemaIds.add(baseSchemaId);
    }
    if (inheritIds) {
      inheritIds.forEach((sid) => {
        relatedSchemaIds.add(sid);
      });
    }

    // uniqueではない、またはsubschemaとchildschemaに同じスキーマがない
    // TODO：schemaIdじゃなく$idで見ないといけない？
    return (
      !isUnique ||
      (!dispChildSchemaIds.find(
        (p) => relatedSchemaIds.has(p.schemaId) && p.deleted === false
      ) &&
        !dispSubSchemaIds.find(
          (p) => relatedSchemaIds.has(p.schemaId) && p.deleted === false
        ))
    );
  };

  const schemaInfo = GetSchemaInfo(schemaId);

  // 基底スキーマを取得
  const baseSchemaId = schemaInfo?.base_schema;
  const baseSchema = baseSchemaId ? GetSchemaInfo(baseSchemaId) : undefined;
  const baseSchemaName = baseSchema
    ? `${baseSchema.title} ${baseSchema.subtitle}`
    : '';
  // 継承スキーマを取得
  const inheritIds = baseSchemaId
    ? GetSchemaInfo(baseSchemaId)?.inherit_schema
    : schemaInfo?.inherit_schema;

  const schemaDocument = schemaInfo?.document_schema;
  let isTab = true;
  // ルートは必ずタブ。それ以外はsubschemastyleで判断
  if (Type !== COMP_TYPE.ROOT && Type !== COMP_TYPE.ROOT_TAB) {
    if (schemaDocument) {
      isTab = schemaDocument[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE] === 'tab';
    }
  }

  const childrenSchemaIds: number[] = [];
  childrenSchemaIds.push(...addableSubSchemaIds, ...childSchemaIds);

  // ルートの場合ルートドキュメント それ以外はchild_schema
  const canAddSchemaIds =
    Type === COMP_TYPE.ROOT ? GetRootSchema() : childrenSchemaIds;
  const canAddSchemas = [] as JesgoDocumentSchema[];
  if (canAddSchemaIds != null && canAddSchemaIds.length > 0) {
    canAddSchemaIds.forEach((id: number) => {
      const info: unknown = GetSchemaInfo(id);
      if (info != null) {
        if (canAddSchema(info as JesgoDocumentSchema, id)) {
          canAddSchemas.push(info as JesgoDocumentSchema);
        }
      }
    });
  }

  /// コントロールボタン メニュー選択イベントハンドラ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectMenuHandler: SelectCallback | undefined = (eventKey: any) => {
    // スクロール位置保存
    dispatch({
      type: 'SCROLL_POSITION',
      scrollTop: document.scrollingElement
        ? document.scrollingElement.scrollTop
        : undefined,
    });

    if (typeof eventKey === 'string') {
      // 削除データは後ろになるよう並び替え
      const copyIds = dispSchemaIds.sort((first, second) => {
        if (!first.deleted && second.deleted) {
          return -1;
        }
        return 0;
      });

      const index = copyIds.findIndex((p) => p.documentId === documentId);
      const findItem = copyIds.find((p) => p.documentId === documentId);
      let plugin: jesgoPluginColumns | undefined;
      if (eventKey.startsWith('plugin_')) {
        const pluginId = eventKey.replace('plugin_', '');
        plugin = jesgoPluginList.find((p) => p.plugin_id === Number(pluginId));
      }

      switch (eventKey) {
        case 'up':
          // 上（左）へ移動
          // 自分が先頭の場合は何もしない
          if (index > 0 && setDispSchemaIds != null) {
            const newIndex = index - 1;
            copyIds.splice(index, 1);
            copyIds.splice(
              newIndex,
              0,
              findItem as dispSchemaIdAndDocumentIdDefine
            );
            setDispSchemaIds([...copyIds]);
          }
          break;

        case 'down':
          // 下（右）へ移動
          // 自分が末尾の場合は何もしない
          if (index < copyIds.length - 1 && setDispSchemaIds != null) {
            const newIndex = index + 1;
            copyIds.splice(index, 1);
            copyIds.splice(
              newIndex,
              0,
              findItem as dispSchemaIdAndDocumentIdDefine
            );
            // TODO: 今はindexだが、ユニークなキーに変わるならここも変える必要あり
            setDispSchemaIds([...copyIds]);
          }
          break;
        case 'delete': {
          // アラート表示用のタイトル
          let title = '';
          if (findItem) {
            title = findItem.title;
          }

          // eslint-disable-next-line
          if (confirm(`[${title}]を削除します。よろしいですか？`)) {
            // 自身を削除
            if (setDispSchemaIds != null) {
              // TODO: 削除は削除フラグ立てる
              // copyIds.splice(index, 1);
              copyIds[index].deleted = true;
              setDispSchemaIds([...copyIds]);
              dispatch({ type: 'DEL', documentId });

              if (setErrors) {
                setErrors(store.getState().formDataReducer.extraErrors);
              }

              // 削除したタブの1つ前か後のタブを選択する
              const tabList = store
                .getState()
                .formDataReducer.allTabList.get(parentTabsId);
              if (tabList && tabList.length > 0 && setSelectedTabKey) {
                // 最後の1件だったタブを削除した場合は未選択とする
                if (tabList.length === 1) {
                  setSelectedTabKey(undefined);
                } else {
                  // 削除されたタブ名を取得
                  const deletedItemIdx = tabList.findIndex((p) =>
                    p.endsWith(copyIds[index].compId)
                  );

                  // 右端タブの場合は1つ前のタブ(削除後に右端になるタブ)を選択
                  if (deletedItemIdx === tabList.length - 1) {
                    setSelectedTabKey(tabList[deletedItemIdx - 1]);
                  } else {
                    // 右端のタブでなければ1つ後(右隣)のタブを選択
                    setSelectedTabKey(tabList[deletedItemIdx + 1]);
                  }
                }
              }
            }
          }
          break;
        }
        case 'clear':
          // 自身のformData削除
          if (setFormData) {
            // 空オブジェクトで更新
            setFormData({});
            dispatch({
              type: 'INPUT',
              schemaId,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              formData: {},
              documentId,
              isUpdateInput: true,
            });
          }
          break;
        case 'copy': {
          // アラート表示用のタイトル
          let title = '';
          if (findItem) {
            title = findItem.title;
          }
          if (confirm(`[${title}]を複製します。よろしいですか？`)) {
            dispatch({
              type: 'COPY',
              documentId,
              parentSubSchemaIds: copyIds,
              setParentSubSchemaIds: setDispSchemaIds,
              SchemaInfoMap: store.getState().schemaDataReducer.schemaDatas,
            });

            if (tabSelectEvents && tabSelectEvents.fnSchemaChange) {
              tabSelectEvents.fnSchemaChange(
                isTab,
                store.getState().formDataReducer.selectedTabKeyName
              );
            }
          }
          break;
        }

        case eventKey.startsWith('plugin_') && eventKey: {
          setIsLoading(true);
          const f = async () => {
            if (plugin) {
              await Promise.race([
                fTimeout(Const.PLUGIN_TIMEOUT_SEC),
                executePlugin(
                  plugin,
                  [store.getState().formDataReducer.saveData.jesgo_case],
                  Number(documentId),
                  setReload,
                  setIsLoading,
                  setOverwriteDialogPlop
                ),
              ])
                .then((res) => {
                  if (plugin && !plugin.update_db) {
                    // eslint-disable-next-line
                    OpenOutputView(window, res);
                  }
                })
                .catch((err) => {
                  if (err === 'timeout') {
                    // eslint-disable-next-line no-alert
                    alert('操作がタイムアウトしました');
                  }
                })
                .finally(() => {
                  setIsLoading(false);
                });
            } else {
              // eslint-disable-next-line no-alert
              alert('不正な入力です。');
            }
          };

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          f();
          break;
        }
        default:
          // 継承スキーマへの切り替え
          if (eventKey.startsWith('I') && setDispSchemaIds != null) {
            const inheritId = Number(eventKey.replace('I', ''));

            // 継承先のスキーマに合わせたフォームデータの生成
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const newFormData = GetInheritFormData(
              copyIds[index].schemaId,
              inheritId,
              formData
            );

            copyIds[index].schemaId = inheritId;
            copyIds[index].isSchemaChange = true;

            if (formData) {
              dispatch({
                type: 'INPUT',
                isInherit: true,
                schemaId: inheritId,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                formData: newFormData,
                documentId: copyIds[index].documentId,
                isUpdateInput: true,
              });
            }

            // const allSubSchemaIds = GetAllSubSchemaIds(inheritId);

            let addChildSchemaCount = 0;
            const searchChildDocs =
              store.getState().formDataReducer.deletedDocuments;
            const processedDocIds: Set<string> = new Set();

            // 作成されるサブスキーマ、子スキーマの数を取得
            addChildSchemaCount = GetCreatedDocCountAfterInherit(
              inheritId,
              searchChildDocs,
              processedDocIds
            );

            // 作成予定のドキュメント数更新
            // 継承時は自身のドキュメントは既にあるため、サブスキーマの個数だけで良い
            dispatch({
              type: 'ADD_DOCUMENT_STATUS',
              // maxDocumentCount: allSubSchemaIds.length + addChildSchemaCount,
              maxDocumentCount: addChildSchemaCount,
              tabSelectEvent: tabSelectEvents?.fnSchemaChange,
              selectedTabKeyName: tabId,
            });

            // 現在の入力内容引継ぎ
            if (setFormData) {
              setFormData(newFormData);
            }
            setDispSchemaIds([...copyIds]);
          }
          break;
      }
    } else if (typeof eventKey === 'number') {
      const copyIds: dispSchemaIdAndDocumentIdDefine[] = [];
      let isSubSchema = false;
      let subschemaLastIdx = -1; // 同サブスキーマの位置

      const targetSchemaInfo = GetSchemaInfo(eventKey);
      // 継承/回帰関係にあるスキーマを取得
      const relatedSchemaIds: Set<number> = new Set();
      if (targetSchemaInfo?.base_schema) {
        relatedSchemaIds.add(targetSchemaInfo.base_schema);
      }
      targetSchemaInfo?.inherit_schema.forEach((inhId) =>
        relatedSchemaIds.add(inhId)
      );

      const isUnique =
        !!targetSchemaInfo &&
        (targetSchemaInfo.document_schema[Const.EX_VOCABULARY.UNIQUE] ?? false);

      // 子ドキュメントの追加
      // unique=falseのサブスキーマ
      if (addableSubSchemaIds && addableSubSchemaIds.length > 0) {
        // サブスキーマから継承/回帰できるスキーマID取得
        const addableSubSchemaInheritIds: Set<number> = new Set();
        addableSubSchemaIds.forEach((id) => {
          const sInfo = GetSchemaInfo(id);
          if (sInfo?.base_schema) {
            addableSubSchemaInheritIds.add(sInfo.base_schema);
          }
          if (sInfo?.inherit_schema) {
            sInfo.inherit_schema.forEach((inhId) =>
              addableSubSchemaInheritIds.add(inhId)
            );
          }
        });

        if (
          addableSubSchemaIds.includes(eventKey) ||
          addableSubSchemaInheritIds.has(eventKey) // サブスキーマから継承したスキーマもサブスキーマ扱い
        ) {
          isSubSchema = true;
          copyIds.push(...dispSubSchemaIds);

          // 追加済みのサブスキーマ探索
          if (!isUnique) {
            for (let index = copyIds.length - 1; index >= 0; index -= 1) {
              const item = copyIds[index];
              if (
                // unique=falseのサブスキーマの場合
                item.deleted === false &&
                (item.schemaId === eventKey ||
                  relatedSchemaIds.has(item.schemaId))
              ) {
                subschemaLastIdx = index;
                break;
              }
            }
          } else if (schemaInfo && schemaInfo.subschema.length > 0) {
            // 未作成サブスキーマの場合、本来のサブスキーマの並び順を参考に追加する

            // 追加サブスキーマの並び順
            const addSubSchemaIndex = schemaInfo.subschema.findIndex(
              (id) => id === eventKey
            );
            for (let index = copyIds.length - 1; index >= 0; index -= 1) {
              const item = copyIds[index];
              const currentSubSchemaIndex = schemaInfo.subschema.findIndex(
                (id) => id === item.schemaId
              );

              if (
                item.deleted === false &&
                addSubSchemaIndex >= currentSubSchemaIndex
              ) {
                subschemaLastIdx = index;
                break;
              }
            }
          }
        }
      }

      // child_schemaの場合
      if (!isSubSchema) {
        copyIds.push(...dispChildSchemaIds);
      }

      if (
        canAddSchema(
          canAddSchemas.find(
            (p: JesgoDocumentSchema) => p.schema_id === eventKey
          ),
          eventKey
        )
      ) {
        // 追加されるサブスキーマを取得
        let allSubSchemaIds: number[] = [];
        try {
          allSubSchemaIds = GetAllSubSchemaIds(eventKey, true);
        } catch (err) {
          // 無限ループ発生時はアラート出して処理中断
          if (
            err instanceof Error &&
            err.name === 'RangeError' &&
            err.message.includes('Maximum call stack size exceeded')
          ) {
            // eslint-disable-next-line no-alert
            alert(
              `${GetSchemaTitle(
                eventKey
              )}、もしくはその子スキーマにエラーがあるため作成できませんでした。スキーマ定義を見直してください`
            );
          } else {
            console.log(err);
          }

          return;
        }

        // タブ追加後に選択するタブのインデックス
        let tabIndex = '';
        if (isTab) {
          tabIndex = isSubSchema
            ? (subschemaLastIdx + 1).toString()
            : (
                dispSubSchemaIds.filter((p) => p.deleted === false).length +
                copyIds.filter((p) => p.deleted === false).length
              ).toString();
        } else {
          // パネルスキーマの場合は据え置き
          tabIndex = tabId;
        }

        dispatch({
          type: 'ADD_DOCUMENT_STATUS',
          maxDocumentCount: allSubSchemaIds.length + 1, // 自身のドキュメント分で+1
          tabSelectEvent: tabSelectEvents?.fnAddDocument,
          selectedTabKeyName: tabIndex, // 追加時はインデックスを渡す
        });

        const addItem: dispSchemaIdAndDocumentIdDefine = {
          documentId: '',
          schemaId: eventKey,
          deleted: false,
          compId: '',
          title: GetSchemaTitle(eventKey),
        };
        // unique=falseのサブスキーマを追加する場合、展開済みサブスキーマの末尾に追加する
        if (isSubSchema) {
          copyIds.splice(subschemaLastIdx + 1, 0, addItem);

          if (setDispSubSchemaIds) {
            setDispSubSchemaIds([...copyIds]);
          }
        } else {
          // 子スキーマの場合は末尾に追加
          setDispChildSchemaIds([...copyIds, addItem]);
        }
      }
    }
  };

  // 移動可否
  const canMove =
    Type !== COMP_TYPE.ROOT &&
    isChildSchema &&
    dispSchemaIds?.length !== undefined &&
    dispSchemaIds?.length > 1;
  // 削除可否
  // サブスキーマ以外なら削除可能
  let canDelete =
    isChildSchema &&
    dispSchemaIds !== undefined &&
    !!dispSchemaIds.find((p) => p.schemaId === schemaId);

  // サブスキーマの場合は同一スキーマが2件以上あれば削除可とする
  if (!isChildSchema) {
    const sameSchema = dispSchemaIds.filter((p) => {
      if (p.deleted === true) return false;
      if (p.schemaId === schemaId) {
        return true;
      }
      // 継承/回帰関係のスキーマは同一と扱う
      const sInfo = GetSchemaInfo(p.schemaId);
      return (
        (sInfo?.base_schema && sInfo.base_schema === schemaId) ||
        (sInfo?.inherit_schema && sInfo.inherit_schema.includes(schemaId))
      );
    });
    canDelete = !!(sameSchema.length >= 2);
  }
  // 追加可否
  const canAdd = canAddSchemas.length > 0;
  // 初期化可否
  const canClear = !canDelete && Type !== COMP_TYPE.ROOT;
  const horizontalMoveType: CompType[] = [COMP_TYPE.TAB, COMP_TYPE.ROOT_TAB];

  // 複製可否
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const canCopy =
    (schemaDocument?.['jesgo:copy'] ?? false) &&
    (schemaDocument?.[Const.EX_VOCABULARY.UNIQUE] ?? false) === false;

  return (
    <div className="control-button-area">
      <Dropdown
        id={`dropdown- ${
          Type === COMP_TYPE.ROOT ? 'root' : `child-${schemaId}`
        }`}
        onSelect={selectMenuHandler}
        pullRight
        disabled={disabled}
      >
        <Dropdown.Toggle noCaret>
          <Glyphicon glyph="th-list" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {jesgoPluginList.map(
            (plugin: jesgoPluginColumns) =>
              !plugin.all_patient &&
              !plugin.newdata &&
              plugin.target_schema_id &&
              plugin.target_schema_id.includes(schemaId) && (
                <MenuItem eventKey={`plugin_${plugin.plugin_id}`}>
                  プラグイン:{plugin.plugin_name}
                </MenuItem>
              )
          )}

          {/* 自身の移動 */}
          {canMove && (
            <MenuItem eventKey="up">
              {horizontalMoveType.includes(Type) ? '左' : '上'}に移動
            </MenuItem>
          )}
          {canMove && (
            <MenuItem eventKey="down">
              {horizontalMoveType.includes(Type) ? '右' : '下'}に移動
            </MenuItem>
          )}
          {canCopy && (
            <MenuItem key="menu-copy" eventKey="copy">
              ドキュメントの複製
            </MenuItem>
          )}
          {/* 自身の削除 */}
          {canDelete && (
            <MenuItem key="menu-delete" eventKey="delete">
              ドキュメントの削除
            </MenuItem>
          )}
          {canClear && (
            <MenuItem key="menu-clear" eventKey="clear">
              編集内容の初期化
            </MenuItem>
          )}
          {(canMove || canDelete || canClear) && canAdd && <MenuItem divider />}
          {/* 継承スキーマ関連の追加 */}
          {baseSchemaId && (
            <MenuItem key={baseSchemaId} eventKey={`I${baseSchemaId}`}>
              {`${baseSchemaName} への回帰`}
            </MenuItem>
          )}
          {inheritIds &&
            inheritIds.length > 0 &&
            // eslint-disable-next-line
            inheritIds.map((num: number) => {
              // 自分以外のスキーマIDのみ追加
              if (schemaId !== num) {
                const schema = GetSchemaInfo(num);
                if (schema !== undefined) {
                  const schemaName = `${schema.title} ${schema.subtitle}`;
                  return (
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    <MenuItem key={num} eventKey={`I${num}`}>
                      {`${schemaName} への継承`}
                    </MenuItem>
                  );
                }
              }
            })}
          {/* 子スキーマの追加 */}
          {canAddSchemas.map((info: JesgoDocumentSchema) => (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            <MenuItem key={info.schema_id} eventKey={info.schema_id}>
              {`${info.title} ${info.subtitle} の追加`}
            </MenuItem>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
});
