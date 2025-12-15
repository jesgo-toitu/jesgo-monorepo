import lodash from 'lodash';
import { logging, LOGTYPE } from '../logic/Logger';
import { ApiReturnObject, RESULT } from '../logic/ApiCommon';
import { DbAccess } from '../logic/DbAccess';
import { formatDateStr, JSONSchema7, JSONSchema7TypeName } from './JsonToDatabase';

export interface getJsonSchemaBody {
  ids: number[] | undefined;
}

export type records = {
  [key: string]: schemaRecord;
};

// 症例情報の定義
// フロントのstore/schemaDataReducer.tsと同じものを使用するため
// どちらかに更新が入ったらもう片方も更新すること
export type JesgoDocumentSchema = {
  schema_id: number;
  schema_id_string: string;
  title: string;
  subtitle: string;
  document_schema: JSONSchema7;
  subschema: number[];
  child_schema: number[];
  inherit_schema: number[];
  base_schema: number | null;
  version_major: number;
  version_minor: number;
  schema_primary_id: number;
  subschema_default: number[];
  child_schema_default: number[];
  inherit_schema_default: number[];
  valid_from: string;
  valid_until: string | null;
  hidden: boolean;
};

export type schemaRecord = {
  schema_id: number;
  schema_primary_id: number;
  schema_id_string: string;
  title: string;
  subtitle: string;
  document_schema: JSONSchema7;
  uniqueness: boolean;
  hidden: boolean;
  subschema: number[];
  child_schema: number[];
  subschema_default: number[];
  child_schema_default: number[];
  inherit_schema: number[];
  inherit_schema_default: number[];
  base_schema: number | null;
  base_version_major: number;
  valid_from: Date;
  valid_until: Date | null;
  author: string;
  version_major: number;
  version_minor: number;
  plugin_id: number;
};

export type treeSchema = {
  schema_id: number;
  schema_primary_id: number;
  schema_id_string: string;
  schema_title: string;
  subschema: treeSchema[];
  childschema: treeSchema[];
  inheritschema: treeSchema[];
  schemaType: JSONSchema7TypeName | undefined;
};

export const getJsonSchema = async (
  forRelation = false
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getJsonSchema');
  try {
    const query = forRelation
      ? `SELECT * FROM view_latest_schema ORDER BY schema_primary_id DESC`
      : `SELECT * FROM jesgo_document_schema ORDER BY schema_primary_id DESC`;

    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();
    const ret = (await dbAccess.query(query)) as schemaRecord[];
    await dbAccess.end();

    if (forRelation === false) {
      const offset = new Date().getTimezoneOffset() * 60 * 1000;
      for (let index = 0; index < ret.length; index++) {
        // DB内の日付をGMT+0として認識しているので時差分の修正をする
        ret[index].valid_from = new Date(
          ret[index].valid_from.getTime() - offset
        );
        const until = ret[index].valid_until;
        if (until) {
          ret[index].valid_until = new Date(until.getTime() - offset);
        }
      }
    }

    return { statusNum: RESULT.NORMAL_TERMINATION, body: ret };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getJsonSchema'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

export const getRootSchemaIds = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getRootSchemaIds');
  try {
    const query = `SELECT subschema FROM view_latest_schema WHERE schema_id = 0`;

    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();
    const ret = (await dbAccess.query(query)) as { subschema: number[] }[];
    await dbAccess.end();

    const ids = ret[0]?.subschema || [];
    return { statusNum: RESULT.NORMAL_TERMINATION, body: ids };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getRootSchemaIds'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: [] };
  }
};

export const analyseSchemaTree = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'analyseSchemaTree');
  try {
    // 最初にすべてのスキーマの最新を取得(バージョンは必要ない)
    const allSchemaObject = await getJsonSchema(true);
    const allSchemas = allSchemaObject.body as schemaRecord[] || [];

    // 続いてにルートスキーマのIDを取得
    const rootIdObject = await getRootSchemaIds();
    const rootIds = rootIdObject.body as number[] || [];

    // 保存用オブジェクト
    const schemaTrees: treeSchema[] = [];

    // 無限ループ防止用ブラックリスト
    const blackList: number[] = [];

    // ルートスキーマを順番にツリー用に処理する
    for (let index = 0; index < rootIds.length; index++) {
      const rootId = rootIds[index];
      if (!blackList.includes(rootId)) {
        // 対象のルートスキーマIDに一致するスキーマレコードを取得
        const rootSchema = allSchemas.find(
          (schema) => schema.schema_id === rootId
        );

        if (rootSchema) {
          // スキーマレコードが取得できた場合、ツリー用に処理する
          const rootSchemaForTree = schemaRecord2SchemaTree(
            rootSchema,
            allSchemas,
            [0],
            blackList
          );
          if (rootSchemaForTree) {
            schemaTrees.push(rootSchemaForTree);
          }
        }
      }
    }
    const errorMessages = [];
    for (let i = 0; i < blackList.length; i++) {
      const blackListedSchema = allSchemas.find(
        (schema) => schema.schema_id === blackList[i]
      );
      if (blackListedSchema) {
        const schemaName = blackListedSchema.subtitle
          ? `${blackListedSchema.title} ${blackListedSchema.subtitle}`
          : blackListedSchema.title;
        const msg = `${schemaName}($id=${blackListedSchema.schema_id_string})について呼び出しがループしています。上位スキーマ、下位スキーマを見直してください。`;
        errorMessages.push(msg);
      }
    }
    return {
      statusNum: RESULT.NORMAL_TERMINATION,
      body: {
        treeSchema: schemaTrees,
        errorMessages: errorMessages,
        blackList,
      },
    };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getScemaTree'
    );
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: {
        treeSchema: [],
        errorMessages: ['スキーマツリーの取得に失敗しました。'],
        blackList: [],
      },
    };
  }
};

