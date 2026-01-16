/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Object,
  JSONSchema7Array,
} from 'json-schema'; // eslint-disable-line import/no-unresolved
import JSONPointer from 'jsonpointer';
import lodash from 'lodash';
import { Dispatch } from 'redux';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { isNotEmptyObject } from '../../common/CaseRegistrationUtility';
import { formatDate, isDate } from '../../common/CommonUtility';
import { Const } from '../../common/Const';
import store from '../../store';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';

/** Schema加工用Utility */
type schemaItem = {
  pItems: { [key: string]: JSONSchema7Definition };
  pNames: string[];
};

/** JSONSchema7のkeyを全て取得 */
export const getSchemaItemNames = (schema: JSONSchema7) => {
  if (schema == null) return [] as string[];
  const result: string[] = Object.keys(schema) ?? [];
  return result;
};

/** schemaのタイプを取得 */
export const getSchemaType = (schema: JSONSchema7) => {
  if (schema == null) return undefined;
  return schema.type;
};

/** JSONSchema7のpropertiesのkeyと値を全て取得 */
export const getPropItemsAndNames = (item: JSONSchema7) => {
  if (item.properties == null) return { pItems: {}, pNames: [] } as schemaItem;
  const result: schemaItem = {
    pItems: item.properties ?? {},
    pNames: Object.keys(item.properties) ?? [],
  };
  return result;
};

// スキーマ$ID(スキーマのパス)からスキーマID(数値)を取得
export const GetSchemaIdFromString = (id: string): number => {
  const schemaInfos: Map<number, JesgoDocumentSchema[]> =
    store.getState().schemaDataReducer.schemaDatas;

  // eslint-disable-next-line no-restricted-syntax
  for (const item of schemaInfos) {
    if (item[1].length > 0 && item[1][0].schema_id_string === id) {
      return item[0];
    }
  }
  return -1;
};

/**
 * スキーマIDからスキーマ情報を取得
 * @param id スキーマID
 * @param eventDate イベント日(基準日)
 * @param validSchemaOnly
 * @param forceGetLatestSchema true:有効期限に関わらず最新取得 false:有効期限考慮
 * @param argSchemaInfos store.getState()が使えない場合に外から渡すスキーマ情報
 * @returns
 */
