import { UiSchema } from '@rjsf/core';
// TODO eslintのエラーが消えないので一旦コメントで抑制
// eslint-disable-next-line import/no-unresolved
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
} from 'json-schema'; // eslint-disable-line import/no-unresolved
import lodash from 'lodash';
import { JESGOFiledTemplete } from './JESGOFieldTemplete';
import { Const } from '../../common/Const';
import { getPropItemsAndNames, getSchemaType } from './SchemaUtility';
import { isNotEmptyObject } from '../../common/CaseRegistrationUtility';
import store from '../../store';

// uiSchema作成用Utility

export type UiSchemaProp = {
  schema: JSONSchema7;
};

/**
 * 各プロパティに合ったuiSchemaを追加
 * @param schema 定義スキーマ
 * @param uiSchema UiSchema
 * @param isRequired 必須かどうか
 * @returns 書き換え後UiSchema
 */
const AddUiSchema = (
  schema: JSONSchema7,
  uiSchema: UiSchema,
  formData: any,
  isRequired: boolean
) => {
  let resultUiSchema: UiSchema = lodash.cloneDeep(uiSchema);
  if (resultUiSchema === undefined) {
    resultUiSchema = {};
  }
  if (schema === undefined) return resultUiSchema;
  const itemPropName = Object.keys(schema);

  const kType: keyof JSONSchema7 = Const.JSONSchema7Keys.TYPE;
  const classNames: string[] = [];

  const schemaType = getSchemaType(schema);

  // requiredの場合
  if (isRequired) {
    classNames.push('required-item');
  }

  // "jesgo:validation:haserror"
  if (schema['jesgo:validation:haserror'] === true) {
    classNames.push('has-error');
  }

  // "jesgo:ui:subschemastyle"
  if (schema[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE]) {
    if (schema[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE] === 'inline') {
      if (
        schema.properties &&
        Object.entries(schema.properties).find(
          (prop) =>
            (prop[1] as JSONSchema7).type === Const.JSONSchema7Types.ARRAY
        )
      ) {
        // arrayの項目が含まれている場合はarray用のものを適応する
        classNames.push('array-subschemastyle-inline');
      } else {
        classNames.push('subschemastyle-inline');
      }
    } else if (schema[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE] === 'column') {
      classNames.push('subschemastyle-column');
    }
  }

  // "jesgo:ui:visiblewhen"
  if (schema[Const.EX_VOCABULARY.UI_VISIBLE_WHEN]) {
    classNames.push('visiblewhen');
  }
  
  // "jesgo:required"
  const jesgoRequireds = schema[Const.EX_VOCABULARY.REQUIRED];
  const highlight = store.getState().commonReducer.isJesgoRequiredHighlight;
  if (jesgoRequireds && !isNotEmptyObject(formData) && highlight) {
    if (jesgoRequireds.includes(Const.JesgoRequiredTypes.JSOG) && highlight.jsog === true) {
      classNames.push('jesgo-require-jsog');
      
    }
    if (jesgoRequireds.includes(Const.JesgoRequiredTypes.JSGOE) && highlight.jsgoe === true) {
      classNames.push('jesgo-require-jsgoe');
    }
    // 上記以外の設定があった場合
    const others = jesgoRequireds.filter((x) => x !== Const.JesgoRequiredTypes.JSOG && x !== Const.JesgoRequiredTypes.JSGOE)
    if (others.length > 0 && highlight.others === true) {
      classNames.push('jesgo-require-others');
    }
  }

  // "jesgo:required"、または"description"がある場合、カスタムラベルを使用
  // ※type:arrayの場合は除く
  if (
    !(schemaType === Const.JSONSchema7Types.ARRAY) &&
    (itemPropName.includes(Const.EX_VOCABULARY.REQUIRED) ||
      itemPropName.includes(Const.JSONSchema7Keys.DESCRIPTION))
  ) {
    if (schemaType === Const.JSONSchema7Types.OBJECT) {
      resultUiSchema[Const.UI_WIDGET.OBJECT_FIELD_TEMPLATE] =
        JESGOFiledTemplete.CustomObjectFieldTemplate;
    } else {
      resultUiSchema[Const.UI_WIDGET.FIELD_TEMPLATE] =
        JESGOFiledTemplete.CustomLableTemplete;
    }
  }

  // "jesgo:ui:textarea"
  if (itemPropName.includes(Const.EX_VOCABULARY.UI_TEXTAREA)) {
    let rows = 3; // 3行がデフォルト
    resultUiSchema[Const.UI_WIDGET.WIDGET] = 'textarea';
    if (typeof schema[Const.EX_VOCABULARY.UI_TEXTAREA] === 'number') {
      rows = schema[Const.EX_VOCABULARY.UI_TEXTAREA] as number;
    }
    resultUiSchema[Const.UI_WIDGET.OPTIONS] = { rows };
  }

  // units
  if (schema.units) {
    resultUiSchema[Const.UI_WIDGET.WIDGET] = 'withUnits';
  }

  // 日付入力Widget
  const kFormat: keyof JSONSchema7 = Const.JSONSchema7Keys.FORMAT;
  if (itemPropName.includes(kFormat) && schema[kFormat] === 'date') {
    classNames.push('input-date');
  }

  // 数値入力Widget
  if (['integer', 'number'].includes(schemaType as string)) {
    classNames.push('input-integer');
  }

  if (itemPropName.includes(kType)) {
    switch (schemaType) {
      case Const.JSONSchema7Types.STRING:
        classNames.push('input-text');
        break;
      case Const.JSONSchema7Types.ARRAY:
        classNames.push('input-text');
        break;
      default:
        break;
    }
  }

  // jesgo:ui:listtype=buttonsによるチェックボックス、ラジオボタン(oneOfは除く)
  if (
    schema[Const.EX_VOCABULARY.UI_LISTTYPE] ===
      Const.JESGO_UI_LISTTYPE.BUTTONS &&
    !itemPropName.includes(Const.JSONSchema7Keys.ONEOF)
  ) {
    // チェックボックスグループ
    if (schemaType === Const.JSONSchema7Types.ARRAY && schema.items) {
      // resultUiSchema[Const.UI_WIDGET.WIDGET] = 'checkboxes';
      resultUiSchema[Const.UI_WIDGET.WIDGET] = 'customCheckboxesWidget';
      resultUiSchema[Const.UI_WIDGET.OPTIONS] = { inline: true }; // 横並びにする
      // eslint-disable-next-line no-param-reassign
      schema.uniqueItems = true; // これがないとエラーになる
    } else if (
      schemaType === Const.JSONSchema7Types.STRING &&
      schema.enum &&
      schema.enum.length > 0
    ) {
      // 通常のラジオボタン
      resultUiSchema[Const.UI_WIDGET.WIDGET] = 'radio';
      resultUiSchema[Const.UI_WIDGET.OPTIONS] = { inline: true }; // 横並びにする
    }
  }

  // oneOf
  if (itemPropName.includes(Const.JSONSchema7Keys.ONEOF)) {
    if (itemPropName.includes(kType)) {
      switch (schemaType) {
        case Const.JSONSchema7Types.STRING:
          if (
            schema[Const.EX_VOCABULARY.UI_LISTTYPE] ===
            Const.JESGO_UI_LISTTYPE.COMBO
          ) {
            // oneOfの中身解析
            const oneOfItems = schema[
              Const.JSONSchema7Keys.ONEOF
            ] as JSONSchema7[];
            let selectItem: JSONSchema7Type[] = [];
            oneOfItems.forEach((oneOfItem: JSONSchema7) => {
              if (
                getSchemaType(oneOfItem) === Const.JSONSchema7Types.STRING &&
                oneOfItem.enum
              ) {
                // selectがある
                selectItem = oneOfItem.enum;
                classNames.push('input-select');
              }
            });

            if (selectItem.length > 0) {
              // resultUiSchema[Const.UI_WIDGET.WIDGET] = 'datalistTextBox';
              resultUiSchema[Const.UI_WIDGET.WIDGET] = 'layerComboBox';
            } else {
              resultUiSchema[Const.UI_WIDGET.WIDGET] = 'multiTypeTextBox';
            }
            resultUiSchema[Const.UI_WIDGET.FIELD_TEMPLATE] =
              JESGOFiledTemplete.CustomLableTemplete;
          } else if (
            schema[Const.EX_VOCABULARY.UI_LISTTYPE] ===
            Const.JESGO_UI_LISTTYPE.BUTTONS
          ) {
            // 階層表示用ラジオボタンの適用
            resultUiSchema[Const.UI_WIDGET.WIDGET] = 'layerRadioButton';
          } else {
            // 階層表示用selectの適用
            resultUiSchema[Const.UI_WIDGET.WIDGET] = 'layerDropdown';
            resultUiSchema[Const.UI_WIDGET.FIELD_TEMPLATE] =
              JESGOFiledTemplete.CustomLableTemplete;
          }
          break;
        default:
          break;
      }
    }
  }

  switch (schema[Const.EX_VOCABULARY.UI_LISTTYPE] ?? '') {
    case Const.JESGO_UI_LISTTYPE.COMBO:
    case Const.JESGO_UI_LISTTYPE.SUGGEST_COMBO:
    case Const.JESGO_UI_LISTTYPE.SUGGEST_LIST: {
      if (schema.oneOf || schema.anyOf || schema.enum) {
        // 階層表示用コンボボックスの適応
        resultUiSchema[Const.UI_WIDGET.WIDGET] = 'layerComboBox';
      }
      break;
    }
    default:
      break;
  }

  // "jesgo:ui:hidden"
  // 非表示は最後に設定
  if (schema[Const.EX_VOCABULARY.UI_HIDDEN]) {
    resultUiSchema[Const.UI_WIDGET.WIDGET] = 'hidden';
  }

  // classNameは最後に入れる
  if (classNames.length > 0) {
    resultUiSchema[Const.UI_WIDGET.CLASS] = classNames.join(' ');
  }

  // autocompleteはoffにしておく
  resultUiSchema[Const.UI_WIDGET.AUTOCOMPLETE] = 'off';

  // スキーマに存在しないプロパティに削除ボタンを表示させるWidget
  if (schema[Const.EX_VOCABULARY.NOT_EXIST_PROP]) {
    switch (schemaType) {
      case 'string':
      case 'number':
      case 'integer': {
        // 削除ボタン付きテキストボックス
        resultUiSchema[Const.UI_WIDGET.WIDGET] = 'deleteTextWidget';
        break;
      }
      case 'boolean': {
        // 削除ボタン付きチェックボックス(fieldとwidgetを適応)
        resultUiSchema[Const.UI_WIDGET.FIELD_TEMPLATE] =
          JESGOFiledTemplete.CustomNoTitleCheckboxTemplete;
        resultUiSchema[Const.UI_WIDGET.WIDGET] = 'deleteCheckBoxWidget';
        break;
      }
      default:
        break;
    }
  }

  // eslint-disable-next-line no-param-reassign
  return resultUiSchema;
};