export const getInfiniteLoopBlackList = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getInfiniteLoopBlackList');
  const returned: ApiReturnObject = await analyseSchemaTree();
  if (returned.statusNum === RESULT.NORMAL_TERMINATION) {
    const apiBody = returned.body as { blackList: number[] };
    return {
      statusNum: returned.statusNum,
      body: {
        blackList: apiBody.blackList,
      },
    };
  }
  logging(
    LOGTYPE.ERROR,
    `無限ループブラックリストが正常に取得できませんでした。`,
    'Schemas',
    'getInfiniteLoopBlackList'
  );
  return {
    statusNum: returned.statusNum,
    body: {
      blackList: [] as number[],
    },
  };
};

export const getSchemaTree = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getScemaTree');
  const returned: ApiReturnObject = await analyseSchemaTree();
  const apiBody = returned.body as {
    treeSchema: treeSchema[];
    errorMessages: string[];
  };
  return {
    statusNum: returned.statusNum,
    body: {
      treeSchema: apiBody.treeSchema,
      errorMessages: apiBody.errorMessages,
    },
  };
};

/**
 * スキーマレコード1つと全スキーマを渡すとツリー形式で下位スキーマを取得した状態で返す
 * @param schemaRecord 対象のスキーマレコード
 * @param allSchemas 全スキーマのリスト
 * @returns ツリー形式に変換された対象のスキーマレコード
 */