export const GetSchemaInfo = (
  id: number,
  eventDate: string | null = null,
  validSchemaOnly = false,
  forceGetLatestSchema = false,
  argSchemaInfos: Map<number, JesgoDocumentSchema[]> | null = null
) => {
  // 外から与えられたSchemaInfosがあればそちらを使う
  const schemaInfos: Map<number, JesgoDocumentSchema[]> =
    argSchemaInfos ?? store.getState().schemaDataReducer.schemaDatas;
  const schemaList = schemaInfos.get(id);
  if (schemaList) {
    // ルート、もしくは強制取得のフラグがあれば最新取得
    if ((id === 0 && schemaList.length > 0) || forceGetLatestSchema) {
      return schemaList[0];
    }

    let searchDate: Date | undefined;
    if (!eventDate || !isDate(eventDate)) {
      // eventDateがない場合は現在日とする
      searchDate = new Date(formatDate(new Date(), '-'));
    } else {
      searchDate = new Date(eventDate);
    }
    let enableedNewest = null;
    // 有効期限内で無効になっていないものを探す
    // eslint-disable-next-line no-plusplus
    for (let index = 0; index < schemaList.length; index++) {
      const target = schemaList[index];
      if (target.hidden) {
        // 有効でない場合は次のものを見る
        // eslint-disable-next-line no-continue
        continue;
      }
      if (enableedNewest === null) {
        // 最新の有効スキーマがまだ取得されていないのであれば保存しておく
        enableedNewest = target;
      }
      // eventDateが有効期限開始日より前であれば次のものを見る
      if (searchDate < new Date(target.valid_from)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // 有効期限終了日が設定されていない場合か、eventDateが有効期限終了日より前であれば確定する
      if (
        target.valid_until === null ||
        target.valid_until === '' ||
        searchDate <= new Date(target.valid_until)
      ) {
        return target;
      }
    }

    // 有効期限内かつ無効になっていないものが見つからなかった場合、無効になっていない最新を返す
    if (!validSchemaOnly && enableedNewest !== null) {
      return enableedNewest;
    }
  }
  return undefined;
};

// スキーマIDからバージョン毎のスキーマ情報を取得
export const GetSchemaVersionedInfo = (id: number) => {
  const schemaInfos: Map<number, JesgoDocumentSchema[]> =
    store.getState().schemaDataReducer.schemaDatas;
  const schemaList = schemaInfos.get(id);
  return schemaList ?? [];
};

// ルートスキーマのschema_idを取得
export const GetRootSchema = () => {
  const roots = store.getState().schemaDataReducer.rootSchemas;

  // 現在有効なスキーマのみ取得
  return roots.filter((id) => GetSchemaInfo(id, null, true));
};

export type schemaWithValid = {
  valid: boolean;
  schema: JesgoDocumentSchema;
  validCheckDisabled?: boolean;
};

export type parentSchemaList = {
  fromSubSchema: schemaWithValid[];
  fromChildSchema: schemaWithValid[];
};

// 指定したスキーマIDをサブスキーマ、子スキーマに持つスキーマ情報のリストを取得
export const GetParentSchemas = (childId: number) => {
  const schemaInfos = store.getState().schemaDataReducer.schemaDatas;
  const schemaList = schemaInfos.values();
  const parentFromSubSchemaList: schemaWithValid[] = [];
  const parentFromChildSchemaList: schemaWithValid[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const v of schemaList) {
    // 子スキーマの初期設定に入っているかを確認
    if (v[0].child_schema_default.includes(childId)) {
      // 現表示の子スキーマに含まれているかを確認
      const isValid = v[0].child_schema.includes(childId);
      const schemaObj = {
        valid: isValid,
        schema: v[0],
      };
      parentFromChildSchemaList.push(schemaObj);
    }
    // サブスキーマの初期設定に入っているかを確認
    else if (v[0].subschema_default.includes(childId)) {
      // 現表示のサブスキーマに含まれているかを確認
      const isValid = v[0].subschema.includes(childId);
      const schemaObj = {
        valid: isValid,
        schema: v[0],
      };
      parentFromSubSchemaList.push(schemaObj);
    }
  }
  const parentList: parentSchemaList = {
    fromSubSchema: parentFromSubSchemaList,
    fromChildSchema: parentFromChildSchemaList,
  };

  return parentList;
};

export type searchColumnsFromApi = {
  cancerTypes: string[];
};

export const storeSchemaInfo = async (dispatch: Dispatch<any>) => {
  // スキーマ取得処理
  const returnSchemaApiObject = await apiAccess(
    METHOD_TYPE.GET,
    `getJsonSchema`
  );

  if (returnSchemaApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
    dispatch({
      type: 'SCHEMA',
      schemaDatas: returnSchemaApiObject.body,
    });
  }

  // ルートスキーマID取得処理
  const returnRootSchemaIdsApiObject = await apiAccess(
    METHOD_TYPE.GET,
    `getRootSchemaIds`
  );
  if (returnRootSchemaIdsApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
    dispatch({
      type: 'ROOT',
      rootSchemas: returnRootSchemaIdsApiObject.body,
    });
  }

  // ブラックリスト取得処理
  const returnBlackListApiObject = await apiAccess(
    METHOD_TYPE.GET,
    `getblacklist`
  );

  if (returnBlackListApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
    const body = returnBlackListApiObject.body as { blackList: number[] };
    dispatch({
      type: 'BLACKLIST',
      blackList: body.blackList,
    });
  }

  // 検索カラム取得APIを呼ぶ
  const returnSearchColumnsApiObject = await apiAccess(
    METHOD_TYPE.GET,
    'getSearchColumns'
  );

  // 正常に取得できた場合検索カラムをlocalStorageに格納
  if (returnSearchColumnsApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
    const returned = returnSearchColumnsApiObject.body as searchColumnsFromApi;
    localStorage.setItem('cancer_type', JSON.stringify(returned.cancerTypes));
  }
};

/**
 * schemaのマージ
 * @param props
 */
const mergeSchemaItem = (props: {
  targetSchema: JSONSchema7;
  setSchema: JSONSchema7;
  formData: any;
}) => {
  let { targetSchema } = props;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { setSchema, formData } = props;

  const setRootItemNames = Object.keys(setSchema);
  setRootItemNames.forEach((itemName: string) => {
    const setValue = setSchema[itemName as keyof JSONSchema7Definition];
    // 上書きではなくマージ
    targetSchema = lodash.merge(targetSchema, { [itemName]: setValue });

    // 中身の解析
    if (targetSchema.properties && setSchema.properties) {
      const setItem = getPropItemsAndNames(setSchema);
      const targetItem = getPropItemsAndNames(targetSchema);
      setItem.pNames.forEach((pName: string) => {
        const pitem = setItem.pItems[pName] as JSONSchema7;
        const tItem = targetItem.pItems[pName] as JSONSchema7;

        if (targetItem.pNames.includes(pName)) {
          // enumのみマージではなく上書き
          if (pitem && pitem.enum && tItem && tItem.enum) {
            tItem.enum = pitem.enum;
          }

          // 置き換え後のpropertiesに対するif~then対応
          if (pitem.properties) {
            // フィールド内のif~Thenを入力値に合わせて書き換え
            targetItem.pItems[pName] = customSchemaIfThenElseOnField(
              pitem,
              formData[pName] ?? {}
            );
          }
        }

        // ユーザーが入力できない場合(readonly,jesgo:ui:hidden)はFormDataにdefaultを設定
        if (
          tItem[Const.EX_VOCABULARY.UI_HIDDEN] === true ||
          tItem.readOnly === true
        ) {
          const value = tItem.default;
          if (typeof value === 'boolean' || value) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            formData[pName] = value;
          }
        }
      });
    }
  });
};