// ソート順の追加
const CreateOrderList = (
  orderList: string[],
  propName: string,
  parentPropName?: string
) => {
  if (parentPropName) {
    // 親の次に追加
    const index = orderList.indexOf(parentPropName);
    orderList.splice(index + 1, 0, propName);
  } else {
    orderList.push(propName);
  }
};

/**
 * properties のUISchema作成
 * @param requiredNames 必須対象の項目名
 * @param propNames
 * @param items
 * @param uiSchema
 * @param orderList
 * @returns
 */
export const createUiSchemaProperties = (
  requiredNames: string[],
  propNames: string[],
  items: { [key: string]: JSONSchema7Definition },
  uiSchema: UiSchema,
  formData: any,
  orderList: string[]
) => {
  let resUiSchema: UiSchema = lodash.cloneDeep(uiSchema);
  if (resUiSchema == null) {
    // eslint-disable-next-line no-param-reassign
    resUiSchema = {};
  }

  propNames.forEach((propName: string) => {
    const item = items[propName] as JSONSchema7;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const targetFormData = formData != null ? formData[propName] : "";

    // 直下のproperties
    resUiSchema[propName] = AddUiSchema(
      item,
      resUiSchema[propName] as UiSchema,
      targetFormData,
      requiredNames.includes(propName)
    );
    CreateOrderList(orderList, propName);

    const type = getSchemaType(item);
    // object,Arrayの場合は再帰的に呼び出し
    if (type === Const.JSONSchema7Types.OBJECT) {
      const childItems: { [key: string]: JSONSchema7Definition } | undefined =
        item.properties;
      if (childItems === undefined) return;
      const childPropNames = Object.keys(childItems);
      resUiSchema[propName] = createUiSchemaProperties(
        item.required ?? [],
        childPropNames,
        childItems,
        resUiSchema[propName] as UiSchema,
        targetFormData,
        orderList
      );
    } else if (type === Const.JSONSchema7Types.ARRAY) {
      const childItem = item.items;
      if (childItem === undefined) return;

      // TODO childItemが配列だった場合の判定はしていない。現状のスキーマにもない。要制限事項
      const propItem = getPropItemsAndNames(childItem as JSONSchema7);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const itemsFormData = formData != null ? formData[propName] : "";
      let itemsUiSchema = lodash.cloneDeep(resUiSchema[propName]) as UiSchema;

      itemsUiSchema = AddUiSchema(
        childItem as JSONSchema7,
        itemsUiSchema,
        itemsFormData,
        requiredNames.includes(propName)
      );

      itemsUiSchema = createUiSchemaProperties(
        item.required ?? [],
        propItem.pNames,
        propItem.pItems,
        itemsUiSchema,
        itemsFormData,
        orderList
      );

      // 配列は'items'の中にuiSchemaを定義
      const propUiSchema = resUiSchema[propName] as UiSchema;
      propUiSchema.items = itemsUiSchema;
    }

    // TODO:oneofの対応も必要
  });

  return resUiSchema;
};