export const schemaRecord2SchemaTree = (
  schemaRecord: schemaRecord,
  allSchemas: schemaRecord[],
  loadedTree: number[],
  blackList: number[]
): treeSchema | null => {
  const tempLoadedTree = lodash.cloneDeep(loadedTree);
  if (blackList.includes(schemaRecord.schema_id)) {
    return null;
  }
  if (tempLoadedTree.includes(schemaRecord.schema_id)) {
    blackList.push(schemaRecord.schema_id);
    return null;
  } else {
    tempLoadedTree.push(schemaRecord.schema_id);
  }
  const subSchemaList = allSchemas.filter((schema) =>
    schemaRecord.subschema.includes(schema.schema_id)
  );
  const childSchemaList = allSchemas.filter((schema) =>
    schemaRecord.child_schema.includes(schema.schema_id)
  );
  const inheritSchemaList = allSchemas.filter((schema) =>
    schemaRecord.inherit_schema.includes(schema.schema_id)
  );

  // サブスキーマ、子スキーマをDBに保存されている順番に並び替え
  subSchemaList.sort(
    (a, b) =>
      schemaRecord.subschema.indexOf(a.schema_id) -
      schemaRecord.subschema.indexOf(b.schema_id)
  );
  childSchemaList.sort(
    (a, b) =>
      schemaRecord.child_schema.indexOf(a.schema_id) -
      schemaRecord.child_schema.indexOf(b.schema_id)
  );
  inheritSchemaList.sort(
    (a, b) =>
      schemaRecord.inherit_schema.indexOf(a.schema_id) -
      schemaRecord.inherit_schema.indexOf(b.schema_id)
  );

  const subSchemaListWithTree: treeSchema[] = [];
  const childSchemaListWithTree: treeSchema[] = [];
  const inheritSchemaListWithTree: treeSchema[] = [];

  for (let index = 0; index < subSchemaList.length; index++) {
    const underTree = schemaRecord2SchemaTree(
      subSchemaList[index],
      allSchemas,
      tempLoadedTree,
      blackList
    );
    if (underTree) {
      subSchemaListWithTree.push(underTree);
    }
  }

  for (let index = 0; index < childSchemaList.length; index++) {
    const underTree = schemaRecord2SchemaTree(
      childSchemaList[index],
      allSchemas,
      tempLoadedTree,
      blackList
    );
    if (underTree) {
      childSchemaListWithTree.push(underTree);
    }
  }

  for (let index = 0; index < inheritSchemaList.length; index++) {
    const underTree = schemaRecord2SchemaTree(
      inheritSchemaList[index],
      allSchemas,
      tempLoadedTree,
      blackList
    );
    if (underTree) {
      inheritSchemaListWithTree.push(underTree);
    }
  }

  return {
    schema_id: schemaRecord.schema_id,
    schema_primary_id: schemaRecord.schema_primary_id,
    schema_id_string: schemaRecord.schema_id_string,
    schema_title:
      schemaRecord.title +
      (schemaRecord.subtitle.length > 0 ? ' ' + schemaRecord.subtitle : ''),
    subschema: subSchemaListWithTree,
    childschema: childSchemaListWithTree,
    inheritschema: inheritSchemaListWithTree,
    schemaType: schemaRecord.document_schema.type as JSONSchema7TypeName
  };
};

export const updateSchemas = async (
  schemas: JesgoDocumentSchema[]
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'updateChildSchemaga');
  const dbAccess = new DbAccess();
  try {
    await dbAccess.connectWithConf();

    for (const schema of schemas) {
      // 時差を調整
      const offset = new Date().getTimezoneOffset() * 60 * 1000;
      let validFrom = str2Date(schema.valid_from);
      let validUntil = str2Date(schema.valid_until);
      // DB内の日付をGMT+0として認識しているので時差分の修正をする
      if (validFrom) {
        validFrom = new Date(validFrom.getTime() - offset);
      }
      if (validUntil) {
        validUntil = new Date(validUntil.getTime() - offset);
      }

      await dbAccess.query(
        `UPDATE jesgo_document_schema SET
        subschema = $1, child_schema = $2, inherit_schema = $3, valid_from = $4,
        valid_until = $5, hidden = $6, base_schema = $7,
        inherit_schema_default = $8,
        subschema_default = $9,
        child_schema_default = $10
        WHERE schema_primary_id = $11`,
        [
          schema.subschema,
          schema.child_schema,
          schema.inherit_schema,
          validFrom,
          validUntil,
          schema.hidden,
          schema.base_schema,
          schema.inherit_schema_default,
          schema.subschema_default,
          schema.child_schema_default,
          schema.schema_primary_id,
        ]
      );
    }

    return { statusNum: RESULT.NORMAL_TERMINATION, body: null };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getScemaTree'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  } finally {
    await dbAccess.end();
  }
};

// 検索用セレクトボックス取得APIのbody 他検索が増えたらプロパティを増やす
export type searchColumnsFromApi = {
  cancerTypes: string[];
};

/**
 * 検索用のセレクトボックスのデータを取得するAPI
 * @returns がん種の文字列配列(表示順)を持つオブジェクト
 */
