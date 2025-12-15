/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import lodash from 'lodash';
import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';
import store from '../store';
import {
  dispSchemaIdAndDocumentIdDefine,
  jesgoDocumentObjDefine,
  SaveDataObjDefine,
} from '../store/formDataReducer';
import {
  CustomSchema,
  getPropItemsAndNames,
  GetSchemaInfo,
} from '../components/CaseRegistration/SchemaUtility';
import { JesgoDocumentSchema } from '../store/schemaDataReducer';
import { Const } from './Const';
import {
  RegistrationErrors,
  VALIDATE_TYPE,
  ValidationItem,
  validationResult,
} from '../components/CaseRegistration/Definition';

// formDataからjesgo:errorを取り出して削除
export const popJesgoError = (formData: any, deleteError = false) => {
  let popValue: any[] = [];
  if (formData && !Array.isArray(formData) && typeof formData === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (formData[Const.EX_VOCABULARY.JESGO_ERROR]) {
      // 取り出して元のformDataからは削除
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const errorValue = formData[Const.EX_VOCABULARY.JESGO_ERROR];
      // 配列でない場合は配列に変換
      if (Array.isArray(errorValue)) {
        popValue = errorValue;
      }
      // jesgo:error削除する場合
      if (deleteError) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-param-reassign
        delete formData[Const.EX_VOCABULARY.JESGO_ERROR];
      }
    }
  }

  return popValue;
};

/**
 * 入力値のvalidation
 * @param resultSchema
 * @param formData
 * @param argType
 * @returns
 */
const validateFormData = (
  resultSchema: JSONSchema7,
  formData: any,
  argType: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined = undefined
) => {
  const messages: ValidationItem[] = [];
  const type = argType || resultSchema.type;

  // validation用独自メッセージ
  const validationAlertMessage =
    resultSchema[Const.EX_VOCABULARY.VALIDATION_ALERT] ?? '';

  // エラーメッセージ取得Func
  const getErrMsg = (defaultMessage: string) =>
    // スキーマでエラーメッセージの内容が定義されていればそちらを優先する
    validationAlertMessage === '' ? defaultMessage : validationAlertMessage;

  // 入力がある場合のみチェック
  if (formData && typeof formData !== 'object') {
    if (type === Const.JSONSchema7Types.STRING) {
      if (resultSchema.format === 'date') {
        const value: Date = new Date(formData as string);

        const min = new Date(Const.INPUT_DATE_MIN);
        const max = new Date(Const.INPUT_DATE_MAX());
        max.setHours(23);
        max.setMinutes(59);

        // minとmaxの範囲にあるかチェック
        if (
          min.getTime() > value.getTime() ||
          max.getTime() < value.getTime()
        ) {
          // messages.push(`未来日は入力できません。`);
          messages.push({
            message: getErrMsg(
              `${Const.INPUT_DATE_MIN.replace(
                /-/g,
                '/'
              )} ～ ${Const.INPUT_DATE_MAX().replace(
                /-/g,
                '/'
              )}の範囲で入力してください。`
            ),
            validateType: VALIDATE_TYPE.Range,
          });
        }
      }

      const pattern = resultSchema.pattern;
      if (pattern) {
        // pattern
        const reg = new RegExp(pattern);
        const value: string = (formData as string) ?? '';
        if (value && !value.match(reg)) {
          messages.push({
            message: getErrMsg(`${pattern}の形式で入力してください。`),
            validateType: VALIDATE_TYPE.Regex,
          });
        }
      }
      if (resultSchema.const) {
        // const
        if (resultSchema.const !== formData) {
          messages.push({
            message: getErrMsg(
              `「${resultSchema.const as string}」のみ入力できます。`
            ),
            validateType: VALIDATE_TYPE.Constant,
          });
        }
      }
      if (resultSchema.enum) {
        // enum
        const enumValues = resultSchema.enum as string[];
        if (formData !== '' && !enumValues.includes(formData as string)) {
          const subMsgs: string[] = [];
          enumValues.forEach((enumValue: string) => {
            subMsgs.push(`「${enumValue}」`);
          });
          messages.push({
            message: getErrMsg(`${subMsgs.join('、')}のみ入力できます。`),
            validateType: VALIDATE_TYPE.Enum,
          });
        }
      }
    } else if (
      type === Const.JSONSchema7Types.NUMBER ||
      type === Const.JSONSchema7Types.INTEGER
    ) {
      const value = Number(formData);
      let isNotNumber = false;

      if (Number.isNaN(value)) {
        messages.push({
          message: getErrMsg(`数値で入力してください。`),
          validateType: VALIDATE_TYPE.Number,
        });
        isNotNumber = true;
      } else if (
        type === Const.JSONSchema7Types.INTEGER &&
        !Number.isInteger(value)
      ) {
        messages.push({
          message: getErrMsg(`整数で入力してください。`),
          validateType: VALIDATE_TYPE.Integer,
        });
        isNotNumber = true;
      }
      // 数値の場合のみ以降のチェックを行う
      if (!isNotNumber) {
        if (resultSchema.const !== undefined) {
          // const
          if (resultSchema.const !== value) {
            messages.push({
              message: getErrMsg(
                `「${resultSchema.const as string}」のみ入力できます。`
              ),
              validateType: VALIDATE_TYPE.Constant,
            });
          }
        }
        if (resultSchema.minimum !== undefined) {
          // minimum
          if (value < resultSchema.minimum) {
            messages.push({
              message: getErrMsg(
                `${resultSchema.minimum}以上の値を入力してください。`
              ),
              validateType: VALIDATE_TYPE.MinimumNumber,
            });
          }
        }
        if (resultSchema.maximum !== undefined) {
          // maximum
          if (value > resultSchema.maximum) {
            messages.push({
              message: getErrMsg(
                `${resultSchema.maximum}以下の値を入力してください。`
              ),
              validateType: VALIDATE_TYPE.MaximumNumber,
            });
          }
        }
      }
    }
  }
  return messages;
};

