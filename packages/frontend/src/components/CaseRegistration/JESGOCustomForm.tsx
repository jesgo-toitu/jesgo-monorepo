/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import lodash from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Form, { FormProps, IChangeEvent } from '@rjsf/core';
import { Dispatch } from 'redux';
import { JSONSchema7 } from 'webpack/node_modules/schema-utils/declarations/ValidationError';
import { JSONSchema7Definition } from 'json-schema'; // eslint-disable-line import/no-unresolved
import JSONPointer from 'jsonpointer';
import { JESGOFiledTemplete } from './JESGOFieldTemplete';
import { JESGOComp } from './JESGOComponent';
import store from '../../store';
import {
  AddJesgoError,
  GetVersionedFormData,
  isNotEmptyObject,
} from '../../common/CaseRegistrationUtility';
import { RegistrationErrors } from './Definition';
import { CreateUISchema } from './UISchemaUtility';
import {
  CustomSchema,
  CustomSchemaWithoutAppend,
  GetSchemaIdFromString,
  GetSchemaInfo,
  getPropItemsAndNames,
} from './SchemaUtility';
import {
  checkEventDateInfinityLoop,
  getEventDate,
} from '../../common/DBUtility';
import { dispSchemaIdAndDocumentIdDefine } from '../../store/formDataReducer';
import { Const } from '../../common/Const';

interface CustomDivFormProp extends FormProps<any> {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  schemaId: number;
  dispatch: Dispatch;
  setFormData: React.Dispatch<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  documentId: string;
  isTabItem: boolean;
  dispSchemaIds: dispSchemaIdAndDocumentIdDefine[];
  setDispSchemaIds: React.Dispatch<
    React.SetStateAction<dispSchemaIdAndDocumentIdDefine[]>
  >;
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>;
  parentEventDate: string | null;
}