export const getSearchColumns = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getSearchColumns');

  type dbRow = {
    column_name: string;
  };

  try {
    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();

    // 現状ではがん種のみ、必要なら処理を増やす
    const cancerType: string[] = [];
    const ret = (await dbAccess.query(
      "SELECT column_name FROM jesgo_search_column WHERE column_type ='cancer_type' ORDER BY column_id"
    )) as dbRow[];
    for (let i = 0; i < ret.length; i++) {
      cancerType.push(ret[i].column_name);
    }
    // ここまで

    await dbAccess.end();

    const searchColumns: searchColumnsFromApi = {
      cancerTypes: cancerType,
    };

    return { statusNum: RESULT.NORMAL_TERMINATION, body: searchColumns };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getSearchColumns'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: [] };
  }
};

//
type jesgoDocumentFromDb = {
  document_id: number;
  case_id: number;
  event_date: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any;
  child_documents: string[];
  schema_id: number;
  schema_primary_id: number;
  inherit_schema: number[];
  schema_major_version: number;
  registrant: number;
  created: string;
  last_updated: string;
  readonly: boolean;
  deleted: boolean;
  root_order: number;
};

// 症例情報の定義
export type jesgoCaseDefine = {
  case_id: string;
  name: string;
  date_of_birth: string;
  date_of_death: string;
  sex: string;
  his_id: string;
  decline: boolean;
  registrant: string;
  last_updated: string;
  is_new_case: boolean;
};

// valueの定義
export type jesgoDocumentValueItem = {
  case_id: string;
  event_date: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any;
  child_documents: string[];
  schema_id: number;
  schema_primary_id: number;
  inherit_schema: number[];
  schema_major_version: number;
  registrant: number;
  created: string;
  last_updated: string;
  readonly: boolean;
  deleted: boolean;
};

// キーはdocument_idを入れる予定
export type jesgoDocumentObjDefine = {
  key: string;
  value: jesgoDocumentValueItem;
  root_order: number;
  event_date_prop_name: string;
  death_data_prop_name: string;
  delete_document_keys: string[];
};

// 保存用のオブジェクト この内容をJSON化して送信
export interface SaveDataObjDefine {
  jesgo_case: jesgoCaseDefine;
  jesgo_document: jesgoDocumentObjDefine[];
}

/**
 * 入ってきた文字列をDate形式にして返す、変換不可能な文字列や空文字、nullはnullで返す
 * @param str 日付文字列(空文字もあり)かnull
 * @returns Date形式かnull
 */
const str2Date = (str: string | null): Date | null => {
  if (str === null || str === '') {
    return null;
  }
  // TZの関係でepochTimeを文字列で入れると負の数値になるのでepochTimeが入ってきたときは別処理
  const epoch = '1970-01-01';
  if (str === epoch || formatDateStr(str, '-') === epoch) {
    return new Date(0);
  }
  const date = new Date(str);
  if (date.getTime()) {
    return date;
  }
  return null;
};

const str2Num = (numStr: string): number => {
  if (numStr === '') {
    return 0;
  }
  return Number(numStr);
};

/**
 *
 */