/**
 * validation 必須入力チェック
 * @param formData
 * @param propName
 * @param required
 * @returns
 */
const validateRequired = (
  formData: any,
  propName: string,
  required: string[]
) => {
  let messages = '';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  if (!Object.keys(formData).length && required.includes(propName)) {
    messages = `入力してください。`;
  }

  return messages;
};

/**
 * validationの結果によりschemaを書き換える
 * @param schema
 * @param schemaId
 * @param formData
 * @param propName
 * @returns
 */
const customSchemaValidation = (
  schema: JSONSchema7,
  schemaId: number,
  formData: any,
  parentDisplayName: string[],
  propName: string,
  required: string[],
  arrayFlg: boolean
) => {
  const messages: ValidationItem[] = [];
  const resultSchema = lodash.cloneDeep(schema);
  let errFlg = false;

  // 表示用項目名
  // propNameが空の場合（最上位のみ）、表示名も空とする
  const displayPropName = propName ? resultSchema.title || propName : '';
  const displayName =
    displayPropName && !arrayFlg && propName !== 'items'
      ? [...parentDisplayName, displayPropName].join(' > ')
      : displayPropName;

  if (resultSchema.properties) {
    // propertiesの場合はさらに下の階層を解析
    const targetSchema = getPropItemsAndNames(resultSchema);
    targetSchema.pNames.forEach((iname: string) => {
      const targetItem = targetSchema.pItems[iname] as JSONSchema7;
      const res = customSchemaValidation(
        targetItem,
        schemaId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        formData[iname] ?? {},
        displayPropName && !arrayFlg && propName !== 'items'
          ? [...parentDisplayName, displayPropName]
          : parentDisplayName,
        iname,
        resultSchema.required ?? [],
        false
      );
      targetSchema.pItems[iname] = res.schema;
      messages.push(...res.messages);
    });
  } else if (
    resultSchema.type === Const.JSONSchema7Types.ARRAY &&
    resultSchema.items
  ) {
    // arrayの場合
    const targetSchema = resultSchema.items as JSONSchema7;

    if (Array.isArray(formData)) {
      // minItems,maxItemsの確認
      if (resultSchema.minItems) {
        const minItems = resultSchema.minItems;
        if (formData.length < minItems) {
          errFlg = true;
          messages.push({
            // eslint-disable-next-line no-irregular-whitespace
            message: `　　[ ${displayName} ] ${minItems}件以上入力してください。`,
            validateType: VALIDATE_TYPE.MinimumItem,
          });
        }
      } else if (resultSchema.maxItems) {
        const maxItems = resultSchema.maxItems;
        // maxItemsと件数がイコールになると＋ボタンが表示されなくなるが、念のためエラーチェックも追加。
        if (formData.length > maxItems) {
          errFlg = true;
          messages.push({
            // eslint-disable-next-line no-irregular-whitespace
            message: `　　[ ${displayName} ] ${maxItems}件以下で入力してください。`,
            validateType: VALIDATE_TYPE.MaximumItem,
          });
        }
      }

      // さらにitemsの中を解析
      formData.forEach((data: any, index: number) => {
        const res = customSchemaValidation(
          targetSchema,
          schemaId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data ?? {},
          [],
          propName,
          // resultSchema.required ?? []
          required ?? [],
          true
        );
        if (res.messages.length > 0) {
          errFlg = true;
          messages.push({
            // eslint-disable-next-line no-irregular-whitespace
            message: `　[ ${displayName}:${index + 1}行目 ]`,
            validateType: VALIDATE_TYPE.Message,
          });
          res.messages.forEach((item: ValidationItem) => {
            messages.push({
              // eslint-disable-next-line no-irregular-whitespace
              message: `　　${item.message}`,
              validateType: item.validateType,
            });
          });
        }
      });
    }
  } else if (
    (resultSchema.oneOf || resultSchema.anyOf) &&
    typeof formData !== 'object'
  ) {
    // oneOfかつ中のアイテムにtypeがある＝複数type入力可能テキストボックス
    // anyOfの場合も同じ
    const oneOfItems =
      (resultSchema.oneOf as JSONSchema7[]) ||
      (resultSchema.anyOf as JSONSchema7[]);
    const requiredMsg = validateRequired(formData, propName, required);
    if (requiredMsg !== '') {
      errFlg = true;
      messages.push({
        // eslint-disable-next-line no-irregular-whitespace
        message: `　[ ${displayName} ] ${requiredMsg}`,
        validateType: VALIDATE_TYPE.Required,
      });
    } else {
      const oneOfMatchCondition: boolean[] = [];
      const subMessages: string[] = [];

      // 正規表現パターン取得
      let patternStr = '';
      const patternObj = oneOfItems.find((p) => p.pattern);
      if (patternObj) {
        patternStr = patternObj.pattern ?? '';
      }

      oneOfItems.forEach((oneOfItem: JSONSchema7) => {
        const errMsgs = validateFormData(
          oneOfItem,
          formData,
          patternStr ? resultSchema.type : undefined
        );
        if (errMsgs.length === 0) {
          oneOfMatchCondition.push(true);
        } else {
          subMessages.push(...errMsgs.map((p) => p.message));
        }
      });
      if (oneOfMatchCondition.length === 0) {
        errFlg = true;
        messages.push({
          // eslint-disable-next-line no-irregular-whitespace
          message: `　[ ${displayName} ] ${subMessages.join('または、')}`,
          validateType: VALIDATE_TYPE.Other,
        });
      }
    }
  } else {
    // 通常のフィールド
    const errMsgs: ValidationItem[] = [];
    const requiredMsg = validateRequired(formData, propName, required);
    if (requiredMsg !== '') {
      errMsgs.push({
        message: requiredMsg,
        validateType: VALIDATE_TYPE.Required,
      });
    } else {
      errMsgs.push(...validateFormData(resultSchema, formData));
    }

    if (errMsgs.length > 0) {
      errFlg = true;
      messages.push({
        // eslint-disable-next-line no-irregular-whitespace
        message: `　[ ${displayName} ] ${errMsgs
          .map((item) => item.message)
          .join('')}`,
        validateType:
          errMsgs[0].validateType === VALIDATE_TYPE.Required
            ? VALIDATE_TYPE.Required
            : VALIDATE_TYPE.Other,
      });
    }
  }

  if (errFlg) {
    // エラーのある項目は内部用の独自ボキャブラリーを付与
    resultSchema['jesgo:validation:haserror'] = true;
  }
  const result: validationResult = { schema: resultSchema, messages };
  return result;
};