// カスタムフォーム
// - <Form></Form>ではなく<div></div>で返す
// - submitボタンは非表示
// - 配列Widgetのボタン調整
// - onChangeでuseStateで保持しているformDataを更新する
const CustomDivForm = (props: CustomDivFormProp) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { schemaId, dispatch, setFormData, documentId, isTabItem, setErrors, parentEventDate } =
    props;
  let { formData, schema } = props;

  const copyProps = { ...props };

  const saveData = store.getState().formDataReducer.saveData;
  const thisDocument = saveData.jesgo_document.find(
    (p) => p.key === documentId
  );
  if (thisDocument) {
    formData = thisDocument.value.document;
  }

  const schemaData = store
    .getState()
    .schemaDataReducer.schemaDatas.get(schemaId);
  // 無限ループチェック
  const loopCheck = useMemo(
    () => checkEventDateInfinityLoop(formData, schemaData),
    [formData, schemaData]
  );
  // eventdateの初期値設定
  let initEventDate = '';
  if (thisDocument) {
    initEventDate = getEventDate(thisDocument, formData);
  }

  const [eventDate, setEventDate] = useState<string>(initEventDate);

  // 親のeventDateが変更されたらeventDateを更新
  useEffect(() => {
    if (thisDocument) {
      const newEventDate = getEventDate(thisDocument, formData);
      setEventDate(newEventDate);
    }
  }, [parentEventDate]);

  // 前回のformDataを保持するためのref（継承直後、データ入力判定を動かすために使用）
  const previousFormDataForSetFormDataRef = useRef<any>(null);

  // 継承直後、データ入力判定を動かすためにsetFormDataする
  useEffect(() => {
    const previousFormDataStr = previousFormDataForSetFormDataRef.current
      ? JSON.stringify(previousFormDataForSetFormDataRef.current)
      : null;
    const currentFormDataStr = JSON.stringify(formData);
    
    if (previousFormDataStr !== currentFormDataStr) {
      previousFormDataForSetFormDataRef.current = formData;
      setFormData(formData);
    }
  }, [formData, setFormData]);

  copyProps.formData = formData;

  // 前回のスキーマのプロパティキーを保持するためのref
  const previousSchemaKeysRef = useRef<string[]>([]);
  // 前回のformDataを保持するためのref（条件変更検出用）
  const previousFormDataRef = useRef<any>({});
  // 元のスキーマ（customSchemaAppendFormDataProperty実行前）を保持するためのref
  const orgSchemaRef = useRef<JSONSchema7 | null>(null);

  // eventdate不整合の場合、現在日時点で有効な最新スキーマを適応する
  let orgSchemaForClear: JSONSchema7 | null = null;
  if (loopCheck.isNotLoop && loopCheck.finalizedSchema) {
    // ループ検証時にスキーマが取得できていればそちらを採用
    orgSchemaForClear = loopCheck.finalizedSchema.document_schema;
    schema = CustomSchema({
      orgSchema: loopCheck.finalizedSchema.document_schema,
      formData,
    });
  } else if (!loopCheck.isNotLoop) {
    const newSchema = GetSchemaInfo(schemaId, null, true);
    if (newSchema) {
      orgSchemaForClear = newSchema.document_schema;
      schema = CustomSchema({ orgSchema: newSchema.document_schema, formData });
    }
  } else {
    // propsから渡されたスキーマがある場合は、GetSchemaInfoで元のスキーマを取得
    const newSchema = GetSchemaInfo(schemaId, eventDate);
    if (newSchema) {
      orgSchemaForClear = newSchema.document_schema;
    }
  }
  
  // 元のスキーマを保持
  if (orgSchemaForClear) {
    orgSchemaRef.current = orgSchemaForClear;
  }

  // validationエラーの取得
  let errors = store.getState().formDataReducer.extraErrors;
  if (errors) {
    const targetErrors = errors.find(
      (x: RegistrationErrors) => x.documentId === documentId
    );
    // エラーがある場合はエラー情報を埋め込んだスキーマに置き換える
    if (targetErrors) {
      // プロパティは現在のスキーマに置き換える
      targetErrors.validationResult.schema.properties = schema.properties;
      schema = targetErrors.validationResult.schema;
    }
  }

  // プラグインにて付与されたjesgo:errorがformDataにあればエラーとして表示する

  const oldErrorsJSON = JSON.stringify(errors);
  errors = AddJesgoError(
    errors,
    formData,
    documentId,
    schemaId,
    schema,
    thisDocument?.value.deleted
  );

  // 前後で変更がある場合にエラーをセットして画面更新
  if (oldErrorsJSON !== JSON.stringify(errors)) {
    setErrors([...errors]);
    dispatch({ type: 'SET_ERROR', extraErrors: errors });
  }

  // 継承直後、データ入力判定を動かすためにsetFormDataする
  if (JSON.stringify(copyProps.formData) !== JSON.stringify(formData)) {
    setFormData(formData);
  }

  copyProps.formData = formData;

  // uiSchema作成
  const uiSchema = CreateUISchema(schema, formData);
  if (isTabItem) {
    uiSchema['ui:ObjectFieldTemplate'] =
      JESGOFiledTemplete.TabItemFieldTemplate;
  }

  // 必須項目に入力があれば赤枠のスタイル解除
  if (schema.required && schema.required.length > 0) {
    Object.entries(uiSchema)
      .filter((p) => schema.required?.includes(p[0]))
      .forEach((item) => {
        const propName = item[0];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const classNames = item[1].classNames as string;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (classNames && isNotEmptyObject(formData[propName])) {
          // classNamesからrequired-itemを除外して赤枠を解除
          const schemaItem = uiSchema[propName];
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          schemaItem.classNames = classNames
            .replace(/required-item/g, '')
            .trim();

          // itemsもあればそちらも解除する
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (schemaItem.items) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            schemaItem.items.classNames = schemaItem.items.classNames
              .replace(/required-item/g, '')
              .trim();
          }
        }
      });
  }

  // 描画の段階でstore側にフォームデータを保存しておく
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  dispatch({
    type: 'INPUT',
    schemaId,
    formData,
    documentId,
    isUpdateInput: false,
  });

  dispatch({ type: 'EVENT_DATE', eventDate, documentId });

  copyProps.schema = schema;

  // 初回onChangeフラグ
  const [isFirstOnChange, setIsFirstOnChange] = useState<boolean>(true);
  // 初回描画済みフラグ
  const [isFirstRederComplited, setIsFirstRederComplited] =
    useState<boolean>(false);

  useEffect(() => {
    // 初回描画済みフラグを立てる
    setIsFirstRederComplited(true);
  }, []);

  /**
   * formDataからスキーマに存在しない項目を削除する
   * @param argFormData
   * @param argSchema
   * @returns
   */
  const deleteNotExistProp = (argFormData: any, argSchema: JSONSchema7) => {
    if (!argSchema) {
      return;
    }
    Object.entries(argSchema).forEach((item) => {
      const propName = item[0];
      const schemaInfo = item[1] as JSONSchema7;
      if (schemaInfo) {
        // スキーマに存在しない項目のみに適応する
        if (schemaInfo[Const.EX_VOCABULARY.NOT_EXIST_PROP]) {
          // array
          if (Array.isArray(argFormData[propName])) {
            // 削除されたarrayの項目を取り除く
            const arrayFormData = argFormData[propName] as any[];
            if (arrayFormData.filter((val) => val !== null && typeof val === "object").length > 0) {
              // Arrayのitemsが複数
              const newArrayFormData: any[] = [];
              arrayFormData.map((formDatas: { [key: string]: any }) => {
                const newFormDatas = { ...formDatas };
                Object.entries(newFormDatas).forEach((data) => {
                  const dataProp = data[0];
                  const dataValue = data[1];
                  if (dataValue == null) {
                    delete newFormDatas[dataProp];
                  }
                })
                if (newFormDatas != null && typeof newFormDatas === 'object' && Object.keys(newFormDatas).length > 0) {
                  newArrayFormData.push(newFormDatas);
                }
              })

              if (newArrayFormData.length > 0) {
                argFormData[propName] = [...newArrayFormData];
              } else {
                // 表示内容が0の場合はプロパティごと削除する
                delete argFormData[propName];
              }

            } else {
              // Arrayのitemsが1つ
              const newArray = (arrayFormData).filter(
                (p) => p != null && p !== ''
              );
              if (newArray.length > 0) {
                argFormData[propName] = newArray;
              } else {
                // 表示内容が0の場合はプロパティごと削除する
                delete argFormData[propName];
              }
            }
          } else if (
            ((argSchema as any)[propName] as JSONSchema7)?.properties
          ) {
            // objectの場合は中身を削除
            deleteNotExistProp(
              argFormData[propName],
              (argSchema as any)[propName].properties as JSONSchema7
            );

            // 削除した結果、表示内容が1つもなくなればプロパティごと削除する
            if (Object.entries(argFormData[propName]).length === 0) {
              delete argFormData[propName];
            }
          } else if (
            argFormData[propName] === '' ||
            argFormData[propName] == null
          ) {
            delete argFormData[propName];
          }
        }
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, arrow-body-style
  const calculeteItemValue = (argSchema: JSONSchema7, data: any, calculationType: string, calculationTag: string) : (number | undefined)[] => {
    return argSchema.properties ?
      Object.entries(argSchema.properties).flatMap((p) => {
        const propName = p[0];
        const tmpSchema = p[1] as JSONSchema7;
        const calcTag = tmpSchema.calculationTag;
        // eslint-disable-next-line no-nested-ternary
        return JSON.stringify(tmpSchema).includes('"properties"') ?
          calculeteItemValue(tmpSchema, data[propName], calculationType, calculationTag) :
            !tmpSchema.calculationType
            && calcTag === calculationTag
            && data[propName] != null
            && !Number.isNaN(data[propName]) ? data[propName] as number : [];
      }) : [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateItem = (argSchema: JSONSchema7, data: any, calculationType: string, calculationTag: string) => {
    const itemValues = calculeteItemValue(argSchema, data, calculationType, calculationTag) as number[];
    switch (calculationType) {
      case 'sum':
        return itemValues.length > 0 ? itemValues.reduce((a, b) => a + b) : undefined;
      default:
        return undefined;
    }
  }

  /**
   * allOf項目のif条件が満たされているかをチェックする
   * @param allOfItem allOf項目
   * @param formData フォームデータ
   * @returns 条件が満たされているか
   */
  const checkIfCondition = (allOfItem: JSONSchema7, formData: any): boolean => {
    if (!allOfItem.if) {
      return false;
    }
    
    const ifSchema = allOfItem.if as JSONSchema7;
    if (!ifSchema.properties) {
      return false;
    }
    
    const ifProperties = Object.keys(ifSchema.properties);
    if (ifProperties.length === 0) {
      return false;
    }
    
    // すべてのif条件が満たされているかチェック
    const matchFlgs: boolean[] = [];
    ifProperties.forEach((pName: string) => {
      const condSchema = ifSchema.properties![pName] as JSONSchema7;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const selectValue = formData[pName]; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      const conditionValues = [];
      let conditionPattern: RegExp | undefined;
      
      if (condSchema.const !== undefined) {
        conditionValues.push(condSchema.const);
      } else if (condSchema.enum) {
        conditionValues.push(...(condSchema.enum as any[]));
      } else if (condSchema.pattern) {
        conditionPattern = new RegExp(condSchema.pattern);
      }
      
      let matchFlg = false;
      if (conditionPattern) {
        const value = (selectValue as string) ?? '';
        matchFlg = value.match(conditionPattern) !== null;
      } else if (conditionValues.length > 0) {
        matchFlg = conditionValues.includes(selectValue);
      }
      
      matchFlgs.push(matchFlg);
    });
    
    return !matchFlgs.includes(false);
  };
  
  /**
   * visibleWhenの条件を評価する
   * @param visibleWhenSchema visibleWhenのスキーマ
   * @param formData フォームデータ
   * @returns 条件を満たす場合はtrue
   */
  const checkVisibleWhenCondition = (
    visibleWhenSchema: JSONSchema7,
    formData: any
  ): boolean => {
    if (!visibleWhenSchema || !formData) {
      return false;
    }
    
    // visibleWhenの条件は、JSON Pointer形式で指定されたプロパティの値と比較される
    // 例: { "#/治療情報": { "enum": ["全骨盤照射", "遠隔転移"] } }
    const visibleWhenProps = getPropItemsAndNames(visibleWhenSchema);
    const matchFlgs: boolean[] = [];
    
    visibleWhenProps.pNames.forEach((propPath: string) => {
      // JSON Pointer形式（例: "#/治療情報"）からプロパティ名を取得
      let propName = propPath;
      if (propPath.startsWith('#/')) {
        propName = propPath.substring(2);
      } else if (propPath.startsWith('/')) {
        propName = propPath.substring(1);
      }
      
      const conditionSchema = visibleWhenProps.pItems[propPath] as JSONSchema7;
      const actualValue = formData[propName];
      
      let matchFlg = false;
      
      if (conditionSchema.const !== undefined) {
        matchFlg = actualValue === conditionSchema.const;
      } else if (conditionSchema.enum) {
        matchFlg = (conditionSchema.enum as any[]).includes(actualValue);
      } else if (conditionSchema.pattern) {
        const pattern = new RegExp(conditionSchema.pattern);
        matchFlg = typeof actualValue === 'string' && pattern.test(actualValue);
      }
      
      matchFlgs.push(matchFlg);
    });
    
    // すべての条件を満たす場合はtrue
    return !matchFlgs.includes(false);
  };
  
  /**
   * visibleWhenで非表示になった項目の値をクリアする
   * @param argFormData フォームデータ
   * @param schema スキーマ
   */
  const clearVisibleWhenProperties = (
    argFormData: any,
    schema: JSONSchema7 | undefined
  ) => {
    if (!schema || !argFormData || typeof argFormData !== 'object' || Array.isArray(argFormData)) {
      return;
    }
    
    const properties = schema.properties || {};
    
    Object.keys(properties).forEach((key) => {
      const propSchema = properties[key] as JSONSchema7;
      const visibleWhenSchema = propSchema[Const.EX_VOCABULARY.UI_VISIBLE_WHEN] as JSONSchema7;
      
      if (visibleWhenSchema) {
        // visibleWhenの条件を評価
        const conditionMet = checkVisibleWhenCondition(visibleWhenSchema, argFormData);
        
        if (!conditionMet && argFormData[key] !== undefined) {
          // 条件を満たさない場合は値をクリア
          delete argFormData[key];
        } else if (conditionMet && argFormData[key] && typeof argFormData[key] === 'object' && !Array.isArray(argFormData[key])) {
          // 条件を満たす場合でも、ネストされたオブジェクトの場合は再帰的に処理
          const nestedPropSchema = propSchema;
          clearVisibleWhenProperties(argFormData[key], nestedPropSchema);
        } else if (conditionMet && Array.isArray(argFormData[key])) {
          // 配列の場合は各要素に対して再帰的に処理
          const itemsSchema = propSchema.items as JSONSchema7;
          if (itemsSchema) {
            (argFormData[key] as any[]).forEach((item: any) => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                clearVisibleWhenProperties(item, itemsSchema);
              }
            });
          }
        }
      } else if (argFormData[key] && typeof argFormData[key] === 'object' && !Array.isArray(argFormData[key])) {
        // visibleWhenがない場合でも、ネストされたオブジェクトの場合は再帰的に処理
        clearVisibleWhenProperties(argFormData[key], propSchema);
      } else if (Array.isArray(argFormData[key])) {
        // 配列の場合は各要素に対して再帰的に処理
        const itemsSchema = propSchema.items as JSONSchema7;
        if (itemsSchema) {
          (argFormData[key] as any[]).forEach((item: any) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              clearVisibleWhenProperties(item, itemsSchema);
            }
          });
        }
      }
    });
  };
  
  /**
   * ネストされたオブジェクト内のプロパティを再帰的にクリアする
   * @param argFormData フォームデータ
   * @param previousSchema 前回のスキーマ（CustomSchemaWithoutAppendで処理済み）
   * @param currentSchema 現在のスキーマ（CustomSchemaWithoutAppendで処理済み）
   * @param orgPropertySchema 元のスキーマのプロパティ定義（base schema判定用、$refが解決されていない可能性あり）
   * @param rootOrgSchema ルートの元のスキーマ（$ref解決用）
   */
  const clearNestedProperties = (
    argFormData: any,
    previousSchema: JSONSchema7 | undefined,
    currentSchema: JSONSchema7 | undefined,
    orgPropertySchema: JSONSchema7 | undefined,
    rootOrgSchema: JSONSchema7
  ) => {
    if (!previousSchema || !currentSchema || !argFormData) {
      return;
    }
    
    // 配列の場合は各要素に対して再帰的に処理
    if (Array.isArray(argFormData)) {
      const previousItemsSchema = previousSchema.items as JSONSchema7;
      const currentItemsSchema = currentSchema.items as JSONSchema7;
      const orgItemsSchema = orgPropertySchema?.items as JSONSchema7;
      
      if (previousItemsSchema && currentItemsSchema) {
        argFormData.forEach((item: any, index: number) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            clearNestedProperties(
              item,
              previousItemsSchema,
              currentItemsSchema,
              orgItemsSchema,
              rootOrgSchema
            );
          }
        });
      }
      return;
    }
    
    if (typeof argFormData !== 'object') {
      return;
    }

    const previousProperties = previousSchema.properties || {};
    const currentProperties = currentSchema.properties || {};
    
    // orgPropertySchemaを解決して、base schemaのプロパティを取得（$refの場合は解決）
    // previousSchemaとcurrentSchemaは既にCustomSchemaWithoutAppendで処理されているため、
    // if-then-else条件が適用されている。したがって、これらを比較するだけでよい。
    // orgPropertySchemaは、base schemaのプロパティを判定するためにのみ使用する。
    let orgPropertySchemaResolved: JSONSchema7 | undefined;
    let orgPropertiesResolved: { [key: string]: JSONSchema7Definition } = {};
    
    if (orgPropertySchema) {
      if (orgPropertySchema.$ref) {
        // $refの場合は解決
        let refValue = orgPropertySchema.$ref;
        if (refValue.startsWith('#')) {
          refValue = refValue.substring(1);
        }
        const defSchema = JSONPointer.get(rootOrgSchema, refValue) as JSONSchema7;
        if (defSchema) {
          // 解決されたスキーマのpropertiesを取得（base schema判定用）
          if (defSchema.properties) {
            orgPropertiesResolved = defSchema.properties;
          }
          // orgPropertySchemaResolvedとしてdefSchemaを使用
          orgPropertySchemaResolved = defSchema;
        }
      } else {
        orgPropertySchemaResolved = orgPropertySchema;
        if (orgPropertySchema.properties) {
          orgPropertiesResolved = orgPropertySchema.properties;
        }
      }
    }

    // 前回のスキーマに存在していたが、現在のスキーマに存在しないプロパティを削除
    Object.keys(previousProperties).forEach((key) => {
      // base schemaのプロパティは削除しないが、ネストされたオブジェクトの場合は再帰的に処理
      const isBaseProperty = orgPropertiesResolved[key] !== undefined;
      
      // ネストされたオブジェクトの場合は再帰的に処理
      const previousPropSchema = previousProperties[key] as JSONSchema7;
      const currentPropSchema = currentProperties[key] as JSONSchema7;
      
      // orgPropSchemaを取得（base schemaのプロパティの場合はorgPropertiesResolvedから、そうでない場合はorgPropertySchemaResolvedから）
      let orgPropSchema: JSONSchema7 | undefined;
      if (isBaseProperty) {
        const orgPropSchemaDef = orgPropertiesResolved[key];
        orgPropSchema = typeof orgPropSchemaDef === 'object' && orgPropSchemaDef !== null ? orgPropSchemaDef as JSONSchema7 : undefined;
      } else {
        orgPropSchema = orgPropertySchemaResolved;
      }
      
      // orgPropSchemaが$refの場合は解決
      if (orgPropSchema && orgPropSchema.$ref) {
        let refValue = orgPropSchema.$ref;
        if (refValue.startsWith('#')) {
          refValue = refValue.substring(1);
        }
        const defSchema = JSONPointer.get(rootOrgSchema, refValue) as JSONSchema7;
        if (defSchema) {
          orgPropSchema = defSchema;
        }
      }
      
      if (previousPropSchema && currentPropSchema && argFormData[key]) {
        if (Array.isArray(argFormData[key])) {
          // 配列の場合は各要素に対して再帰的に処理
          const previousItemsSchema = previousPropSchema.items as JSONSchema7;
          const currentItemsSchema = currentPropSchema.items as JSONSchema7;
          const orgItemsSchema = orgPropSchema?.items as JSONSchema7;
          
          if (previousItemsSchema && currentItemsSchema) {
            (argFormData[key] as any[]).forEach((item: any) => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                clearNestedProperties(
                  item,
                  previousItemsSchema,
                  currentItemsSchema,
                  orgItemsSchema,
                  rootOrgSchema
                );
                // visibleWhenで非表示になった項目の値をクリア
                clearVisibleWhenProperties(item, currentItemsSchema);
              }
            });
          }
        } else if (typeof argFormData[key] === 'object') {
          // ネストされたオブジェクトの場合は再帰的に処理
          clearNestedProperties(
            argFormData[key],
            previousPropSchema,
            currentPropSchema,
            orgPropSchema,
            rootOrgSchema
          );
          // visibleWhenで非表示になった項目の値をクリア
          clearVisibleWhenProperties(argFormData[key], currentPropSchema);
        }
      }
      
      // base schemaのプロパティは削除しない
      if (isBaseProperty) {
        return;
      }

      // 現在のスキーマに存在しない場合は削除対象
      if (!currentProperties[key]) {
        if (argFormData[key] !== undefined) {
          delete argFormData[key];
        }
      }
    });
  };

  /**
   * 条件変更により表示されなくなった項目の値をクリアする
   * @param argFormData フォームデータ
   * @param orgSchema 元のスキーマ（customSchemaAppendFormDataProperty実行前）
   * @param previousFormData 前回のフォームデータ
   * @returns
   */
  const clearHiddenProperties = (
    argFormData: any,
    orgSchema: JSONSchema7,
    previousFormData: any
  ) => {
    if (!orgSchema || !previousFormData) {
      return;
    }

    // 前回のformDataから、customSchemaAppendFormDataProperty実行前のスキーマを計算
    const previousSchema = CustomSchemaWithoutAppend({ orgSchema, formData: previousFormData });
    
    // 現在のformDataから、customSchemaAppendFormDataProperty実行前のスキーマを計算
    const currentSchema = CustomSchemaWithoutAppend({ orgSchema, formData: argFormData });
    
    // base schemaのプロパティを取得（除外用）
    const basePropertyKeys = new Set<string>();
    if (orgSchema.properties) {
      Object.keys(orgSchema.properties).forEach((key) => {
        basePropertyKeys.add(key);
      });
    }
    
    // 前回のスキーマに存在していたプロパティの集合を取得
    const previousSchemaPropertyKeys = new Set<string>();
    if (previousSchema && previousSchema.properties) {
      Object.keys(previousSchema.properties).forEach((key) => {
        previousSchemaPropertyKeys.add(key);
      });
    }
    
    // 現在のスキーマに存在するプロパティの集合を取得
    const currentSchemaPropertyKeys = new Set<string>();
    if (currentSchema && currentSchema.properties) {
      Object.keys(currentSchema.properties).forEach((key) => {
        currentSchemaPropertyKeys.add(key);
      });
    }
    
    // 削除すべきプロパティを特定
    // 前回のスキーマに存在していたが、現在のスキーマに存在しないプロパティを削除
    const keysToRemove = new Set<string>();
    
    previousSchemaPropertyKeys.forEach((key) => {
      // base schemaのプロパティは削除しない
      if (basePropertyKeys.has(key)) {
        // base schemaのプロパティでも、ネストされたオブジェクトの場合は再帰的に処理
        const previousPropSchema = previousSchema?.properties?.[key] as JSONSchema7;
        const currentPropSchema = currentSchema?.properties?.[key] as JSONSchema7;
        const orgPropSchemaDef = orgSchema.properties?.[key];
        const orgPropSchema = typeof orgPropSchemaDef === 'object' && orgPropSchemaDef !== null ? orgPropSchemaDef as JSONSchema7 : undefined;
        
        if (previousPropSchema && currentPropSchema && orgPropSchema && argFormData[key]) {
          if (Array.isArray(argFormData[key])) {
            // 配列の場合は各要素に対して再帰的に処理
            const previousItemsSchema = previousPropSchema.items as JSONSchema7;
            const currentItemsSchema = currentPropSchema.items as JSONSchema7;
            const orgItemsSchema = orgPropSchema.items as JSONSchema7;
            
            if (previousItemsSchema && currentItemsSchema) {
              (argFormData[key] as any[]).forEach((item: any) => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                  clearNestedProperties(
                    item,
                    previousItemsSchema,
                    currentItemsSchema,
                    orgItemsSchema,
                    orgSchema
                  );
                  // visibleWhenで非表示になった項目の値をクリア
                  clearVisibleWhenProperties(item, currentItemsSchema);
                }
              });
            }
          } else if (typeof argFormData[key] === 'object') {
            // ネストされたオブジェクトの場合は再帰的に処理
            clearNestedProperties(
              argFormData[key],
              previousPropSchema,
              currentPropSchema,
              orgPropSchema,
              orgSchema
            );
            // visibleWhenで非表示になった項目の値をクリア
            clearVisibleWhenProperties(argFormData[key], currentPropSchema);
          }
        }
        return;
      }
      
      // 現在のスキーマに存在しない場合は削除対象に追加
      if (!currentSchemaPropertyKeys.has(key)) {
        keysToRemove.add(key);
      } else {
        // 現在のスキーマにも存在する場合は、ネストされたオブジェクトの場合は再帰的に処理
        const previousPropSchema = previousSchema?.properties?.[key] as JSONSchema7;
        const currentPropSchema = currentSchema?.properties?.[key] as JSONSchema7;
        
        // orgPropSchemaを取得（base schemaのプロパティまたはallOfのthenスキーマから）
        let orgPropSchema: JSONSchema7 | undefined;
        const orgPropSchemaDef = orgSchema.properties?.[key];
        if (orgPropSchemaDef) {
          orgPropSchema = typeof orgPropSchemaDef === 'object' && orgPropSchemaDef !== null ? orgPropSchemaDef as JSONSchema7 : undefined;
        } else {
          // allOfのthenスキーマから取得
          if (orgSchema.allOf) {
            const allOfItems = orgSchema.allOf as JSONSchema7[];
            for (const allOfItem of allOfItems) {
              if (allOfItem.then) {
                const thenSchema = allOfItem.then as JSONSchema7;
                if (thenSchema.properties && thenSchema.properties[key]) {
                  const thenPropSchemaDef = thenSchema.properties[key];
                  orgPropSchema = typeof thenPropSchemaDef === 'object' && thenPropSchemaDef !== null ? thenPropSchemaDef as JSONSchema7 : undefined;
                  break;
                }
              }
            }
          }
        }
        
        // orgPropSchemaが$refの場合は解決
        if (orgPropSchema && orgPropSchema.$ref) {
          let refValue = orgPropSchema.$ref;
          if (refValue.startsWith('#')) {
            refValue = refValue.substring(1);
          }
          const defSchema = JSONPointer.get(orgSchema, refValue) as JSONSchema7;
          if (defSchema) {
            orgPropSchema = defSchema;
          }
        }
        
        if (previousPropSchema && currentPropSchema && orgPropSchema && argFormData[key]) {
          if (Array.isArray(argFormData[key])) {
            // 配列の場合は各要素に対して再帰的に処理
            const previousItemsSchema = previousPropSchema.items as JSONSchema7;
            const currentItemsSchema = currentPropSchema.items as JSONSchema7;
            const orgItemsSchema = orgPropSchema.items as JSONSchema7;
            
            if (previousItemsSchema && currentItemsSchema) {
              (argFormData[key] as any[]).forEach((item: any) => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                  clearNestedProperties(
                    item,
                    previousItemsSchema,
                    currentItemsSchema,
                    orgItemsSchema,
                    orgSchema
                  );
                }
              });
            }
          } else if (typeof argFormData[key] === 'object') {
            // ネストされたオブジェクトの場合は再帰的に処理
            clearNestedProperties(
              argFormData[key],
              previousPropSchema,
              currentPropSchema,
              orgPropSchema,
              orgSchema
            );
          }
        }
      }
    });
    
    // orgSchema.allOfから、現在のformDataで適用されるプロパティの集合を計算（base schemaのプロパティを含む）
    const validPropertyKeys = new Set<string>();
    
    // base schemaのプロパティを追加
    basePropertyKeys.forEach((key) => {
      validPropertyKeys.add(key);
    });
    
    // allOfの各項目をチェック（条件分岐で追加されるプロパティを追跡）
    // 各プロパティがどのallOf項目から追加されたかを記録
    const conditionalPropertyKeysByAllOf = new Map<number, Set<string>>();
    
    if (orgSchema.allOf) {
      const allOfItems = orgSchema.allOf as JSONSchema7[];
      
      allOfItems.forEach((allOfItem, index) => {
        const conditionMet = checkIfCondition(allOfItem, argFormData);
        const propertyKeys = new Set<string>();
        
        if (conditionMet && allOfItem.then) {
          // thenスキーマのプロパティを追加
          const thenSchema = allOfItem.then as JSONSchema7;
          if (thenSchema.properties) {
            Object.keys(thenSchema.properties).forEach((key) => {
              validPropertyKeys.add(key);
              propertyKeys.add(key);
            });
          }
        } else if (!conditionMet && allOfItem.else) {
          // elseスキーマのプロパティを追加
          const elseSchema = allOfItem.else as JSONSchema7;
          if (elseSchema.properties) {
            Object.keys(elseSchema.properties).forEach((key) => {
              validPropertyKeys.add(key);
              propertyKeys.add(key);
            });
          }
        }
        
        if (propertyKeys.size > 0) {
          conditionalPropertyKeysByAllOf.set(index, propertyKeys);
        }
      });
    }
    
    // 前回のformDataで適用されるプロパティの集合を計算（base schemaのプロパティを含む）
    const previousValidPropertyKeys = new Set<string>();
    
    // base schemaのプロパティを追加
    basePropertyKeys.forEach((key) => {
      previousValidPropertyKeys.add(key);
    });
    
    // allOfの各項目をチェック（条件分岐で追加されるプロパティを追跡）
    // 各プロパティがどのallOf項目から追加されたかを記録
    const previousConditionalPropertyKeysByAllOf = new Map<number, Set<string>>();
    
    if (orgSchema.allOf) {
      const allOfItems = orgSchema.allOf as JSONSchema7[];
      
      allOfItems.forEach((allOfItem, index) => {
        const conditionMet = checkIfCondition(allOfItem, previousFormData);
        const propertyKeys = new Set<string>();
        
        if (conditionMet && allOfItem.then) {
          // thenスキーマのプロパティを追加
          const thenSchema = allOfItem.then as JSONSchema7;
          if (thenSchema.properties) {
            Object.keys(thenSchema.properties).forEach((key) => {
              previousValidPropertyKeys.add(key);
              propertyKeys.add(key);
            });
          }
        } else if (!conditionMet && allOfItem.else) {
          // elseスキーマのプロパティを追加
          const elseSchema = allOfItem.else as JSONSchema7;
          if (elseSchema.properties) {
            Object.keys(elseSchema.properties).forEach((key) => {
              previousValidPropertyKeys.add(key);
              propertyKeys.add(key);
            });
          }
        }
        
        if (propertyKeys.size > 0) {
          previousConditionalPropertyKeysByAllOf.set(index, propertyKeys);
        }
      });
    }
    
    // 前回のallOf項目で条件が満たされていたが、現在は満たされていない項目のプロパティを削除
    previousConditionalPropertyKeysByAllOf.forEach((previousKeys, allOfIndex) => {
      // 前回このallOf項目で条件が満たされていた
      // 現在このallOf項目で条件が満たされているかチェック
      const currentConditionMet = orgSchema.allOf && 
        checkIfCondition((orgSchema.allOf as JSONSchema7[])[allOfIndex], argFormData);
      
      if (!currentConditionMet) {
        // 現在条件が満たされていない場合、このallOf項目のプロパティを削除対象に追加
        // 条件が変わった場合、同じプロパティ名でも値はクリアする
        previousKeys.forEach((key) => {
          // base schemaのプロパティは削除しない
          if (basePropertyKeys.has(key)) {
            return;
          }
          
          // 他のallOf項目で同じプロパティが追加されている場合でも、条件が変わった場合は削除する
          // 同じプロパティ名でも、異なる条件で追加された場合は値が異なる可能性があるため
          keysToRemove.add(key);
        });
      } else {
        // 条件が満たされている場合でも、ネストされたオブジェクト内のプロパティを再帰的に処理
        previousKeys.forEach((key) => {
          // base schemaのプロパティは処理済みなのでスキップ
          if (basePropertyKeys.has(key)) {
            return;
          }
          
          // ネストされたオブジェクトの場合は再帰的に処理
          const previousPropSchema = previousSchema?.properties?.[key] as JSONSchema7;
          const currentPropSchema = currentSchema?.properties?.[key] as JSONSchema7;
          
          // allOfのthenスキーマからorgPropSchemaを取得
          const allOfItem = (orgSchema.allOf as JSONSchema7[])[allOfIndex];
          let orgPropSchema: JSONSchema7 | undefined;
          if (allOfItem.then) {
            const thenSchema = allOfItem.then as JSONSchema7;
            if (thenSchema.properties && thenSchema.properties[key]) {
              const orgPropSchemaDef = thenSchema.properties[key];
              orgPropSchema = typeof orgPropSchemaDef === 'object' && orgPropSchemaDef !== null ? orgPropSchemaDef as JSONSchema7 : undefined;
            }
          }
          
          // orgPropSchemaが$refの場合は解決
          if (orgPropSchema && orgPropSchema.$ref) {
            let refValue = orgPropSchema.$ref;
            if (refValue.startsWith('#')) {
              refValue = refValue.substring(1);
            }
            const defSchema = JSONPointer.get(orgSchema, refValue) as JSONSchema7;
            if (defSchema) {
              orgPropSchema = defSchema;
            }
          }
          
          if (previousPropSchema && currentPropSchema && orgPropSchema && argFormData[key]) {
            if (Array.isArray(argFormData[key])) {
              // 配列の場合は各要素に対して再帰的に処理
              const previousItemsSchema = previousPropSchema.items as JSONSchema7;
              const currentItemsSchema = currentPropSchema.items as JSONSchema7;
              const orgItemsSchema = orgPropSchema.items as JSONSchema7;
              
              if (previousItemsSchema && currentItemsSchema) {
                (argFormData[key] as any[]).forEach((item: any) => {
                  if (item && typeof item === 'object' && !Array.isArray(item)) {
                    clearNestedProperties(
                      item,
                      previousItemsSchema,
                      currentItemsSchema,
                      orgItemsSchema,
                      orgSchema
                    );
                    // visibleWhenで非表示になった項目の値をクリア
                    clearVisibleWhenProperties(item, currentItemsSchema);
                  }
                });
              }
            } else if (typeof argFormData[key] === 'object') {
              // ネストされたオブジェクトの場合は再帰的に処理
              clearNestedProperties(
                argFormData[key],
                previousPropSchema,
                currentPropSchema,
                orgPropSchema,
                orgSchema
              );
              // visibleWhenで非表示になった項目の値をクリア
              clearVisibleWhenProperties(argFormData[key], currentPropSchema);
            }
          }
        });
      }
    });

    // 削除すべきプロパティを削除
    keysToRemove.forEach((propName: string) => {
      if (argFormData[propName] !== undefined) {
        delete argFormData[propName];
      }
    });
    
    // visibleWhenで非表示になった項目の値をクリア（全体のスキーマに対して）
    if (currentSchema) {
      clearVisibleWhenProperties(argFormData, currentSchema);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChange = (e: IChangeEvent<any>) => {
    let data = e.formData;
    // データがないと保存時にnot null制約違反になるため空オブジェクトに変換
    if (data === undefined || data === null) {
      data = {};
    }

    if (thisDocument) {
      const currentEventDate = getEventDate(thisDocument, data);
      // eventdateに変更があればスキーマに合わせたformData生成
      if (eventDate !== currentEventDate) {
        const newFormdata = GetVersionedFormData(
          GetSchemaIdFromString(e.schema.$id!),
          e.schema,
          currentEventDate,
          data,
          true
        );
        if (newFormdata) {
          if (
            checkEventDateInfinityLoop(
              newFormdata,
              store.getState().schemaDataReducer.schemaDatas.get(schemaId)
            ).isNotLoop
          ) {
            // eventdate更新
            setEventDate(currentEventDate);

            dispatch({
              type: 'EVENT_DATE',
              eventDate: currentEventDate,
              documentId,
            });
          }

          data = newFormdata;
        }
      }
    }

    let hasDefault = false;
    if (e.schema.properties) {
      // デフォルト値を持っているプロパティ有無
      hasDefault = JSON.stringify(e.schema.properties).includes('"default"');
      if (!hasDefault) {
        // objectの場合もデフォルト値になるのでチェック
        hasDefault =
          Object.entries(e.schema.properties).filter((p) => {
            const tmpSchema = p[1] as JSONSchema7;
            switch (tmpSchema.type) {
              case 'object':
                return true;
              // case 'array': {
              //   return (tmpSchema.items as JSONSchema7).type === 'object';
              // }
              default:
                return false;
            }
          }).length > 0;
      }

      // 計算項目
      if (JSON.stringify(e.schema.properties).includes('"calculationType"')) {
        const calculatedData = Object.entries(e.schema.properties).flatMap((p) => {
          const propName = p[0];
          const tmpSchema = p[1] as JSONSchema7;
          const calculationType = tmpSchema.calculationType;
          const calculationTag = tmpSchema.calculationTag;
          if (calculationType && calculationTag) {
            const result = calculateItem(e.schema, data, calculationType, calculationTag);
            if (data[propName] !== result) {
              return { propertyName: propName, calculatedValue: result };
            }
          }
          return [];
        });

        if (calculatedData.length > 0) {
          const tmpData = structuredClone(data);
          calculatedData.forEach((d) => {
            tmpData[d.propertyName] = d.calculatedValue;
          });
          data = tmpData;
        }
      }
    }

    // スキーマに存在しない項目を削除する（先に実行して、NOT_EXIST_PROPの項目を削除）
    if (schema.properties) {
      deleteNotExistProp(data, schema.properties);
    }

    // 条件変更により表示されなくなった項目の値をクリアする
    // 初回はスキーマの変更がないためスキップ
    if (!isFirstOnChange && orgSchemaRef.current && Object.keys(previousFormDataRef.current).length > 0) {
      clearHiddenProperties(data, orgSchemaRef.current, previousFormDataRef.current);
    }
    
    // 前回のformDataを更新（次回の比較用）
    previousFormDataRef.current = lodash.cloneDeep(data);

    if (isFirstOnChange && hasDefault && !isFirstRederComplited) {
      // 作成直後のデフォルト値設定によるonChangeの場合は表示中のデータとデフォルト値をマージする
      data = lodash.merge(formData, e.formData);

      dispatch({
        type: 'INPUT',
        schemaId,
        formData: data,
        documentId,
        isUpdateInput: true,
      });
    }

    setFormData(data);

    if (
      !isFirstOnChange ||
      !hasDefault ||
      (isFirstOnChange && isFirstRederComplited)
    ) {
      // formDataだと一つ前のデータが表示されるため、変更後の値を直接更新
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dispatch({
        type: 'INPUT',
        schemaId,
        formData: data,
        documentId,
        isUpdateInput: true,
      });
    }

    setIsFirstOnChange(false);
  };

  // TODO OneOfFieldについては他に影響ないか確認
  const customFields = {
    OneOfField: () => null, // defaultのOneOfFieldは使わない
  };

  const customWidgets = {
    // 既存のWidget
    DateWidget: JESGOComp.CustomDateWidget,
    TextareaWidget: JESGOComp.CustomTextareaWidget,

    // オリジナルのWidget
    layerDropdown: JESGOComp.LayerDropdown,
    multiTypeTextBox: JESGOComp.MultiTypeTextBox,
    datalistTextBox: JESGOComp.DatalistTextBox,
    withUnits: JESGOComp.WithUnits,
    layerRadioButton: JESGOComp.LayerRadioButton,
    layerComboBox: JESGOComp.LayerComboBox,
    customCheckboxesWidget: JESGOComp.CustomCheckboxesWidget,

    deleteTextWidget: JESGOComp.DeleteTextWidget,
    deleteCheckBoxWidget: JESGOComp.DeleteCheckboxWidget,
  };

  return (
    <Form
      className="input-form"
      tagName="div"
      ArrayFieldTemplate={JESGOFiledTemplete.ArrayFieldTemplate}
      onChange={onChange}
      fields={customFields}
      widgets={customWidgets}
      noHtml5Validate
      showErrorList={false}
      uiSchema={uiSchema}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...copyProps}
    >
      <div />
    </Form>
  );
};

export default CustomDivForm;