/**
 * Schemaの書き換え
 * - refをdefの内容に置き換え
 * - oneOfで複数Typeの指定がある場合、type:stringに置き換え
 * */
export const transferSchemaItem = (
  schema: JSONSchema7,
  item: JSONSchema7,
  itemNames: string[]
) => {
  let result = lodash.cloneDeep(item);
  const itemType = getSchemaType(item);
  itemNames.forEach((iName: string) => {
    if (iName === Const.JSONSchema7Keys.PROP) {
      // さらに中の塊を再解析
      const targetSchema = getPropItemsAndNames(result);
      targetSchema.pNames.forEach((name: string) => {
        const targetItem = targetSchema.pItems[name] as JSONSchema7;
        const targetName = getSchemaItemNames(targetItem);
        targetSchema.pItems[name] = transferSchemaItem(
          schema,
          targetItem,
          targetName
        );
      });
    } else if (
      itemType === Const.JSONSchema7Types.ARRAY &&
      iName === Const.JSONSchema7Keys.ITEMS
    ) {
      // itemsの中を再解析
      const targetSchema = result[iName] as JSONSchema7;
      const targetName = getSchemaItemNames(targetSchema);
      result[iName] = transferSchemaItem(schema, targetSchema, targetName);
    } else if (
      iName === Const.JSONSchema7Keys.IF ||
      iName === Const.JSONSchema7Keys.THEN ||
      iName === Const.JSONSchema7Keys.ELSE
    ) {
      // 1階層下を再解析
      const targetSchema = result[iName] as JSONSchema7;
      const targetName = getSchemaItemNames(targetSchema);
      result[iName] = transferSchemaItem(schema, targetSchema, targetName);
    } else if (itemType == null && iName === 'oneOf') {
      // oneOf、かつtypeなし
      const oneOfValue = result[iName];
      if (Array.isArray(oneOfValue)) {
        // Type:stringにしないとCustomWidgetが反映されない
        result.type = 'string';
        result[Const.EX_VOCABULARY.UI_LISTTYPE] = Const.JESGO_UI_LISTTYPE.COMBO;
      }
    } else if (iName === 'allOf') {
      const allOfItems = result.allOf;
      allOfItems?.forEach((allOfitem: JSONSchema7Definition, index: number) => {
        if (result.allOf) {
          allOfItems[index] = transferSchemaItem(
            schema,
            allOfitem as JSONSchema7,
            getSchemaItemNames(allOfitem as JSONSchema7)
          ) as JSONSchema7Definition;
        }
      });
      result.allOf = allOfItems;
    } else if (iName === Const.JSONSchema7Keys.REF) {
      let refValue = result[iName] ?? '';
      if (refValue.startsWith('#')) {
        // #は除去
        refValue = refValue.substring(1);
      }
      // defの内容に置き換え
      const defSchema = JSONPointer.get(schema, refValue) as JSONSchema7;
      // defの中を再解析
      result = transferSchemaItem(
        schema,
        defSchema,
        getSchemaItemNames(defSchema)
      );
    } else if (iName === '$comment') {
      // $commentのみのフィールドになるとエラーになるためあらかじめ除去
      delete result.$comment;
    } else if (iName === 'examples') {
      // 不要な選択肢が出るためあらかじめ除去
      delete result.examples;
    }
  });

  return result;
};

