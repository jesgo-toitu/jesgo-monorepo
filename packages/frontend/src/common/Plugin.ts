/* eslint-disable no-alert */
/* eslint-disable no-loop-func */
/* eslint-disable array-callback-return */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-lonely-if */
import { Buffer } from 'buffer';
import React from 'react';
import lodash from 'lodash';
import {
  OverwriteDialogPlop,
  overwriteInfo,
  overWriteSchemaInfo,
} from '../components/common/PluginOverwriteConfirm';
import { jesgoCaseDefine, SaveDataObjDefine } from '../store/formDataReducer';
import { reloadState } from '../views/Registration';
import apiAccess, { METHOD_TYPE, RESULT } from './ApiAccess';
import { OpenOutputView } from './CaseRegistrationUtility';
import {
  generateUuid,
  getArrayWithSafe,
  getPointerTrimmed,
  isPointerWithArray,
  toUTF8,
  fTimeout,
} from './CommonUtility';
import { GetPackagedDocument } from './DBUtility';
import { Const } from './Const';

window.Buffer = Buffer;

export type jesgoPluginColumns = {
  plugin_id: number;
  plugin_name: string;
  plugin_version?: string;
  script_text: string;
  target_schema_id?: number[];
  target_schema_id_string?: string;
  all_patient: boolean;
  update_db: boolean;
  attach_patient_info: boolean;
  show_upload_dialog: boolean;
  filter_schema_query?: string;
  explain?: string;
  newdata?: boolean;
  disabled?: boolean;
  plugin_group_id?: number;
};

type argDoc = {
  caseList: jesgoCaseDefine[];
  targetSchemas?: number[] | undefined;
  targetDocument?: number | undefined;
  filterQuery: string | undefined;
};

type updateObject = {
  isConfirmed?: boolean;
  document_id?: number;
  case_id?: number;
  hash?: string;
  case_no?: string;
  schema_id?: string;
  schema_ids?: number[];
  target: Record<string, string | number>;
  patient_info?: {
    his_id: string;
    date_of_birth: string;
    name: string;
  };
  child_documents?: updateObject[];
};

let pluginData: jesgoPluginColumns;
let targetCaseId: number | undefined;
let setOverwriteDialogPlopGlobal:
  | React.Dispatch<React.SetStateAction<OverwriteDialogPlop | undefined>>
  | undefined;
let setIsLoadingGlobal:
  | React.Dispatch<React.SetStateAction<boolean>>
  | undefined;

// モジュールのFunc定義インターフェース
interface IPluginModule {
  init: () => Promise<jesgoPluginColumns>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  main: (doc: any, func: (args: any[]) => Promise<any>) => Promise<unknown>;
  finalize?: () => Promise<void>;
  importDocument?: (
    doc: any,
    func: (args: any[]) => Promise<any>
  ) => Promise<unknown>;
}