export const registrationCaseAndDocument = async (
  saveDataObjDefine: SaveDataObjDefine
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'registrationCaseAndDocument');
  // 戻り値 0:正常, -1:異常(不明), -2:ID被り

  // データの妥当性チェック
  if (!saveDataObjDefine || !saveDataObjDefine.jesgo_case) {
    logging(LOGTYPE.ERROR, '患者情報(jesgo_case)が存在しません', 'Schemas', 'registrationCaseAndDocument');
    return {
      statusNum: RESULT.FAILED_USER_ERROR,
      body: '患者情報が正しく設定されていません。',
    };
  }

  if (!saveDataObjDefine.jesgo_case.his_id) {
    logging(LOGTYPE.ERROR, '患者ID(his_id)が存在しません', 'Schemas', 'registrationCaseAndDocument');
    return {
      statusNum: RESULT.FAILED_USER_ERROR,
      body: '患者IDが正しく設定されていません。',
    };
  }

  const dbAccess = new DbAccess();

  try {
    await dbAccess.connectWithConf();
    // トランザクション開始
    await dbAccess.query('BEGIN');
    // HIS_IDが存在する場合はcase_idを取得
    let caseId = -1;
    const ret = (await dbAccess.query(
      'SELECT case_id, deleted FROM jesgo_case WHERE his_id = $1',
      [saveDataObjDefine.jesgo_case.his_id]
    )) as { case_id: number; deleted: boolean }[];
    if (ret.length > 0) {
      // - 同一IDの症例情報がある
      if (ret[0].deleted || saveDataObjDefine.jesgo_case.is_new_case == false) {
        // 削除済かPOSTされた情報が編集であれば取得したcase_idで症例情報を更新
        caseId = ret[0].case_id;
        await dbAccess.query(
          'UPDATE jesgo_case SET name = $1, date_of_birth = $2, date_of_death = $3, sex = $4, decline =$5, registrant = $6, deleted = false, last_updated = now() WHERE case_id = $7',
          [
            saveDataObjDefine.jesgo_case.name,
            str2Date(saveDataObjDefine.jesgo_case.date_of_birth),
            str2Date(saveDataObjDefine.jesgo_case.date_of_death),
            saveDataObjDefine.jesgo_case.sex,
            saveDataObjDefine.jesgo_case.decline,
            str2Num(saveDataObjDefine.jesgo_case.registrant),
            caseId,
          ]
        );
      } else {
        // - 新規作成で且つ被りIDが削除されていない場合は警告
        return { statusNum: RESULT.ID_DUPLICATION, body: null };
      }
    } else {
      // HIS_IDがなければcase_idを指定せずに症例情報を新規登録
      await dbAccess.query(
        'INSERT INTO jesgo_case (name, date_of_birth, date_of_death, sex, his_id, decline, registrant, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, now())',
        [
          saveDataObjDefine.jesgo_case.name,
          str2Date(saveDataObjDefine.jesgo_case.date_of_birth),
          str2Date(saveDataObjDefine.jesgo_case.date_of_death),
          saveDataObjDefine.jesgo_case.sex,
          saveDataObjDefine.jesgo_case.his_id,
          saveDataObjDefine.jesgo_case.decline,
          str2Num(saveDataObjDefine.jesgo_case.registrant),
        ]
      );
      const lastValue = (await dbAccess.query(
        'SELECT last_value as case_id FROM jesgo_case_case_id_seq'
      )) as { case_id: number }[];
      // - 最新のcase_id(今登録したもの)を再取得
      caseId = lastValue[0].case_id;
    }

    const dummyNumber: { [key: string]: number } = {};
    // 最初に最大ループ回数を保存しておく(無限ループ防止のため)
    const initialLength = saveDataObjDefine.jesgo_document.length;
    let loopCount = 0;
    // 取得したcase_idを使って症例ドキュメントを更新/新規登録していく
    while (
      saveDataObjDefine.jesgo_document.length > 0 &&
      loopCount < initialLength
    ) {
      loopCount++;
      for (
        let index = 0;
        index < saveDataObjDefine.jesgo_document.length;
        index++
      ) {
        const jesgoDocumentCover = saveDataObjDefine.jesgo_document[index];
        const childDocumentsList = jesgoDocumentCover.value.child_documents;

        let isRegistration = false;

        // 子ドキュメントが1個もない場合(最下層)
        if (childDocumentsList.length == 0) {
          // ドキュメントをテーブルに登録予約をする
          isRegistration = true;
        } else {
          // 子ドキュメントが1個以上ある
          let hasDummyId = false;
          for (
            let childIndex = 0;
            childIndex < childDocumentsList.length;
            childIndex++
          ) {
            const childDocumentId = childDocumentsList[childIndex].toString();

            // 仮IDかどうかのチェック
            if (childDocumentId.startsWith('K')) {
              // 仮IDの場合、対応するdocumentIdがあるか確認
              if (dummyNumber[childDocumentId]) {
                // 仮IDに対応するdocumentIdがある
                childDocumentsList[childIndex] =
                  dummyNumber[childDocumentId].toString();
              } else {
                // 仮IDに対応するdocumentIdがない
                hasDummyId = true;
              }
            }
            // 仮IDでない場合は何もしない
          }
          // 1つでも仮IDが残っていれば登録しない
          if (hasDummyId == false) {
            // ドキュメントをテーブルに登録予約をする
            isRegistration = true;
          }
        }

        // 登録予約がされている場合、登録を行う
        if (isRegistration) {
          // キーが仮IDがどうかを確認
          if (jesgoDocumentCover.key.startsWith('K')) {
            // 仮IDであれば新規登録をする
            await dbAccess.query(
              `INSERT INTO jesgo_document (
              case_id, 
              event_date, 
              document, 
              child_documents, 
              schema_id, 
              schema_major_version, 
              registrant, 
              created,
              last_updated, 
              readonly, 
              deleted, 
              root_order, 
              inherit_schema, 
              schema_primary_id 
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                caseId,
                str2Date(jesgoDocumentCover.value.event_date),
                JSON.stringify(jesgoDocumentCover.value.document),
                jesgoDocumentCover.value.child_documents,
                jesgoDocumentCover.value.schema_id,
                jesgoDocumentCover.value.schema_major_version,
                jesgoDocumentCover.value.registrant,
                jesgoDocumentCover.value.created,
                jesgoDocumentCover.value.last_updated,
                jesgoDocumentCover.value.readonly,
                jesgoDocumentCover.value.deleted,
                jesgoDocumentCover.root_order,
                jesgoDocumentCover.value.inherit_schema,
                jesgoDocumentCover.value.schema_primary_id,
              ]
            );

            // 登録した最終IDを再取得し、仮ID対比表に追加
            const docRet: { document_id: number }[] = (await dbAccess.query(
              'SELECT last_value as document_id FROM jesgo_document_document_id_seq'
            )) as { document_id: number }[];
            dummyNumber[jesgoDocumentCover.key] = docRet[0].document_id;
          } else {
            // DBに登録済のIDであれば更新を行う
            await dbAccess.query(
              `UPDATE jesgo_document SET 
              case_id = $1, 
              event_date = $2, 
              document = $3,  
              child_documents = $4, 
              schema_id = $5, 
              schema_major_version = $6, 
              registrant = $7, 
              last_updated = $8, 
              readonly = $9, 
              deleted = $10, 
              root_order = $11,
              inherit_schema = $12,
              schema_primary_id = $13 
              WHERE document_id = $14`,
              [
                caseId,
                str2Date(jesgoDocumentCover.value.event_date),
                JSON.stringify(jesgoDocumentCover.value.document),
                jesgoDocumentCover.value.child_documents,
                jesgoDocumentCover.value.schema_id,
                jesgoDocumentCover.value.schema_major_version,
                jesgoDocumentCover.value.registrant,
                jesgoDocumentCover.value.last_updated,
                jesgoDocumentCover.value.readonly,
                jesgoDocumentCover.value.deleted,
                jesgoDocumentCover.root_order,
                jesgoDocumentCover.value.inherit_schema,
                jesgoDocumentCover.value.schema_primary_id,
                Number(jesgoDocumentCover.key),
              ]
            );
          }

          // 登録が終わったものを取り除き、次のループに入る
          saveDataObjDefine.jesgo_document.splice(index, 1);
          index--;
          continue;
        }
      }
    }
    await dbAccess.query('COMMIT');
    return { statusNum: RESULT.NORMAL_TERMINATION, body: caseId, extension: dummyNumber };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'registrationCaseAndDocument'
    );
    await dbAccess.query('ROLLBACK');
  } finally {
    await dbAccess.end();
  }
  return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
};

/**
 *
 */
export const getCaseAndDocument = async (
  caseId: number
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getCaseAndDocument');
  try {
    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();
    // 症例データを取得して格納
    const retCase = (await dbAccess.query(
      'SELECT * FROM jesgo_case WHERE case_id = $1 and deleted = false',
      [caseId]
    )) as jesgoCaseDefine[];
    const returnObj: SaveDataObjDefine = {
      jesgo_case: retCase[0],
      jesgo_document: [],
    };

    // 症例データが取得できなかった場合はエラーを返して終了
    if (!returnObj.jesgo_case) {
      logging(
        LOGTYPE.ERROR,
        `存在しないcase_idの読込(case_id=${caseId})`,
        'Schemas',
        'getCaseAndDocument'
      );
      return { statusNum: RESULT.NOT_FOUND_CASE, body: null };
    }

    // 削除されていない関連づくドキュメントデータを取得
    const retDocs = (await dbAccess.query(
      'SELECT * FROM jesgo_document WHERE case_id = $1 AND deleted = false',
      [caseId]
    )) as jesgoDocumentFromDb[];
    for (let index = 0; index < retDocs.length; index++) {
      const doc = retDocs[index];
      const newDoc: jesgoDocumentObjDefine = {
        key: doc.document_id.toString(),
        value: {
          case_id: caseId.toString(),
          event_date: doc.event_date,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          document: doc.document,
          child_documents: doc.child_documents,
          schema_id: doc.schema_id,
          schema_primary_id: doc.schema_primary_id,
          inherit_schema: doc.inherit_schema,
          schema_major_version: doc.schema_major_version,
          registrant: doc.registrant,
          created: doc.created,
          last_updated: doc.last_updated,
          readonly: doc.readonly,
          deleted: doc.deleted,
        },
        root_order: doc.root_order,
        event_date_prop_name: '19700101',
        death_data_prop_name: '19700101',
        delete_document_keys: [],
      };

      returnObj.jesgo_document.push(newDoc);
    }
    await dbAccess.end();
    return { statusNum: RESULT.NORMAL_TERMINATION, body: returnObj };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getCaseAndDocument'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

/**
 * 複数の患者のドキュメントを一括取得
 * @param caseIds 患者IDの配列
 * @returns 各患者の症例データとドキュメントデータ
 */
export const getCasesAndDocuments = async (
  caseIds: number[]
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, `呼び出し`, 'Schemas', 'getCasesAndDocuments');
  try {
    if (!caseIds || caseIds.length === 0) {
      return { statusNum: RESULT.NORMAL_TERMINATION, body: [] };
    }

    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();

    // 複数の症例データを一括取得
    const retCases = (await dbAccess.query(
      'SELECT * FROM jesgo_case WHERE case_id = any($1) AND deleted = false',
      [caseIds]
    )) as jesgoCaseDefine[];

    // 症例IDのマップを作成（存在する症例のみ）
    const caseMap = new Map<number, jesgoCaseDefine>();
    for (const caseData of retCases) {
      caseMap.set(Number(caseData.case_id), caseData);
    }

    // 複数の患者のドキュメントを一括取得
    const retDocs = (await dbAccess.query(
      'SELECT * FROM jesgo_document WHERE case_id = any($1) AND deleted = false ORDER BY case_id, document_id',
      [caseIds]
    )) as jesgoDocumentFromDb[];

    // 症例IDごとにドキュメントをグループ化
    const documentsByCase = new Map<number, jesgoDocumentObjDefine[]>();
    for (const doc of retDocs) {
      if (!documentsByCase.has(doc.case_id)) {
        documentsByCase.set(doc.case_id, []);
      }
      const newDoc: jesgoDocumentObjDefine = {
        key: doc.document_id.toString(),
        value: {
          case_id: doc.case_id.toString(),
          event_date: doc.event_date,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          document: doc.document,
          child_documents: doc.child_documents,
          schema_id: doc.schema_id,
          schema_primary_id: doc.schema_primary_id,
          inherit_schema: doc.inherit_schema,
          schema_major_version: doc.schema_major_version,
          registrant: doc.registrant,
          created: doc.created,
          last_updated: doc.last_updated,
          readonly: doc.readonly,
          deleted: doc.deleted,
        },
        root_order: doc.root_order,
        event_date_prop_name: '19700101',
        death_data_prop_name: '19700101',
        delete_document_keys: [],
      };
      documentsByCase.get(doc.case_id)?.push(newDoc);
    }

    // リクエストされた順序で結果を構築
    const result: SaveDataObjDefine[] = [];
    for (const caseId of caseIds) {
      const caseData = caseMap.get(caseId);
      if (caseData) {
        const returnObj: SaveDataObjDefine = {
          jesgo_case: caseData,
          jesgo_document: documentsByCase.get(caseId) || [],
        };
        result.push(returnObj);
      }
    }

    await dbAccess.end();
    return { statusNum: RESULT.NORMAL_TERMINATION, body: result };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Schemas',
      'getCasesAndDocuments'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};