/**
 * if~then~elseの書き換え
 * @param allOfItem
 * @param schema
 * @param formData
 * @returns
 */
const customSchemaIfThenElse = (
  allOfItem: JSONSchema7,
  schema: JSONSchema7,
  formData: any
) => {
  // プロパティ探索のリミット
  const DEPTH_LIMIT = 10;

  const result = lodash.cloneDeep(schema);

  // if thenだけではなくif elseだけというパターンも想定しておく("$not"は未対応のため)
  if (!allOfItem.if || !(allOfItem.then || allOfItem.else)) {
    return result;
  }

  const rootSchemaItem = getPropItemsAndNames(result);
  const ifItem = getPropItemsAndNames(allOfItem.if as JSONSchema7);

  // 必要に応じて再帰的にcontainsの条件をチェック
  const checkRecursiveCondition = (contains: JSONSchema7, values: any[], depth: number): boolean => {
    if (contains.properties !== undefined) {
      // "item": { "type": "object", "properties": { ... } } の場合
      const containsItems = getPropItemsAndNames(contains);
      for (const pName of containsItems.pNames) {
        for (const item of values) {
          if (Object.prototype.toString.call(item) === '[object Object]') {
            if (item[pName] !== undefined) {
              return checkConditions(containsItems.pItems[pName] as JSONSchema7, item[pName], depth - 1)
            }
          }
        }
      }
      return false;
    } else {
      // "item": { "type": "string" } などの場合
      return checkConditions(contains, values, depth - 1);
    }
  };

  // サポートしている条件
  // const, enum, pattern, minimum, maximum, exclusiveMinimum, exclusiveMaximum: 値
  // contains, minItems, maxItems: アレイ
  const checkConditions = (conditonMaps: JSONSchema7, value: any, depth: number = DEPTH_LIMIT): boolean {
    if (depth < 0) {
      return false;
    }

    if (conditonMaps.contains !== undefined) {
      return Array.isArray(value) &&
        checkRecursiveCondition(conditonMaps.contains as JSONSchema7, value, depth - 1);
    } else if (conditonMaps.const !== undefined) {
      // 厳密な型判断は行わない(例：10.0 = 10、"1" = 1 は許容)
      return conditonMaps.const == value;
    } else if (conditonMaps.enum !== undefined) {
      return Array.isArray(conditonMaps.enum) && conditonMaps.enum.includes(value);
    } else if (conditonMaps.pattern !== undefined) {
      // パターンの正規表現にエラーがある場合はアンマッチ
      try {
        const pattern = new RegExp(conditonMaps.pattern);
        return (value ?? '').toString().match(pattern) !== null;
      } catch {
        return false;
      }
    } else if ( conditonMaps.minimum ?? conditonMaps.maximum ?? conditonMaps.exclusiveMinimum ?? conditonMaps.exclusiveMaximum ) {
      const numValue = Number(value);
      return !isNaN(numValue) &&
        (conditonMaps.minimum !== undefined ? numValue >= conditonMaps.minimum : true) &&
        (conditonMaps.maximum !== undefined ? numValue <= conditonMaps.maximum : true) &&
        (conditonMaps.exclusiveMinimum !== undefined ? numValue > conditonMaps.exclusiveMinimum : true) &&
        (conditonMaps.exclusiveMaximum !== undefined ? numValue < conditonMaps.exclusiveMaximum : true);
    } else if ( conditonMaps.minItems ?? conditonMaps.maxItems ) {
      return Array.isArray(value) &&
        (conditonMaps.minItems !== undefined ? value.length >= conditonMaps.minItems : true) &&
        (conditonMaps.maxItems !== undefined ? value.length <= conditonMaps.maxItems : true)
    }

    return false;
  };

  // if条件のプロパティ名のうち、スキーマの固定プロパティ名と一致するものについて条件チェックを行う
  const matchFlags = ifItem.pNames
    .filter(pName => rootSchemaItem.pNames.includes(pName))
    .map(pName => checkConditions(ifItem.pItems[pName] as JSONSchema7, formData[pName]));
  
  // 完全マッチのみthen
  if (!matchFlags.includes(false) && allOfItem.then) {
    mergeSchemaItem({ targetSchema: result, setSchema: allOfItem.then as JSONSchema7, formData });
  } else if (allOfItem.else) {
    mergeSchemaItem({ targetSchema: result, setSchema: allOfItem.else as JSONSchema7, formData });
  }
  return result;
};