// 同一スキーマ複数時のナンバリングタブタイトル取得(saveData使用)
const GetNumberingTabTitle = (
  saveData: SaveDataObjDefine,
  document: jesgoDocumentObjDefine,
  baseTitle: string
) => {
  let title = baseTitle;

  // ルートドキュメントの場合
  if (document.root_order > -1) {
    // ルートドキュメント内で同一スキーマIDを持つドキュメントを取得
    const sameSchemaDocs = saveData.jesgo_document
      .filter(
        (p) =>
          p.root_order > -1 &&
          p.value.schema_id === document.value.schema_id &&
          p.value.deleted === false
      )
      .sort((f, s) => f.root_order - s.root_order);

    // 2件以上あれば番号を振る
    if (sameSchemaDocs.length > 1) {
      const index = sameSchemaDocs.findIndex((p) => p.key === document.key);
      title += (index + 1).toString();
    }
  } else {
    // 子ドキュメントの場合
    const parentDoc = saveData.jesgo_document.find((p) =>
      p.value.child_documents.includes(document.key)
    );

    if (parentDoc) {
      // 親ドキュメントのchildDocumentから同一スキーマIDを持つドキュメントを検索
      const sameSchemaDocs = parentDoc.value.child_documents.filter(
        (childDocId) =>
          saveData.jesgo_document.find(
            (p) =>
              p.key === childDocId &&
              p.value.deleted === false &&
              p.value.schema_id === document.value.schema_id
          )
      );
      // 2件以上あれば番号を振る
      if (sameSchemaDocs.length > 1) {
        const index = sameSchemaDocs.indexOf(document.key);
        title += (index + 1).toString();
      }
    }
  }
  return title;
};

// 親ドキュメントのタイトル取得
const GetParentDocumentTitle = (saveData: SaveDataObjDefine, docId: string) => {
  const titleNames: string[] = [];

  // childDocumentから親ドキュメントを検索
  const parentDoc = saveData.jesgo_document.find((p) =>
    p.value.child_documents.includes(docId)
  );
  // 最上位まで取れたら終了
  if (!parentDoc) {
    return titleNames;
  }
  const schemaInfo = GetSchemaInfo(
    parentDoc.value.schema_id,
    parentDoc.value.event_date
  );
  if (!schemaInfo) {
    return titleNames;
  }

  // スキーマ情報からタイトル取得
  let title = `${schemaInfo.title ?? ''} ${schemaInfo.subtitle ?? ''}`.trim();
  title = GetNumberingTabTitle(saveData, parentDoc, title);

  titleNames.push(title);

  // 再帰で更に上位の親を取得
  titleNames.push(...GetParentDocumentTitle(saveData, parentDoc.key));

  return titleNames;
};

/**
 * 自動生成部分のvalidation
 * @param saveData
 * @returns
 */
