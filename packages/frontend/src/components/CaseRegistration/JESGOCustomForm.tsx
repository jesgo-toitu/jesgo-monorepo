/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import lodash from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import Form, { FormProps, IChangeEvent } from '@rjsf/core';
import { Dispatch } from 'redux';
import { JSONSchema7 } from 'webpack/node_modules/schema-utils/declarations/ValidationError';
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
  GetSchemaIdFromString,
  GetSchemaInfo,
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

  // 継承直後、データ入力判定を動かすためにsetFormDataする
  useEffect(() => {
    if (JSON.stringify(copyProps.formData) !== JSON.stringify(formData)) {
      setFormData(formData);
    }
  }, [formData, copyProps.formData]);

  copyProps.formData = formData;

  // eventdate不整合の場合、現在日時点で有効な最新スキーマを適応する
  if (loopCheck.isNotLoop && loopCheck.finalizedSchema) {
    // ループ検証時にスキーマが取得できていればそちらを採用
    schema = CustomSchema({
      orgSchema: loopCheck.finalizedSchema.document_schema,
      formData,
    });
  } else if (!loopCheck.isNotLoop) {
    const newSchema = GetSchemaInfo(schemaId, null, true);
    if (newSchema) {
      schema = CustomSchema({ orgSchema: newSchema.document_schema, formData });
    }
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

    // スキーマに存在しない項目を削除する
    if (schema.properties) {
      deleteNotExistProp(data, schema.properties);
    }

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