/**
 * フィールド内のif~Then~elseの置き換え
 * @param schema
 * @param formData
 * @returns
 */
const customSchemaIfThenElseOnField = (schema: JSONSchema7, formData: any) => {
  let result = lodash.cloneDeep(schema);
  const itemNames = getSchemaItemNames(result);
  itemNames.forEach((name: string) => {
    // ifの対処
    if (name === Const.JSONSchema7Keys.IF) {
      result = customSchemaIfThenElse(result, result, formData ?? {});
    } else if (name === 'allOf') {
      // allOfの対処
      const allOfItemArray = result[name] as JSONSchema7[];
      allOfItemArray.forEach((allOfItem: JSONSchema7) => {
        result = customSchemaIfThenElse(allOfItem, result, formData ?? {});
      });
    } else if (name === Const.JSONSchema7Keys.PROP) {
      const targetSchema = getPropItemsAndNames(result);
      targetSchema.pNames.forEach((iname: string) => {
        const targetItem = targetSchema.pItems[iname] as JSONSchema7;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        targetSchema.pItems[iname] = customSchemaIfThenElseOnField(
          targetItem,
          formData ? formData[iname] ?? {} : {}
        );
      });
    }
  });
  return result;
};

export const transferSchemaMaps = (
  rootSchema: JSONSchema7,
  targetItems: { [key: string]: JSONSchema7Definition }
) => {
  const result = lodash.cloneDeep(targetItems);

  const defsNames = getSchemaItemNames(result); // TNM,pTMN,T…
  defsNames.forEach((name: string) => {
    const item = result[name] as JSONSchema7;
    const itemNames = getSchemaItemNames(item);
    result[name] = transferSchemaItem(rootSchema, item, itemNames);
  });
  return result;
};

/**
 * データの種類からJSONSchemaを生成
 * @param val
 * @returns
 */