export const validateJesgoDocument = (saveData: SaveDataObjDefine) => {
  const errors: RegistrationErrors[] = [];
  saveData.jesgo_document.forEach((doc: jesgoDocumentObjDefine) => {
    // 削除されていないドキュメントだけが対象
    if (!doc.value.deleted) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const formData = doc.value.document;
      const schemaId = doc.value.schema_id;
      const eventDate = doc.value.event_date;
      const documentId = doc.key;

      // schemaの取得
      const schemaInfo = GetSchemaInfo(
        schemaId,
        eventDate
      ) as JesgoDocumentSchema;
      const schema = schemaInfo.document_schema;

      // schemaのカスタマイズ
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const customSchema = CustomSchema({ orgSchema: schema, formData });
      const validResult: validationResult = customSchemaValidation(
        customSchema,
        schemaId,
        formData,
        [],
        '',
        [],
        false
      );
      if (validResult.messages.length > 0) {
        // 親のタイトル取得
        let titleList = GetParentDocumentTitle(saveData, documentId);
        // 親→子の順にしたいのでリバース
        titleList = titleList.reverse();
        // 自身のタイトル追加
        let title = `${schemaInfo.title ?? ''} ${
          schemaInfo.subtitle ?? ''
        }`.trim();
        title = GetNumberingTabTitle(saveData, doc, title);
        titleList.push(title);

        errors.push({
          validationResult: validResult,
          errDocTitle: titleList.join(' > ') ?? '',
          schemaId,
          documentId,
        });
      }

      // jesgo:errorの検証を追加
      // プラグイン実行後にjesgo:errorがデータベースに保存された場合、
      // 再読み込み時にエラーが表示されるようにする
      AddJesgoError(errors, formData, documentId, schemaId, schema);
    }
  });
  return errors;
};

export const getErrMsg = (errorList: RegistrationErrors[]) => {
  const message: string[] = [];
  if (errorList) {
    errorList.forEach((error) => {
      const documentMsg: string[] = [];
      error.validationResult.messages.forEach((item: ValidationItem) => {
        documentMsg.push(item.message);
      });

      if (documentMsg.length > 0) {
        message.push(`【 ${error.errDocTitle} 】`);
        message.push(...documentMsg);
      }
    });
  }
  return message;
};

export type ErrorMsgObject = {
  registErrors: RegistrationErrors;
  message: string;
  validateItem?: ValidationItem;
  showDeleteButton: boolean;
};

export const getErrorMsgObject = (errorList: RegistrationErrors[]) => {
  const message: ErrorMsgObject[] = [];

  if (errorList) {
    errorList.forEach((error) => {
      const documentMsg: ErrorMsgObject[] = [];
      error.validationResult.messages.forEach((item: ValidationItem) => {
        documentMsg.push({
          message: item.message,
          registErrors: error,
          validateItem: item,
          showDeleteButton: item.validateType === VALIDATE_TYPE.JesgoError,
        });
      });

      if (documentMsg.length > 0) {
        message.push({
          message: `【 ${error.errDocTitle} 】`,
          registErrors: error,
          showDeleteButton: false,
        });

        message.push(...documentMsg);
      }
    });
  }
  return message;
};

// スキーマのタイトル取得
export const GetSchemaTitle = (id: number) => {
  const schemaInfo = GetSchemaInfo(id);
  let title = schemaInfo?.title ?? '';
  if (schemaInfo?.subtitle) {
    title += ` ${schemaInfo.subtitle}`;
  }
  return title;
};

/**
 * 無限ループの原因となっているスキーマかどうかを判定する
 * 無限ループの原因である場合はその旨のアラートも出力する
 * @param schemaId 調査対象のスキーマID
 * @returns 無限ループの原因か否か
 */
export const isInfiniteLoopBlackList = (
  schemaId: number,
  showAlert = false
): boolean => {
  const blackList: number[] = store.getState().schemaDataReducer.blackList;
  if (blackList.includes(schemaId)) {
    const title = GetSchemaTitle(schemaId);
    if (showAlert) {
      // eslint-disable-next-line no-alert
      alert(
        `${title}にエラーがあるため一部のスキーマが作成できませんでした。スキーマ定義を見直してください`
      );
    }
    return true;
  }
  return false;
};

// 指定スキーマのサブスキーマIDを孫スキーマ含めすべて取得
export const GetAllSubSchemaIds = (id: number, showAlert = false) => {
  const schemaIds: number[] = [];

  const schemaInfos = store.getState().schemaDataReducer.schemaDatas;
  const schemaInfo = schemaInfos.get(id);
  if (schemaInfo && schemaInfo[0].subschema.length > 0) {
    schemaIds.push(...schemaInfo[0].subschema);

    schemaInfo[0].subschema.forEach((schemaId) => {
      schemaIds.push(...GetAllSubSchemaIds(schemaId, showAlert)); // 再帰
    });
  }

  return schemaIds;
};

// 継承先のスキーマで作成されるドキュメントの数を取得
export const GetCreatedDocCountAfterInherit = (
  schemaId: number,
  deletedChildDocumentsObj: {
    parentDocumentId: string;
    deletedChildDocuments: jesgoDocumentObjDefine[];
  }[],
  processedDocIds: Set<string>
) => {
  const schemaInfo = GetSchemaInfo(schemaId);

  let count = 0;

  if (!schemaInfo) return 0;

  // サブスキーマを処理
  if (schemaInfo.subschema.length > 0) {
    schemaInfo.subschema.forEach((id) => {
      const hasSameSchema = deletedChildDocumentsObj.some((p) => {
        const filter = p.deletedChildDocuments.filter(
          (q) => !processedDocIds.has(q.key) && q.value.schema_id === id
        );
        if (filter.length > 0) {
          filter.forEach((q) => processedDocIds.add(q.key));

          count += filter.length;
          return true;
        }
        return false;
      });

      // 継承先にしかなかったスキーマの場合、自動作成分で1プラス
      if (!hasSameSchema) {
        count += 1;
      }

      // 再帰
      count += GetCreatedDocCountAfterInherit(
        id,
        deletedChildDocumentsObj,
        processedDocIds
      );
    });
  }

  // 子スキーマを処理
  if (schemaInfo.child_schema.length > 0) {
    schemaInfo.child_schema.forEach((id) => {
      deletedChildDocumentsObj.some((p) => {
        const filter = p.deletedChildDocuments.filter(
          (q) => !processedDocIds.has(q.key) && q.value.schema_id === id
        );
        if (filter.length > 0) {
          filter.forEach((q) => processedDocIds.add(q.key));
          count += filter.length;
          return true;
        }
        return false;
      });

      // 再帰
      count += GetCreatedDocCountAfterInherit(
        id,
        deletedChildDocumentsObj,
        processedDocIds
      );
    });
  }

  return count;
};