/**
 * UISchemaの作成
 * @param schema
 * @returns
 */
export const CreateUISchema = (schema: JSONSchema7, formData: any) => {
  let uiSchema: UiSchema = {};
  const orderList: string[] = [];
  // ルート
  uiSchema = AddUiSchema(schema, uiSchema, formData, false);

  // ルートのitems
  const rootPropsName = Object.keys(schema);
  // "jesgo:ui:subschemastyle"
  const subchemaStyle = rootPropsName.find(
    (p) => p === Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE
  );
  if (
    subchemaStyle &&
    schema[Const.EX_VOCABULARY.UI_SUBSCHEMA_STYLE] === 'column'
  ) {
    uiSchema[Const.UI_WIDGET.CLASS] = 'subschemastyle-column';
  }

  // items
  const items = schema.items;
  if (items) {
    // TODO itemsが配列はあり得る？
    if (Array.isArray(items)) {
      items.forEach((item: JSONSchema7Definition) => {
        const propItems = getPropItemsAndNames(item as JSONSchema7);
        if (propItems) {
          uiSchema.items = createUiSchemaProperties(
            schema.required ?? [],
            propItems.pNames,
            propItems.pItems,
            uiSchema,
            formData,
            orderList
          );
        }
      });
    } else {
      const propItems = getPropItemsAndNames(items as JSONSchema7);
      if (propItems) {
        uiSchema.items = createUiSchemaProperties(
          schema.required ?? [],
          propItems.pNames,
          propItems.pItems,
          uiSchema,
          formData,
          orderList
        );
      }
    }
  }

  // properties
  const properties = schema.properties;
  if (properties) {
    uiSchema = createUiSchemaProperties(
      schema.required ?? [],
      Object.keys(properties),
      properties,
      uiSchema,
      formData,
      orderList
    );
  }

  // dependencies
  const depItems = schema.dependencies;
  if (depItems) {
    const depPropNames = Object.keys(depItems);
    if (depPropNames !== undefined) {
      depPropNames.forEach((depName: string) => {
        const item: JSONSchema7Definition = depItems[depName] as JSONSchema7;
        if (item === undefined) return;
        const itemPropName = Object.keys(item);

        // oneOf
        if (itemPropName.includes('oneOf')) {
          const oneOfItems = item.oneOf as JSONSchema7[];
          if (oneOfItems === undefined) return;
          oneOfItems.forEach((oneOfItem: JSONSchema7) => {
            const oneOfItemProp = oneOfItem.properties;
            const oneOfRequired = oneOfItem.required ?? [];

            if (oneOfItemProp) {
              const oneOfItemNames = Object.keys(oneOfItemProp);
              if (oneOfItemNames) {
                oneOfItemNames.forEach((oneOfItemName: string) => {
                  // TODO dependenciesに同項目に対し条件が複数あるとおかしくなる（uischemaが重複する）。要修正
                  if (oneOfItemName !== depName) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const targetFormData = formData != null ? formData[oneOfItemName] : "";
                    uiSchema[oneOfItemName] = AddUiSchema(
                      oneOfItemProp[oneOfItemName] as JSONSchema7,
                      uiSchema[oneOfItemName] as UiSchema,
                      targetFormData,
                      oneOfRequired.includes(oneOfItemName)
                    );
                    CreateOrderList(orderList, oneOfItemName, depName);
                  }
                });
              }
            }
          });
        }
      });
    }
  }

  // Schemaの指定順に項目を並べる
  uiSchema[Const.UI_WIDGET.ORDER] = orderList;

  return uiSchema;
};