const GetSchemaFromPropItem = (val: any, isArrayOfItem: boolean) => {
  const schemaObj: JSONSchema7 = { type: 'string' };

  // formDataの入力値の型からtype決定
  if (typeof val === 'number') {
    // 数値
    schemaObj.type = 'number';
  } else if (typeof val === 'boolean') {
    // boolean
    schemaObj.type = 'boolean';
  } else if (Array.isArray(val)) {
    // 配列
    schemaObj.type = 'array';

    const objVals = val.filter((p) => p !== null && typeof p === 'object');
    if (objVals.length > 0) {
      // 配列の中身がオブジェクトの場合はプロパティをマージしてすべての値が表示されるようにする
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const unionVal = lodash.merge({}, ...(objVals as Object[]));

      schemaObj.items = GetSchemaFromPropItem(unionVal, true);
      // inline(横並び)で展開する
      schemaObj.items[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE] = 'inline';
    } else if (val.length > 0) {
      // オブジェクト以外
      schemaObj.items = GetSchemaFromPropItem(val[0], true);
    } else {
      schemaObj.items = { type: 'string' };
    }
  } else if (val !== null && typeof val === 'object') {
    // オブジェクト
    schemaObj.type = 'object';
    schemaObj.properties = {};
    Object.entries(val).forEach((entryItem) => {
      if (isNotEmptyObject(entryItem[1])) {
        schemaObj.properties![entryItem[0]] = GetSchemaFromPropItem(
          entryItem[1],
          false
        );
      }
    });
  }

  // フォームデータから生成したスキーマは編集不可とする
  schemaObj.readOnly = true;
  if (!isArrayOfItem) {
    schemaObj[Const.EX_VOCABULARY.NOT_EXIST_PROP] = true;
  }

  return schemaObj;
};

/**
 * スキーマに未定義でformDataにある項目をスキーマに追加
 * @param schema
 * @param formData
 * @returns
 */
const customSchemaAppendFormDataProperty = (
  schema: JSONSchema7,
  formData: any
) => {
  const copySchema = lodash.cloneDeep(schema);

  if (
    copySchema &&
    copySchema.properties &&
    formData &&
    Object.keys(formData).length > 0
  ) {
    // formDataにしかない項目一覧取得
    const formKeys = lodash.difference(
      Object.keys(formData),
      Object.keys(copySchema.properties)
    );

    Object.entries(formData).forEach((item) => {
      const propName = item[0];
      const propValue = item[1];

      if (!formKeys.includes(propName)) {
        // formDataにあるプロパティがスキーマにある場合は基本的に何もしないが
        // 値がオブジェクトの場合は中身も見る
        if (!Array.isArray(propValue) && typeof propValue === 'object') {
          if (copySchema.properties) {
            const propSchema = copySchema.properties[propName];
            if (propSchema) {
              // 子項目に対して再帰
              const newSchema = customSchemaAppendFormDataProperty(
                propSchema as JSONSchema7,
                propValue
              );
              // 元スキーマのプロパティに追加
              copySchema.properties[propName] = newSchema;
            }
          }
        } else if (Array.isArray(propValue)) {
          const objVals = propValue.filter((p) => p !== null && typeof p === 'object');
          // 配列の中身がオブジェクトの場合は中身も見る
          if (objVals.length > 0) {
            if (copySchema.properties) {
              const propSchema = copySchema.properties[propName] as JSONSchema7;
              if (propSchema) {
                const itemsSchema = propSchema.items as JSONSchema7;
                if (itemsSchema) {
                  const unionVal = lodash.merge({}, ...(objVals as object[]));
                  // formDataにしかない項目一覧取得
                  const diffKeys = lodash.difference(
                    Object.keys(unionVal),
                    Object.keys(itemsSchema)
                  );

                  if (diffKeys.length > 0) {
                    // 子項目に対して再帰
                    const newSchema = customSchemaAppendFormDataProperty(
                      itemsSchema,
                      unionVal
                    );

                    // 配列の中身が全てスキーマ未定義の場合は配列自体を編集不可に
                    if (itemsSchema.properties && Object.keys(itemsSchema.properties).length === 0) {
                      (copySchema.properties[propName] as JSONSchema7).readOnly = true;
                      (copySchema.properties[propName] as JSONSchema7)[Const.EX_VOCABULARY.NOT_EXIST_PROP] = true;
                    }

                    // 元スキーマのプロパティに追加
                    (copySchema.properties[propName] as JSONSchema7).items = newSchema;
                  }
                }
              }
            }
          }
        }
      } else {
        // 空オブジェクトは除外
        if (
          !Array.isArray(propValue) &&
          typeof propValue === 'object' &&
          !isNotEmptyObject(propValue)
        ) {
          return;
        }

        // jesgo:errorの場合は除外
        if (propName === Const.EX_VOCABULARY.JESGO_ERROR) {
          return;
        }

        // nullの場合も除外
        if (propValue == null) {
          return;
        }

        // formDataのプロパティからスキーマ生成
        const schemaObj = GetSchemaFromPropItem(propValue, false);
        // 元スキーマのプロパティに追加
        copySchema.properties![propName] = schemaObj;
      }
    });
  }

  return copySchema;
};