// タブ並び順のインデックスをタブ名に変換
export const convertTabKey = (parentTabKey: string, tabKey: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let convTabKey = tabKey;
  // インデックスからタブ名に変換
  // eslint-disable-next-line no-restricted-globals
  if (!isNaN(Number(tabKey))) {
    const allTabList = store.getState().formDataReducer.allTabList;
    const tabList = allTabList.get(parentTabKey);

    const tabIndex = parseInt(tabKey as string, 10);
    if (tabList && tabList.length > tabIndex) {
      convTabKey = tabList[tabIndex];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return convTabKey;
};

// Schemaから非表示項目を取得
export const GetHiddenPropertyNames = (schema: JSONSchema7) => {
  let hiddenItemNames: string[] = [];

  if (schema.properties) {
    hiddenItemNames = Object.entries(schema.properties)
      .filter((item) => {
        const values = item[1];
        if (values) {
          const hiddenItem = Object.entries(values).find(
            (p) => p[0] === Const.EX_VOCABULARY.UI_HIDDEN
          );
          if (hiddenItem && hiddenItem[1] === true) return true;
        }
        return false;
      })
      .map((p) => p[0]);
  }

  // 項目名を返す
  return hiddenItemNames;
};

// 同一スキーマ存在時のタイトル名設定
export const SetSameSchemaTitleNumbering = (
  schemaIds1: dispSchemaIdAndDocumentIdDefine[],
  schemaIds2?: dispSchemaIdAndDocumentIdDefine[]
) => {
  const allIds: dispSchemaIdAndDocumentIdDefine[] = [];

  // サブスキーマ
  if (schemaIds1.length > 0) {
    allIds.push(...schemaIds1.filter((p) => p.deleted === false));
  }
  // 子スキーマ
  if (schemaIds2 && schemaIds2.length > 0) {
    allIds.push(...schemaIds2.filter((p) => p.deleted === false));
  }

  if (allIds.length > 0) {
    // スキーマIDでグループ化
    const group = lodash.groupBy(allIds, 'schemaId');

    Object.keys(group).forEach((schemaId) => {
      // 複数タブあるものは数字を付与
      if (group && group[schemaId].length > 1) {
        group[schemaId].forEach((p, idx) => {
          // p.title += idx + 1;
          // p.title = p.title.replace(/[0-9]/g, '') + (idx + 1);
          p.titleNum = idx + 1;
        });
      } else {
        group[schemaId][0].titleNum = undefined;
      }
    });
  }
};

// 保存用オブジェクトのソート
export const SaveObjectSort = (obj: any) => {
  // ソートする
  let sorted: [string, unknown][] = [];
  if (obj) {
    // 更新日時は除外する
    sorted = Object.entries(lodash.omit(obj, ['last_updated'])).sort();

    // 再帰的に見る
    sorted.forEach((item) => {
      const val = item[1];
      if (typeof val === 'object') {
        // eslint-disable-next-line no-param-reassign
        item[1] = SaveObjectSort(val);
      }
    });
  }

  return sorted;
};

// 更新判定
export const IsNotUpdate = () => {
  const formDataReducer = store.getState().formDataReducer;

  // 読込時点のデータと編集中のデータを比較して、同じなら更新しない
  // メモ：json変換したデータを比較。ただしオブジェクトの順番は保証されないのでソートしてから。
  return (
    JSON.stringify(SaveObjectSort(formDataReducer.loadData)) ===
    JSON.stringify(SaveObjectSort(formDataReducer.saveData))
  );
};

// オブジェクトの空チェック
export const isNotEmptyObject = (obj: any) => {
  let hasInput = false;

  if (obj == null) {
    return hasInput;
  }

  if (typeof obj !== 'object') {
    // オブジェクト以外は未入力チェック(0は入力扱い)
    if (obj !== '') {
      hasInput = true;
    }
  } else if (Object.keys(obj).length > 0) {
    Object.entries(obj).forEach((item) => {
      const val = item[1];
      if (isNotEmptyObject(val as any)) {
        hasInput = true;
      }
    });
  }

  return hasInput;
};

/**
 * formData入力値判定
 * @param formData
 * @param schemaId
 * @returns
 */
export const hasFormDataInput = (formData: any, schemaId: number) => {
  let hasInput = false;

  // フォームデータの定義がないスキーマ(タブしかないもの)は入力あり扱いとする
  const schemaInfo = GetSchemaInfo(schemaId);
  if (schemaInfo?.document_schema) {
    const schema = schemaInfo.document_schema;

    if (schema.type === 'array') {
      // arrayだけどitemsの定義がないスキーマ
      if (!schema.items) {
        hasInput = true;
      }
    } else if (
      // type未設定のスキーマもしくはプロパティなし＝入力項目がないスキーマ
      schema.type === undefined ||
      !schema.properties ||
      Object.keys(schema.properties).length === 0
    ) {
      hasInput = true;
    }

    // フォームデータがあるスキーマの場合は入力値を見て判断
    if (!hasInput) {
      if (Array.isArray(formData)) {
        // formDataが複数ある場合(子のパネルスキーマあり)、1つでも入力があればありとする
        hasInput = formData.filter((data) => isNotEmptyObject(data)).length > 0;
      } else {
        hasInput = isNotEmptyObject(formData);
      }
    }
  }

  return hasInput;
};

// フォームの入力内容に応じてタブのスタイルを設定
export const SetTabStyle = (tabId: string, hasInput: boolean) => {
  // タブ文字色を変えるのでAタグ取得
  const aTag = document.getElementById(tabId) as HTMLAnchorElement;

  if (aTag) {
    if (hasInput) {
      // 入力値がある場合はCSS設定
      aTag.className = 'has-input';
    } else {
      aTag.className = '';
    }
  }
};

// プロパティ追加可能なオブジェクト定義
interface Obj {
  [prop: string]: any;
}

const GET_CHANGE_TYPE = {
  INHERIT: 0,
  VERSION: 1,
};

// フォームデータの引継ぎ
const transferFormData = (
  formData: any,
  baseCustomSchema: JSONSchema7,
  changedSchema: JSONSchema7,
  isOnChange = false // formDataのonChangeかどうか
) => {
  // TODO: 必ずオブジェクトではないので切り分けが必要
  const newFormData: Obj = {};

  Object.entries(formData).forEach((item) => {
    const propName = item[0];
    const propValue = item[1];

    let jsonSchema1: JSONSchema7 | undefined;
    let jsonSchema2: JSONSchema7 | undefined;

    if (baseCustomSchema.properties) {
      jsonSchema1 = baseCustomSchema.properties[propName] as JSONSchema7;
    }
    if (changedSchema.properties) {
      jsonSchema2 = changedSchema.properties[propName] as JSONSchema7;
    }

    // 継承先にデフォルト値設定ありの場合は引き継がない
    // formDataのonChange時はデフォルト値設定されないので引き継ぐ
    if (
      !isOnChange &&
      jsonSchema2 &&
      jsonSchema2.default != null &&
      jsonSchema2.default !== ''
    ) {
      return;
    }

    if (jsonSchema1 && !jsonSchema2) {
      // 継承先にプロパティがない → 引き継ぐ
      if (
        !Array.isArray(propValue) &&
        typeof propValue === 'object' &&
        propValue
      ) {
        // undefinedなプロパティは引き継がない
        const omitValue = lodash.omit(
          propValue,
          Object.entries(propValue)
            .filter((p) => p[1] === undefined)
            .map((p) => p[0])
        );
        // オブジェクトの中身が空でなければ引き継ぐ
        if (Object.keys(omitValue).length > 0) {
          newFormData[propName] = omitValue;
        }
      } else if (!Array.isArray(propValue) || propValue.length > 0) {
        // Array以外、またはArrayの場合は項目があれば引き継ぐ
        newFormData[propName] = propValue;
      }
    } else if (jsonSchema1 && jsonSchema2) {
      // 同一名のプロパティ存在 → 引き継ぐ
      if (jsonSchema1.type === jsonSchema2.type) {
        newFormData[propName] = propValue;
      }
    } else if (!jsonSchema1 && jsonSchema2) {
      // 継承元にプロパティがない ※このケースあるか？
      newFormData[propName] = propValue;
    } else {
      // 継承元にも継承先にもプロパティがない → 引き継ぐ
      newFormData[propName] = propValue;
    }
  });

  return newFormData;
};

export const GetChangedFormData = (
  changeType: number,
  baseSchemaId: number,
  inheritSchemaId: number,
  oldSchemaInfo: JSONSchema7 | null,
  eventDate: string,
  formData: any,
  isOnChange = false
) => {
  // 形式に関わらずformDataが存在しないか中身が空の場合はそのまま使いまわす
  if (
    !formData ||
    typeof formData !== 'object' ||
    Object.keys(formData).length === 0
  ) {
    return formData;
  }

  let baseCustomSchema: JSONSchema7;
  let changedSchema: JSONSchema7;

  // 継承の場合
  if (changeType === GET_CHANGE_TYPE.INHERIT) {
    // スキーマIDが同じ場合はそのまま使用できるのでそのまま返す
    if (baseSchemaId === inheritSchemaId) {
      return formData;
    }

    const baseSchemaInfo = GetSchemaInfo(baseSchemaId);
    const changedSchemaInfo = GetSchemaInfo(inheritSchemaId);

    if (!baseSchemaInfo || !changedSchemaInfo) {
      return formData;
    }

    // 継承元のスキーマ
    baseCustomSchema = CustomSchema({
      orgSchema: baseSchemaInfo.document_schema,
      formData,
    });
    // 継承先のスキーマ
    changedSchema = CustomSchema({
      orgSchema: changedSchemaInfo.document_schema,
      formData,
    });
  }
  // バージョン変更の場合
  else {
    const changedSchemaInfo = GetSchemaInfo(baseSchemaId, eventDate);
    if (!oldSchemaInfo || !changedSchemaInfo) {
      return formData;
    }

    // 継承元のスキーマ
    baseCustomSchema = CustomSchema({
      orgSchema: oldSchemaInfo,
      formData,
    });
    // 継承先のスキーマ
    changedSchema = CustomSchema({
      orgSchema: changedSchemaInfo.document_schema,
      formData,
    });
  }

  // formDataが配列の場合は配列の中身を1つずつ処理
  if (Array.isArray(formData)) {
    return formData.map((fm) =>
      transferFormData(fm, baseCustomSchema, changedSchema, isOnChange)
    );
  }

  return transferFormData(
    formData,
    baseCustomSchema,
    changedSchema,
    isOnChange
  );
};

export const GetInheritFormData = (
  baseSchemaId: number,
  inheritSchemaId: number,
  formData: any,
  isOnChange = false
) =>
  GetChangedFormData(
    GET_CHANGE_TYPE.INHERIT,
    baseSchemaId,
    inheritSchemaId,
    null,
    '',
    formData,
    isOnChange
  );

export const GetVersionedFormData = (
  schemaId: number,
  oldSchemaInfo: JSONSchema7,
  eventDate: string,
  formData: any,
  isOnChange = false
) =>
  GetChangedFormData(
    GET_CHANGE_TYPE.VERSION,
    schemaId,
    schemaId,
    oldSchemaInfo,
    eventDate,
    formData,
    isOnChange
  );

export const GetBeforeInheritDocumentData = (
  parentDocId: string,
  schemaId: number
) => {
  let retDocs: jesgoDocumentObjDefine[] = [];
  let searchDocId = parentDocId;

  const deletedDocuments = store.getState().formDataReducer.deletedDocuments;

  // 処理済みドキュメント
  const processedDocumentIds =
    store.getState().formDataReducer.processedDocumentIds;

  // 親のIDが仮番の場合、旧IDを取得
  if (parentDocId.startsWith('K')) {
    const item = processedDocumentIds.find((p) => p[1] === parentDocId);
    if (item) {
      searchDocId = item[0];
    }
  }

  if (searchDocId === '') {
    // documentIdの指定がない場合は全検索
    deletedDocuments.forEach((item) => {
      const filter = item.deletedChildDocuments.filter(
        (p) =>
          p.value.schema_id === schemaId &&
          !processedDocumentIds.find((q) => q[0] === p.key)
      );
      if (filter.length > 0) {
        retDocs = filter;
      }
    });
  } else {
    // documentIdの指定がある場合はそのdocumentIdに紐づくデータを取得
    const deletedItem = deletedDocuments.find(
      (p) => p.parentDocumentId === searchDocId
    );
    if (deletedItem) {
      const baseDoc = deletedItem.deletedChildDocuments.filter(
        (p) =>
          p.value.schema_id === schemaId &&
          !processedDocumentIds.find((q) => q[0] === p.key)
      );
      if (baseDoc.length > 0) {
        retDocs = baseDoc;
      }
    }
  }

  return retDocs;
};

/**
 * データ出力用画面オープン
 * @param win window
 * @param srcData 出力するデータ
 */
export const OpenOutputView = (
  win: typeof window,
  srcData: any,
  type: string | undefined = undefined
) => {
  // デバッグ: OpenOutputView関数が呼ばれたことをログ出力
  console.log('[OpenOutputView] 関数が呼ばれました:', {
    type: typeof srcData,
    isArray: Array.isArray(srcData),
    isNull: srcData == null,
    value: srcData,
    stringified: typeof srcData === 'string' ? srcData : JSON.stringify(srcData),
  });

  // 表示データがない場合は開かない
  if (srcData == null) {
    console.log('[OpenOutputView] srcDataがnullのため、処理を中断');
    return;
  }

  const postData = (e: MessageEvent<any>) => {
    console.log('[OpenOutputView] postDataが呼ばれました:', {
      origin: e.origin,
      winOrigin: win.location.origin,
      data: e.data,
      isOutputReady: e.data === 'output_ready',
      originMatch: e.origin === win.location.origin,
    });

    // 画面の準備ができたらデータをポストする
    if (e.origin === win.location.origin && e.data === 'output_ready') {
      console.log('[OpenOutputView] 条件が満たされました。データを送信します。');
      // デバッグ: OpenOutputViewで受け取ったデータをログ出力
      console.log('[OpenOutputView] 送信するデータ:', {
        type: typeof srcData,
        isArray: Array.isArray(srcData),
        isNull: srcData == null,
        value: srcData,
        stringified: typeof srcData === 'string' ? srcData : JSON.stringify(srcData),
      });

      if (type && type === 'overwritelog') {
        e.source?.postMessage({ viewerType: 'log', csvData: srcData });
      } else {
        // すべてのデータをjsonDataプロパティとして送信（配列、オブジェクト、文字列すべて）
        // これにより、受信側で一貫してjsonDataプロパティをチェックできる
        let dataToSend: any;
        
        if (typeof srcData === 'string') {
          // 文字列の場合、JSON文字列の可能性をチェック
          try {
            const parsed = JSON.parse(srcData);
            console.log('[OpenOutputView] JSON文字列をパースしてJSON形式として送信');
            dataToSend = { jsonData: parsed };
          } catch {
            // JSONでない場合は文字列として送信（文字列の場合はjsonDataプロパティを使わない）
            console.log('[OpenOutputView] 文字列として送信');
            dataToSend = srcData;
          }
        } else {
          // 配列、オブジェクト、その他の場合、すべてjsonDataとして送信
          console.log('[OpenOutputView] データをjsonDataプロパティとして送信:', {
            type: typeof srcData,
            isArray: Array.isArray(srcData),
          });
          dataToSend = { jsonData: srcData };
        }
        
        console.log('[OpenOutputView] 実際に送信するデータ:', dataToSend);
        e.source?.postMessage(dataToSend);
      }
      win.removeEventListener('message', postData, false);
    } else {
      console.log('[OpenOutputView] 条件が満たされませんでした:', {
        originMatch: e.origin === win.location.origin,
        dataMatch: e.data === 'output_ready',
        actualData: e.data,
        actualOrigin: e.origin,
      });
    }
  };

  console.log('[OpenOutputView] messageイベントリスナーを登録しました');
  win.addEventListener('message', postData, false);

  console.log('[OpenOutputView] OutputViewウィンドウを開きます');
  win.open('/OutputView', 'outputview');
};

export const OpenOutputViewScript = (win: typeof window, srcData: string) => {
  // 表示データがない場合は開かない
  if (srcData == null) {
    return;
  }
  const postFunc = (e: MessageEvent) => {
    // 画面の準備ができたらデータをポストする
    if (e.origin === win.location.origin && e.data === 'output_ready') {
      e.source?.postMessage(srcData);
    }

    win.removeEventListener('message', postFunc);
  };

  win.addEventListener('message', postFunc, false);

  win.open('/OutputView', 'outputview');
};

/**
 * エラー一覧にjesgo:errorの内容を追加する
 * @param formData
 * @param paramErrors
 * @param documentId
 * @param schemaId
 * @param schema
 * @param notAdd [true]jesgo:errorを追加しない(削除フラグを渡す想定)
 * @returns
 */
export const AddJesgoError = (
  paramErrors: RegistrationErrors[],
  formData: any,
  documentId: string,
  schemaId: number,
  schema: JSONSchema7,
  notAdd = false
) => {
  // jesgo:errorを取得
  const jesgoErrors = popJesgoError(formData);
  const errors = paramErrors;

  // 元々あったjesgo:errorのエラーはクリアする
  const targetErr = errors.find((p) => p.documentId === documentId);
  if (targetErr) {
    // jesgo:errorは除く
    const filteredMsg = targetErr.validationResult.messages.filter(
      (q) => q.validateType !== VALIDATE_TYPE.JesgoError
    );
    targetErr.validationResult.messages = filteredMsg;
  }
  // jesgo:errorクリア処理↑ここまで↑

  if (jesgoErrors.length > 0 && !notAdd) {
    // エラー一覧に対象ドキュメントがない場合は新規追加する
    let tmpErr = errors.find((p) => p.documentId === documentId);
    if (!tmpErr) {
      const saveData = store.getState().formDataReducer.saveData;
      const doc = saveData.jesgo_document.find((p) => p.key === documentId);
      let titleList: string[] = [];
      if (doc) {
        // 親のタイトル取得
        titleList = GetParentDocumentTitle(saveData, documentId);
        // 親→子の順にしたいのでリバース
        titleList = titleList.reverse();
        const schemaInfo = GetSchemaInfo(schemaId, doc.value.event_date);
        // 自身のタイトル追加
        let title = `${schemaInfo?.title ?? ''} ${
          schemaInfo?.subtitle ?? ''
        }`.trim();
        title = GetNumberingTabTitle(saveData, doc, title);
        titleList.push(title);
      }

      tmpErr = {
        errDocTitle: titleList.join(' > ') ?? '',
        schemaId,
        documentId,
        validationResult: { schema, messages: [] },
      };
      errors.push(tmpErr);
    }

    const messages = tmpErr.validationResult.messages;

    // jesgo:errorから画面表示用のメッセージを生成
    jesgoErrors.forEach((errorItem, index) => {
      if (typeof errorItem === 'string') {
        // 文字列の場合はそのまま表示
        messages.push({
          // eslint-disable-next-line no-irregular-whitespace
          message: `　${errorItem}`,
          validateType: VALIDATE_TYPE.JesgoError,
          jsonpath: `/${index}`,
        });
      } else if (typeof errorItem === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        Object.entries(errorItem).forEach((item) => {
          // objectの場合はKeyに項目名、valueにメッセージが格納されている想定
          messages.push({
            // eslint-disable-next-line no-irregular-whitespace
            message: `　　[ ${item[0]} ] ${item[1] as string}`,
            validateType: VALIDATE_TYPE.JesgoError,
            // 特殊文字はエスケープしないとjsonpatchのpathとして使えない(チルダ、スラッシュ)
            jsonpath: `/${index}/${item[0]
              .replace(/~/g, '~0')
              .replace(/\//g, '~1')}`,
          });
        });
      }
    });
  }

  return errors;
};

/**
 * jesgo:requiredのハイライト設定
 */
export type JesgoRequiredHighlight = {
  jsog: boolean; // JSOG
  jsgoe: boolean; // JSGOE
  others: boolean; // JSOG・JSGOE以外(独自拡張を想定)
};