export const GetModule: (scriptText: string) => Promise<IPluginModule> = async (
  scriptText: string
) => {
  // バックエンドから読み込み予定のスクリプト文字列
  const readScriptText = Buffer.from(scriptText).toString('base64');
  const script = `data:text/javascript;base64,${readScriptText}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pluginmodule: Promise<IPluginModule> = await import(
      /* webpackIgnore: true */ script
    ); // webpackIgnoreコメント必要
    return pluginmodule;
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert(
      `【pluginの実行処理中にエラーが発生しました】\n${(e as Error).message}`
    );
    console.error(e as Error);
    return undefined as unknown as IPluginModule;
  }
};

const getPatientsDocument = async (doc: argDoc) => {
  const schemaIds =
    doc.targetSchemas && doc.targetSchemas.length > 0
      ? doc.targetSchemas
      : undefined;
  const ret = await GetPackagedDocument(
    doc.caseList,
    schemaIds,
    undefined,
    doc.filterQuery,
    pluginData.attach_patient_info
  );
  if (ret.resCode === RESULT.NORMAL_TERMINATION) {
    return ret.anyValue ? JSON.stringify(ret.anyValue) : undefined;
  }
  return undefined;
};

const getTargetDocument = async (doc: argDoc) => {
  const ret = await GetPackagedDocument(
    doc.caseList,
    undefined,
    doc.targetDocument,
    doc.filterQuery,
    pluginData.attach_patient_info
  );
  if (ret.resCode === RESULT.NORMAL_TERMINATION) {
    return ret.anyValue ? JSON.stringify(ret.anyValue) : undefined;
  }
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updatePatientsDocument = async (
  doc: updateObject | updateObject[] | argDoc | undefined,
  getPackagedDocumentInsted = false
) => {
  type updateCheckObject = {
    uuid?: string;
    pointer: string;
    record: string | number | any[] | undefined;
    document_id: number;
    schema_title?: string;
    current_value?: string | number | any[] | undefined;
    updated_value?: string | number | any[] | undefined;
  };

  type checkApiReturnObject = {
    his_id?: string;
    patient_name?: string;
    checkList: updateCheckObject[];
    updateList: updateCheckObject[];
  };

  type overwroteObject = {
    uuid?: string;
    his_id: string;
    patient_name: string;
    schema_title: string;
    pointer: string;
    current_value?: string | number | any[] | undefined;
    updated_value?: string | number | any[] | undefined;
    isArray: boolean;
    overwrote: number;
  };

  const OVERWROTE_STATUS = {
    OVERWROTE: 1,
    SKIP: 2,
    FAILED: 3,
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const modalHide = () => {};

  if (!doc) {
    // 処理を中止
    // eslint-disable-next-line no-alert
    alert('更新用オブジェクトが不足しています');
    return;
  }

  // updateではなくてdocument_idに基づいたひとまとめのドキュメントを取得して返す
  if (getPackagedDocumentInsted) {
    // セキュリティとして制約あり
    if ((doc as argDoc).caseList.length === 0) {
      alert(
        '更新系プラグインからのpackagedドキュメントの取得にはcase_idの指定が必須です'
      );
      return;
    }
    if ((doc as argDoc).caseList.length > 1) {
      alert(
        '更新系プラグインから複数の症例のデータを一度に取得することはできません'
      );
      return;
    }
    if (Number.isNaN(Number((doc as argDoc).targetDocument))) {
      alert(
        '更新系プラグインからのpackagedドキュメント取得にはdocument_idの指定が必須です'
      );
      return;
    }
    return await getTargetDocument(doc as argDoc);
  }

  // スキップフラグ
  let isSkip = false;

  // 引数を配列でなければupdateObjectの配列にする(argDocはここで落とす)
  const localUpdateTarget = Array.isArray(doc) ? doc : [doc as updateObject];

  if (pluginData) {
    // 最初に症例IDとドキュメントIDの組み合わせリストを取得する
    const caseIdAndDocIdListRet = await apiAccess(
      METHOD_TYPE.GET,
      `getCaseIdAndDocIdList`
    );

    // ハッシュと症例IDの組み合わせリストも取得する
    const caseIdAndHashListRet = await apiAccess(
      METHOD_TYPE.GET,
      `getCaseIdAndHashList`
    );

    // 腫瘍登録番号と症例IDの組み合わせリストも取得する
    const caseIdAndCaseNoListRet = await apiAccess(
      METHOD_TYPE.GET,
      `getCaseIdAndCaseNoList`
    );

    const caseIdAndDocIdList = caseIdAndDocIdListRet.body as {
      case_id: number;
      document_id: number;
    }[];
    const caseIdAndHashList = caseIdAndHashListRet.body as {
      case_id: number;
      hash: string;
    }[];
    const caseIdAndCaseNoList = caseIdAndCaseNoListRet.body as {
      case_id: number;
      caseNo: string;
    }[];

    const updateObjByCase: Map<number, updateObject[]> = new Map();
    const overwroteList: overwroteObject[] = [];

    // eslint-disable-next-line no-plusplus
    for (let index = 0; index < localUpdateTarget.length; index++) {
      const patientItem = localUpdateTarget[index];
      let tempCaseId: number | undefined;
      if (targetCaseId) {
        tempCaseId = targetCaseId;
      } else if (patientItem.case_id) {
        tempCaseId = patientItem.case_id;
      } else if (patientItem.hash) {
        tempCaseId = caseIdAndHashList.find(
          (p) => p.hash === patientItem.hash
        )?.case_id;
      } else if (patientItem.case_no) {
        tempCaseId = caseIdAndCaseNoList.find(
          (p) => p.caseNo === patientItem.case_no
        )?.case_id;
      } else if (patientItem.document_id) {
        tempCaseId = caseIdAndDocIdList.find(
          (p) => p.document_id === patientItem.document_id
        )?.case_id;
      }

      if (tempCaseId) {
        if (!updateObjByCase.get(tempCaseId)) {
          updateObjByCase.set(tempCaseId, []);
        }
        const oldObj = updateObjByCase.get(tempCaseId);
        if (Array.isArray(oldObj))
          updateObjByCase.set(tempCaseId, oldObj.concat(patientItem));
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const [key, value] of updateObjByCase.entries()) {
      // 症例毎の処理
      // targetが複数あるものをバラしたものを入れるための配列
      const updateApiObjects: updateObject[] = [];

      for (let index = 0; index < value.length; index++) {
        const obj = value[index];
        // eslint-disable-next-line
        for (const targetKey in obj.target) {
          const newObj: updateObject = {
            document_id: obj.document_id,
            case_id: targetCaseId,
            hash: obj.hash,
            case_no: obj.case_no,
            schema_id: obj.schema_id,
            schema_ids: pluginData.target_schema_id,
            target: { [targetKey]: obj.target[targetKey] },
          };
          updateApiObjects.push(newObj);
        }
      }
      // 全てのアップデート用オブジェクトを分解し終えたら症例毎にAPIに送る

      const ret = await apiAccess(METHOD_TYPE.POST, `plugin-update`, {
        case_id: key,
        objects: updateApiObjects,
      });

      // 上書き結果表示用オブジェクト変換用関数
      const getOverwroteObject = (
        target: updateCheckObject,
        hisId: string,
        patientName: string,
        isOverwrote: number
      ) => {
        let tmpPointer = target.pointer.slice(1);
        let isArray = false;
        // 配列用のポインターかをチェックし、そうならポインター末尾を切り取り
        if (isPointerWithArray(tmpPointer)) {
          tmpPointer = getPointerTrimmed(tmpPointer);
          isArray = true;
        } else if (
          Array.isArray(target.current_value) ||
          Array.isArray(target.updated_value)
        ) {
          // 配列用のポインターで無くても中が配列なら配列として処理する
          isArray = true;
        }

        const overwrote: overwroteObject = {
          uuid: target.uuid,
          his_id: hisId,
          patient_name: patientName,
          pointer: tmpPointer,
          schema_title: target.schema_title ?? '',
          current_value: target.current_value,
          updated_value: target.updated_value,
          isArray,
          overwrote: isOverwrote,
        };

        return overwrote;
      };

      // 返ってきたオブジェクトのうちチェック用オブジェクトを処理する
      if (ret.statusNum === RESULT.NORMAL_TERMINATION) {
        const retData = ret.body as checkApiReturnObject;
        const data: overwriteInfo = {
          his_id: retData.his_id ?? '',
          patient_name: retData.patient_name ?? '',
          schemaList: [],
        };

        if (isSkip) {
          retData.updateList = retData.updateList.concat(retData.checkList);
          for (let index = 0; index < retData.checkList.length; index++) {
            const target = retData.checkList[index];
            overwroteList.push(
              getOverwroteObject(
                target,
                data.his_id,
                data.patient_name,
                OVERWROTE_STATUS.OVERWROTE
              )
            );
          }
        } else {
          for (let index = 0; index < retData.checkList.length; index++) {
            const checkData = retData.checkList[index];
            const existIndex = data.schemaList?.findIndex(
              (p) => p.schema_title === checkData.schema_title
            );

            if (existIndex != null && existIndex !== -1) {
              checkData.uuid = generateUuid();
              const itemData = {
                isOverwrite: true,
                uuid: checkData.uuid,
                item_name: checkData.pointer.slice(1),
                current_value: checkData.current_value,
                updated_value: checkData.updated_value,
              };
              data.schemaList?.[existIndex].itemList.push(itemData);
            } else {
              checkData.uuid = generateUuid();
              const schemaData = {
                schema_title: checkData.schema_title ?? '',
                itemList: [
                  {
                    isOverwrite: true,
                    uuid: checkData.uuid,
                    item_name: checkData.pointer.slice(1),
                    current_value: checkData.current_value,
                    updated_value: checkData.updated_value,
                  },
                ],
              };
              data.schemaList?.push(schemaData);
            }
          }
        }

        // チェック用ダイアログ表示処理
        if (
          setOverwriteDialogPlopGlobal &&
          setIsLoadingGlobal &&
          data.schemaList &&
          data.schemaList.length > 0
        ) {
          setIsLoadingGlobal(false);
          const modalRet = await new Promise<{
            result: boolean;
            skip: boolean;
            body: overWriteSchemaInfo[];
          }>((resolve) => {
            setOverwriteDialogPlopGlobal?.({
              show: true,
              onHide: () => modalHide,
              onClose: resolve,
              title: 'JESGO',
              type: 'Confirm',
              data,
            });
          });
          setOverwriteDialogPlopGlobal?.(undefined);
          setIsLoadingGlobal(true);
          // OKボタンが押されたときのみ処理
          if (modalRet.result) {
            // 以降スキップがONならフラグを立てる
            isSkip = modalRet.skip;

            // 上書きフラグがtrueの物のみアップデートリストに追加する
            modalRet.body.map((schema) => {
              schema.itemList.map((item) => {
                const processedItem = retData.checkList.find(
                  (c) => c.uuid === item.uuid
                );
                if (processedItem) {
                  if (item.isOverwrite) {
                    retData.updateList.push(processedItem);
                  }
                  overwroteList.push(
                    getOverwroteObject(
                      processedItem,
                      data.his_id,
                      data.patient_name,
                      item.isOverwrite
                        ? OVERWROTE_STATUS.OVERWROTE
                        : OVERWROTE_STATUS.SKIP
                    )
                  );
                }
              });
            });
          }
        }

        // チェックの有無に関わらず更新リストに書いてある内容をすべて更新する
        const executeRet = await apiAccess(
          METHOD_TYPE.POST,
          `executeUpdate`,
          retData.updateList
        );

        if (executeRet.statusNum !== RESULT.NORMAL_TERMINATION) {
          for (let index = 0; index < retData.updateList.length; index++) {
            // 更新に失敗したものはステータスを変更する
            const failedData = retData.updateList[index];
            const target = overwroteList.find(
              (p) => p.uuid === failedData.uuid
            );
            if (target) {
              target.overwrote = OVERWROTE_STATUS.FAILED;
            }
          }
          // eslint-disable-next-line no-alert
          alert(
            `患者番号:${retData.his_id ?? ''} 患者名:${
              retData.patient_name ?? ''
            } の症例データの更新に失敗しました。`
          );
        }
      }
    }

    // 全ての症例の処理が終わったあとに上書きリストを出力する
    if (overwroteList.length > 0) {
      const csv: string[][] = [
        [
          '患者ID',
          '患者氏名',
          'スキーマ',
          '項目',
          '順番',
          '変更前',
          '変更後',
          '上書き',
        ],
      ];

      const getCsvRow = (
        target: overwroteObject,
        arrayNum: number | undefined = undefined
      ) => {
        let currentValue: string;
        let updatedValue: string;
        if (typeof target.current_value === 'string') {
          currentValue = target.current_value;
        } else if (
          typeof target.current_value === 'number' ||
          typeof target.current_value === 'boolean'
        ) {
          currentValue = target.current_value.toString();
        } else {
          currentValue = JSON.stringify(target.current_value);
        }

        if (typeof target.updated_value === 'string') {
          updatedValue = target.updated_value;
        } else if (
          typeof target.updated_value === 'number' ||
          typeof target.updated_value === 'boolean'
        ) {
          updatedValue = target.updated_value.toString();
        } else {
          updatedValue = JSON.stringify(target.updated_value);
        }
        let overwroteStatus = '';
        switch (target.overwrote) {
          case OVERWROTE_STATUS.OVERWROTE:
            overwroteStatus = '済';
            break;

          case OVERWROTE_STATUS.SKIP:
            overwroteStatus = 'スキップ';
            break;

          case OVERWROTE_STATUS.FAILED:
            overwroteStatus = '更新失敗';
            break;

          default:
        }
        const csvText = [
          target.his_id,
          target.patient_name,
          target.schema_title,
          target.pointer,
          arrayNum?.toString() ?? '',
          currentValue,
          updatedValue,
          overwroteStatus,
        ];
        return csvText;
      };

      for (let index = 0; index < overwroteList.length; index++) {
        const element = overwroteList[index];
        if (element.isArray) {
          const rowCount = Math.max(
            ((element.current_value ?? []) as any[]).length,
            ((element.updated_value ?? []) as any[]).length
          );
          for (let arrayIndex = 0; arrayIndex < rowCount; arrayIndex++) {
            const tmpObj: overwroteObject = {
              his_id: element.his_id,
              patient_name: element.patient_name,
              pointer: element.pointer,
              schema_title: element.schema_title,
              // eslint-disable-next-line
              current_value:
                getArrayWithSafe(element.current_value, arrayIndex) ?? '',
              // eslint-disable-next-line
              updated_value:
                getArrayWithSafe(element.updated_value, arrayIndex) ?? '',
              isArray: false,
              overwrote: element.overwrote,
            };
            csv.push(getCsvRow(tmpObj, arrayIndex + 1));
          }
        } else {
          csv.push(getCsvRow(element));
        }
      }
      OpenOutputView(window, csv, 'overwritelog');
    }
  }
};

/**
 * 患者・ドキュメント情報インポート
 * @param doc
 * @returns
 */
const insertPatientsDocument = async (
  doc: updateObject | updateObject[] | undefined
) => {
  const insertResultList: {
    his_id: string;
    success: boolean;
    errorMsg?: string;
  }[] = [];

  if (!doc) {
    // 処理を中止
    // eslint-disable-next-line no-alert
    alert('更新用オブジェクトが不足しています');
    return insertResultList;
  }

  // 引数を配列でなければupdateObjectの配列にする
  const localUpdateTarget = Array.isArray(doc) ? doc : [doc];

  if (pluginData) {
    const updateObjByHisId: Map<string, updateObject[]> = new Map();

    // eslint-disable-next-line no-plusplus
    for (let index = 0; index < localUpdateTarget.length; index++) {
      const patientItem = localUpdateTarget[index];

      if (
        patientItem.patient_info &&
        patientItem.patient_info.his_id &&
        patientItem.patient_info.date_of_birth &&
        patientItem.patient_info.name
      ) {
        if (!updateObjByHisId.has(patientItem.patient_info.his_id)) {
          updateObjByHisId.set(patientItem.patient_info.his_id, []);
        }
        // 同じ患者IDのオブジェクトは1つにまとめる
        const popItem = updateObjByHisId.get(patientItem.patient_info.his_id);
        if (popItem) {
          popItem.push(patientItem);
          updateObjByHisId.set(patientItem.patient_info.his_id, popItem);
        }
      }
    }

    const newUpdateObjects: updateObject[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for await (const [hisId, value] of updateObjByHisId.entries()) {
      const ret = await apiAccess(METHOD_TYPE.POST, `register-case`, {
        objects: value,
      });
      if (ret.statusNum === RESULT.NORMAL_TERMINATION) {
        // 登録成功したらupdateに切り替える
        const patInfo = ret.body as {
          case_id: number;
          his_id: string;
          patient_name: string;
          returnUpdateObjects: updateObject[];
        };

        // 成功
        insertResultList.push({ his_id: patInfo.his_id, success: true });

        // returnUpdateObjectsにはAPIに渡したobjectsに確定済みのdocument_idが付与されて戻ってくる
        if (patInfo.returnUpdateObjects) {
          // 更新用オブジェクト生成。child_documentsなどを一つの配列にまとめる
          const tmpFunc = (data: updateObject) => {
            if (data.child_documents && data.child_documents.length > 0) {
              data.child_documents.forEach((item) => tmpFunc(item));
              // 追加し終えたchild_documentsは削除
              // eslint-disable-next-line no-param-reassign
              delete data.child_documents;
            }
            // 新規登録用オブジェクトに付与されたpatient_infoも削除
            // eslint-disable-next-line no-param-reassign
            delete data.patient_info;
            newUpdateObjects.push(data);
          };

          patInfo.returnUpdateObjects.forEach((item) => {
            tmpFunc(item);
          });
        }
      } else {
        // 失敗
        insertResultList.push({
          his_id: hisId,
          success: false,
          errorMsg: ret.body as string,
        });
      }
    }

    // 更新処理呼び出し
    await updatePatientsDocument(newUpdateObjects, false);
  }
  return insertResultList;
};

export const moduleMain = async (
  scriptText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (doc: any) => Promise<any>,
  doc?: { caseList?: jesgoCaseDefine[]; targetSchemas?: number[] }
): Promise<unknown> => {
  // モジュール読み込みからのmain実行
  const module = await GetModule(scriptText);
  try {
    const retValue = await module.main(doc, func);
    return retValue;
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert(`【main関数実行時にエラーが発生しました】\n${(e as Error).message}`);
    console.error(e as Error);
  } finally {
    if (module?.finalize) {
      await module.finalize();
    }
  }
  return undefined;
};

type formDocument = {
  document_id?: number;
  case_id?: number;
  hash?: string;
  schema_id?: string;
  document: JSON;
};

export const moduleMainUpdate = async (
  scriptText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (doc: any) => Promise<any>,
  doc?: string | formDocument[]
): Promise<unknown> => {
  // モジュール読み込みからのmain実行、引数にCSVファイルを利用することあり
  const module = await GetModule(scriptText);
  try {
    const retValue = await module.main(doc, func);
    return retValue;
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert(`【main関数実行時にエラーが発生しました】\n${(e as Error).message}`);
  } finally {
    if (module?.finalize) {
      await module.finalize();
    }
  }
  return undefined;
};

export const moduleImportDocument = async (
  scriptText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (doc: any) => Promise<any>,
  doc?: string
): Promise<unknown> => {
  // モジュール読み込みからのmain実行、引数にCSVファイルを利用することあり
  const module = await GetModule(scriptText);
  try {
    if (!module.importDocument) {
      return undefined;
    }
    const retValue = await module.importDocument(doc, func);
    return retValue;
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert(
      `【importDocument関数実行時にエラーが発生しました】\n${
        (e as Error).message
      }`
    );
  } finally {
    if (module?.finalize) {
      await module.finalize();
    }
  }
  return undefined;
};

const getDocuments = async (
  caseId: number | undefined,
  schemaIds: number[] | undefined
) => {
  let param = '';
  if (caseId) {
    param += `?caseId=${caseId}`;
  }
  if (schemaIds) {
    if (param.length > 0) {
      param += '&';
    } else {
      param += '?';
    }
    param += `schemaIds=${schemaIds.join(',')}`;
  }
  const ret = await apiAccess(METHOD_TYPE.GET, `getPatientDocuments${param}`);
  if (ret.statusNum === RESULT.NORMAL_TERMINATION) {
    return ret.body as formDocument[];
  }
  return [];
};

const receiveUploadText = async (
  setIsLoading:
    | React.Dispatch<React.SetStateAction<boolean>>
    | undefined = undefined
) =>
  new Promise((resolve, reject) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = () => {
      const files = fileInput.files;
      const file = files ? files[0] : undefined;
      if (file) {
        if (setIsLoading) {
          setIsLoading(true);
        }
        const reader = new FileReader();
        reader.onload = async () => {
          if (setIsLoading) {
            setIsLoading(false);
          }
          const data = reader.result;
          if (typeof data === 'string') {
            resolve(new TextDecoder().decode(toUTF8(data)));
          }
        };
        reader.readAsText(file, 'SJIS');
      } else {
        reject();
      }
    };
    // アップロードキャンセル
    fileInput.addEventListener('cancel', () => {
      if (setIsLoading) {
        setIsLoading(false);
      }
      reject();
    });
    fileInput.click();
  });

/**
 * 新規患者、ドキュメント登録用
 * @param plugin
 * @param setReload
 * @param setIsLoading
 * @param setOverwriteDialogPlop
 * @returns
 */
const newDocumentImport = async (
  plugin: jesgoPluginColumns,
  setReload:
    | ((value: React.SetStateAction<reloadState>) => void)
    | undefined = undefined,
  setIsLoading:
    | React.Dispatch<React.SetStateAction<boolean>>
    | undefined = undefined,
  setOverwriteDialogPlop:
    | React.Dispatch<React.SetStateAction<OverwriteDialogPlop | undefined>>
    | undefined = undefined
) => {
  if (plugin.show_upload_dialog) {
    // ファイルアップロードあり
    try {
      const csvText: string = (await receiveUploadText(undefined)) as string;
      const retValue = await moduleImportDocument(
        plugin.script_text,
        insertPatientsDocument,
        csvText
      );
      if (setReload) {
        setReload({ isReload: true, caller: 'update_plugin' });
      }
      return retValue;
    } catch {
      console.error('Rejected');
      return undefined;
    }
  } else {
    // ファイルアップロードなし
    try {
      const retValue = await moduleImportDocument(
        plugin.script_text,
        insertPatientsDocument
      );
      if (setReload) {
        setReload({ isReload: true, caller: 'update_plugin' });
      }
      return retValue;
    } catch {
      return undefined;
    }
  }
};

/**
 * プラグイン実行をタイムアウト付きで実行する共通関数
 * @param plugin プラグイン情報
 * @param executeFn 実行する関数
 * @param setIsLoading ローディング状態を設定する関数
 * @returns 実行結果
 */
export const executePluginWithTimeout = async (
  plugin: jesgoPluginColumns,
  executeFn: () => Promise<unknown>,
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<unknown> => {
  if (setIsLoading) {
    setIsLoading(true);
  }
  try {
    const res = await Promise.race([
      fTimeout(Const.PLUGIN_TIMEOUT_SEC),
      executeFn(),
    ]);
    if (!plugin.update_db) {
      // デバッグ: プラグイン実行結果をログ出力
      console.log('[executePluginWithTimeout] プラグイン実行結果:', {
        type: typeof res,
        isArray: Array.isArray(res),
        value: res,
        stringified: typeof res === 'string' ? res : JSON.stringify(res),
      });
      // eslint-disable-next-line
      OpenOutputView(window, res);
    }
    return res;
  } catch (err) {
    if (err === 'timeout') {
      // eslint-disable-next-line no-alert
      alert('操作がタイムアウトしました');
    }
    throw err;
  } finally {
    if (setIsLoading) {
      setIsLoading(false);
    }
  }
};

/**
 * プラグイン実行
 * @param plugin
 * @param patientList
 * @param targetDocumentId
 * @param setReload
 * @param setIsLoading
 * @param setOverwriteDialogPlop
 * @returns
 */
export const executePlugin = async (
  plugin: jesgoPluginColumns,
  patientList: jesgoCaseDefine[] | undefined,
  targetDocumentId: number | undefined = undefined,
  setReload:
    | ((value: React.SetStateAction<reloadState>) => void)
    | undefined = undefined,
  setIsLoading:
    | React.Dispatch<React.SetStateAction<boolean>>
    | undefined = undefined,
  setOverwriteDialogPlop:
    | React.Dispatch<React.SetStateAction<OverwriteDialogPlop | undefined>>
    | undefined = undefined
) => {
  pluginData = plugin;
  setOverwriteDialogPlopGlobal = setOverwriteDialogPlop;
  setIsLoadingGlobal = setIsLoading;

  let copyPatientList = lodash.cloneDeep(patientList);

  // 全患者対象のプラグインで、患者リストが空または未定義の場合、全患者を取得
  if (
    plugin.all_patient &&
    (!copyPatientList || copyPatientList.length === 0) &&
    !plugin.update_db
  ) {
    console.log('[executePlugin] 全患者対象プラグイン: 全患者を取得します');
    try {
      const patientsResult = await apiAccess(METHOD_TYPE.GET, '/patientlist');
      if (patientsResult.statusNum === RESULT.NORMAL_TERMINATION) {
        const responseData = patientsResult.body as any;
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          copyPatientList = responseData.data.map((patient: any) => {
            const caseinfo: jesgoCaseDefine = {
              case_id: (patient.caseId || patient.case_id).toString(),
              name: patient.patientName || patient.name || '',
              date_of_birth: patient.date_of_birth || '1900-01-01',
              date_of_death: patient.date_of_death || '1900-01-01',
              sex: patient.sex || 'F',
              his_id: patient.patientId || patient.his_id || '',
              decline: patient.decline || false,
              registrant: patient.registrant || -1,
              last_updated: patient.lastUpdate || patient.last_updated || '1900-01-01',
              is_new_case: false,
            };
            return caseinfo;
          });
          console.log(`[executePlugin] 全患者を取得しました: ${copyPatientList.length}件`);
        } else {
          console.warn('[executePlugin] 全患者取得: 予期しないAPIレスポンス形式');
          copyPatientList = [];
        }
      } else {
        console.error('[executePlugin] 全患者取得に失敗しました');
        copyPatientList = [];
      }
    } catch (error) {
      console.error('[executePlugin] 全患者取得エラー:', error);
      copyPatientList = [];
    }
  }

  if (plugin.update_db) {
    // データ登録
    if (plugin.newdata) {
      await newDocumentImport(
        plugin,
        setReload,
        setIsLoading,
        setOverwriteDialogPlop
      );
    } else {
      // データ更新系
      if (
        !plugin.all_patient &&
        copyPatientList &&
        copyPatientList.length === 1
      ) {
        // 対象患者が指定されている場合
        targetCaseId = Number(copyPatientList[0].case_id);
      } else {
        targetCaseId = undefined;
      }
      if (plugin.show_upload_dialog) {
        // ファイルアップロードあり
        try {
          const csvText: string = await new Promise((resolve, reject) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.onchange = () => {
              const files = fileInput.files;
              const file = files ? files[0] : undefined;
              if (file) {
                if (setIsLoading) {
                  setIsLoading(true);
                }
                const reader = new FileReader();
                reader.onload = async () => {
                  if (setIsLoading) {
                    setIsLoading(false);
                  }
                  const data = reader.result;
                  if (typeof data === 'string') {
                    resolve(new TextDecoder().decode(toUTF8(data)));
                  }
                };
                reader.readAsText(file, 'SJIS');
              } else {
                reject();
              }
            };
            // アップロードキャンセル
            fileInput.addEventListener('cancel', () => {
              if (setIsLoading) {
                setIsLoading(false);
              }
              reject();
            });
            fileInput.click();
          });
          const retValue = await moduleMainUpdate(
            plugin.script_text,
            updatePatientsDocument,
            csvText
          );
          if (setReload) {
            setReload({ isReload: true, caller: 'update_plugin' });
          }
          return retValue;
        } catch {
          console.error('Rejected');
          return undefined;
        }
      } else {
        // ファイルアップロードなし
        let documentList: formDocument[] = await getDocuments(
          targetCaseId,
          pluginData.target_schema_id
        );
        // ドキュメントのバーガーボタンからの呼び出しでは当該ドキュメントのみを取得する
        if (targetDocumentId) {
          // formDocumentからの取得でdocument_idが存在しないことは原則としてあり得ない
          documentList = documentList.filter(
            (x) => x.document_id === targetDocumentId
          );
        }
        const retValue = await moduleMainUpdate(
          plugin.script_text,
          updatePatientsDocument,
          documentList
        );
        if (setReload) {
          setReload({ isReload: true, caller: 'update_plugin' });
        }
        return retValue;
      }
    }
  } else {
    // データ出力系
    if (
      plugin.attach_patient_info &&
      // eslint-disable-next-line no-restricted-globals, no-alert
      !confirm('出力結果に患者情報が含まれています、実行しますか？')
    ) {
      throw new Error('cancel');
    }
    // 不要な患者属性をプラグインに渡さないように削除
    if (copyPatientList && !plugin.attach_patient_info) {
      for (const argPatient of copyPatientList) {
        // anyにキャストして無理矢理削除
        delete (argPatient as any).his_id;
        delete (argPatient as any).name;
        delete (argPatient as any).date_of_birth;
        delete (argPatient as any).date_of_death;
        delete (argPatient as any).sex;
      }
    }
    // データ出力系)
    if (copyPatientList) {
      if (targetDocumentId) {
        // ドキュメント指定あり
        const doc: argDoc = {
          caseList: copyPatientList,
          targetDocument: targetDocumentId,
          filterQuery: plugin.filter_schema_query,
        };
        const retValue = await moduleMain(
          plugin.script_text,
          getTargetDocument,
          doc
        );
        return retValue;
      }
      if (plugin.target_schema_id && plugin.target_schema_id.length > 0) {
        // スキーマ指定あり
        const doc: argDoc = {
          caseList: copyPatientList,
          targetSchemas: plugin.target_schema_id,
          filterQuery: plugin.filter_schema_query,
        };
        const retValue = await moduleMain(
          plugin.script_text,
          getPatientsDocument,
          doc
        );
        return retValue;
      }
      // ドキュメント、スキーマ指定なし
      const doc: argDoc = {
        caseList: copyPatientList,
        targetSchemas: undefined,
        filterQuery: plugin.filter_schema_query,
      };
      const retValue = await moduleMain(
        plugin.script_text,
        getPatientsDocument,
        doc
      );
      return retValue;
    }
    // eslint-disable-next-line no-alert
    alert('対象患者がいません');
  }
  return undefined;
};