/**
 * Schemaの書き換え（customSchemaAppendFormDataPropertyを実行しない版）
 * 条件変更検出用
 * @param props
 * @returns
 */
export const CustomSchemaWithoutAppend = (props: {
  orgSchema: JSONSchema7;
  formData: any;
}) => {
  const { orgSchema, formData } = props; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

  // schemaの編集
  let schema = lodash.cloneDeep(orgSchema);
  if (schema == null) return schema;

  // refがあれば$defsの内容に全て置き換え
  const defItems = schema.$defs;
  if (defItems) {
    // まずは$def内のrefを全て置き換える
    schema.$defs = transferSchemaMaps(schema, defItems);
  }

  // それ以外のrefを置き換える
  // TODO 他直下のプロパティを使うなら追記必要。
  // TODO if,then,elseはどうするか。直接のif~then~elseを許すなら必要。
  const targetNames = getSchemaItemNames(schema);
  schema = transferSchemaItem(schema, schema, targetNames);

  // フィールド内のif~Thenを入力値に合わせて書き換え
  if (schema.properties) {
    schema = customSchemaIfThenElseOnField(schema, formData);
  } else {
    // propertiesの宣言がないとエラーになるため、空のpropertiesを追加
    schema.properties = {};
  }

  // allOf
  // 入力値に合わせてスキーマの書き換え
  if (schema.allOf) {
    const allOfItemArray = schema.allOf as JSONSchema7[];
    allOfItemArray.forEach((allOfItem: JSONSchema7) => {
      schema = customSchemaIfThenElse(allOfItem, schema, formData);
    });
  }

  // customSchemaAppendFormDataPropertyは実行しない

  return schema;
};

/**
 * Schemaの書き換え
 * @param props
 * @returns
 */
export const CustomSchema = (props: {
  orgSchema: JSONSchema7;
  formData: any;
}) => {
  const { orgSchema, formData } = props; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

  // customSchemaAppendFormDataPropertyを実行しない版でスキーマを生成
  let schema = CustomSchemaWithoutAppend({ orgSchema, formData });

  // formDataにしかない項目を表示するため、スキーマ書き換え(途中でスキーマ変わった場合の対策)
  schema = customSchemaAppendFormDataProperty(schema, formData);

  return schema;
};

/**
 * スキーマから特定のキーと値を持つプロパティ名を取得
 * @param customSchema 書き換え済みスキーマ
 * @param searchPropName 検索するプロパティ(キー)名
 * @param searchValueName 検索する値
 * @returns
 */
export const getJesgoSchemaPropValue = (
  customSchema: JSONSchema7,
  searchPropName: string,
  searchValueName: string
) => {
  const propList = getPropItemsAndNames(customSchema);

  type Obj = {
    [prop: string]: any;
  };

  let retPropName = '';

  // eslint-disable-next-line no-restricted-syntax
  for (const propName of propList.pNames) {
    const pItem = propList.pItems[propName] as JSONSchema7;
    if ((pItem as Obj)[searchPropName] === searchValueName) {
      if (searchPropName === 'jesgo:set' && searchValueName === 'eventdate') {
        // eventdateが対象の場合は日付フォーマット指定が必要
        if (pItem.type === 'string' && pItem.format === 'date') {
          retPropName = propName;
          break;
        }
      } else {
        retPropName = propName;
        break;
      }
    }
  }

  // 見つからない場合、objectの項目を再帰で検索する
  if (!retPropName) {
    Object.entries(propList.pItems)
      .filter((p) => (p[1] as JSONSchema7).type === 'object')
      .some((item) => {
        const schema = item[1] as JSONSchema7;
        retPropName = getJesgoSchemaPropValue(
          schema,
          searchPropName,
          searchValueName
        );
        return !!retPropName;
      });
  }

  return retPropName;
};
