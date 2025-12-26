/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import {
  loginUser,
  userObject,
  checkAuth,
  roll,
  refleshLogin,
  searchUser,
  signUpUser,
  editUserProfile,
  deleteUser,
  changePassword,
  getUsernameFromRequest,
  getUserIdFromRequest,
  getUserRollList,
  saveUserRoll,
  JesgoUserRoll,
} from '../services/Users';
import {
  deletePatient,
  searchPatientRequest,
  searchPatientRequestBody,
  searchPatients,
} from '../services/SearchPatient';
import { repairChildSchema, uploadZipFile } from '../services/JsonToDatabase';
import Router from 'express-promise-router';
import {
  getCaseAndDocument,
  getCasesAndDocuments,
  getInfiniteLoopBlackList,
  getJsonSchema,
  getRootSchemaIds,
  getSchemaTree,
  getSearchColumns,
  JesgoDocumentSchema,
  registrationCaseAndDocument,
  SaveDataObjDefine,
  updateSchemas,
} from '../services/Schemas';
import { getSettings, settings, updateSettings } from '../services/Settings';
import { ApiReturnObject, getToken, RESULT } from '../logic/ApiCommon';
import { logging, LOGTYPE } from '../logic/Logger';
import {
  deletePlugin,
  executeUpdate,
  getCaseIdAndCaseNoList,
  getCaseIdAndDocIdList,
  getCaseIdAndHashList,
  getDocumentsAndNameList,
  getPackagedDocument,
  getPatientDocumentRequest,
  getPatientDocuments,
  getPluginList,
  importPluginExecute,
  jesgoPluginColumns,
  PackageDocumentRequest,
  savePluginList,
  updatePluginExecute,
  uploadPluginZipFile,
} from '../services/Plugin';
import {
  getPresetList,
  getPresetDetail,
  getFixedFieldMaster,
  savePreset,
  deletePreset,
  getFixedFieldList,
  PresetDetailData
} from '../services/Presets';
import routing from './routing';

const app = express();
app.use(helmet());
app.use(cors());
// ルーティングする

const router = Router();
const upload = multer({ dest: 'uploads/' });

// routerにルーティングの動作を記述する

/**
 * ログイン関連用 start
 * login
 * relogin
 */
router.post('/login/', (req, res, next) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'router', '/login');
  logging(LOGTYPE.DEBUG, `リクエストボディ: ${JSON.stringify(req.body)}`, 'router', '/login');
  
  // フロントエンドからのリクエスト構造に対応
  let body: userObject;
  if (req.body.data) {
    // フロントエンドからのリクエスト（dataプロパティ内にログイン情報）
    body = req.body.data as userObject;
  } else {
    // 直接のリクエスト
    body = req.body as userObject;
  }
  
  logging(LOGTYPE.DEBUG, `ユーザー名: ${body.name}, パスワード: ${body.password ? '[設定済み]' : '[未設定]'}`, 'router', '/login');
  loginUser(body.name, body.password)
    .then((result) => {
      logging(LOGTYPE.DEBUG, `ログイン結果: ${JSON.stringify(result)}`, 'router', '/login');
      res.status(200).send(result);
    })
    .catch((error) => {
      logging(LOGTYPE.ERROR, `ログインエラー: ${error}`, 'router', '/login');
      next(error);
    });
});

router.post('/relogin/', (req, res, next) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'router', '/relogin');
  try {
    // eslint-disable-next-line
    const result = refleshLogin(req.body.reflesh_token as string);
    res.status(200).send(result);
  } catch {
    next;
  }
});

router.get('/getJsonSchema', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getJsonSchema',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    getJsonSchema()
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/getJsonSchema',
      getUsernameFromRequest(req)
    );
  }
});

router.get('/getRootSchemaIds', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getRootSchemaIds',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    getRootSchemaIds()
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/getRootSchemaIds',
      getUsernameFromRequest(req)
    );
  }
});
/**
 * ユーザー一覧
 */
router.get('/userlist', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/userlist',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      searchUser()
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/userlist',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * ユーザー登録
 */
router.post('/signup/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/signup',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const body: userObject = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!body || !body.name || !body.display_name || !body.password || body.roll_id === undefined) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(body)}`, 'router', '/signup');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    signUpUser(body.name, body.display_name, body.password, body.roll_id)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * ユーザー削除
 */
router.post('/deleteUser/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/deleteUser',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const body: userObject = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!body || !body.user_id) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(body)}`, 'router', '/deleteUser');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    deleteUser(body.user_id)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * ユーザーパスワード変更
 */
router.post('/changeUserPassword/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/changeUserPassword',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const body: userObject = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!body || !body.user_id || !body.password) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(body)}`, 'router', '/changeUserPassword');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    changePassword(body.user_id, body.password)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * ユーザー更新
 */
router.post('/editUser/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/editUser',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const body: userObject = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!body || !body.user_id || !body.name || !body.display_name || body.roll_id === undefined) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(body)}`, 'router', '/editUser');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    editUserProfile(
      body.user_id,
      body.name,
      body.display_name,
      body.password,
      body.roll_id
    )
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * 権限一覧
 */
router.get('/getUserRollList', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getUserRollList',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getUserRollList('Setting')
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/userlist',
        getUsernameFromRequest(req)
      );
    }
  }
});
/**
 * 権限一覧(コンボボックス用)
 */
router.get('/getUserRollItemMaster', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getUserRollItemMaster',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  // ログイン権限あれば参照できるようにしておく
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.login
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getUserRollList('ItemMaster')
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/getUserRollItemMaster',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * 権限設定更新
 */
router.post('/saveUserRoll', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/saveUserRoll',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const data: JesgoUserRoll[] = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!data || !Array.isArray(data)) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(data)}`, 'router', '/saveUserRoll');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    saveUserRoll(data)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * ログイン関連用 end
 */

/**
 * リスト画面用 start
 * getSearchColumns
 * patientlist
 * deleteCase
 */
router.get('/getSearchColumns', async (req, res, next) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'router', '/getSearchColumns');
  // ログイン画面でも使用するので権限を設定しない
  await getSearchColumns()
    .then((result) => res.status(200).send(result))
    .catch(next);
});

router.get('/patientlist', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/patientlist',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.login
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      searchPatients(req.query as searchPatientRequest)
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/patientlist',
        getUsernameFromRequest(req)
      );
    }
  }
});

// POSTエンドポイント：リクエストボディから絞り込み条件を取得
router.post('/patientlist', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/patientlist (POST)',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.login
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      // リクエストボディとクエリパラメータをマージ
      const body = req.body as searchPatientRequestBody;
      const queryParams = req.query as searchPatientRequest;
      
      logging(
        LOGTYPE.DEBUG,
        `POST /patientlist: req.body=${JSON.stringify(req.body)}, body.presetFilters=${JSON.stringify(body.presetFilters)}, queryParams.presetFilters=${queryParams.presetFilters}`,
        'router'
      );
      
      // リクエストボディからクエリパラメータ形式に変換
      const query: searchPatientRequest = {
        initialTreatmentDate: body.initialTreatmentDate || queryParams.initialTreatmentDate || '',
        cancerType: body.cancerType || queryParams.cancerType || '',
        showOnlyTumorRegistry: body.showOnlyTumorRegistry || queryParams.showOnlyTumorRegistry || '',
        diagnosisDate: body.diagnosisDate || queryParams.diagnosisDate || '',
        eventDateType: body.eventDateType || queryParams.eventDateType || '',
        eventDate: body.eventDate || queryParams.eventDate || '',
        checkOfDiagnosisDate: body.checkOfDiagnosisDate || queryParams.checkOfDiagnosisDate || '',
        checkOfBlankFields: body.checkOfBlankFields || queryParams.checkOfBlankFields || '',
        advancedStage: body.advancedStage || queryParams.advancedStage || '',
        pathlogicalDiagnosis: body.pathlogicalDiagnosis || queryParams.pathlogicalDiagnosis || '',
        initialTreatment: body.initialTreatment || queryParams.initialTreatment || '',
        complications: body.complications || queryParams.complications || '',
        threeYearPrognosis: body.threeYearPrognosis || queryParams.threeYearPrognosis || '',
        fiveYearPrognosis: body.fiveYearPrognosis || queryParams.fiveYearPrognosis || '',
        showProgressAndRecurrence: body.showProgressAndRecurrence || queryParams.showProgressAndRecurrence || '',
        page: body.page?.toString() || queryParams.page || undefined,
        pageSize: body.pageSize?.toString() || queryParams.pageSize || undefined,
        sortColumn: body.sortColumn || queryParams.sortColumn || undefined,
        sortDirection: body.sortDirection || queryParams.sortDirection || undefined,
        // POSTリクエストボディの場合は配列のまま、クエリパラメータの場合は文字列のまま
        presetFilters: body.presetFilters ? (body.presetFilters as any) : queryParams.presetFilters || undefined,
      };
      
      logging(
        LOGTYPE.DEBUG,
        `POST /patientlist: query.presetFilters=${JSON.stringify(query.presetFilters)}, type=${typeof query.presetFilters}`,
        'router'
      );
      
      searchPatients(query)
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/patientlist (POST)',
        getUsernameFromRequest(req)
      );
    }
  }
});

router.delete('/deleteCase/:caseId', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/deleteCase',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.remove
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    deletePatient(Number(req.params.caseId))
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/deleteCase',
      getUsernameFromRequest(req)
    );
  }
});

/**
 * リスト画面用 end
 */

/**
 * 症例登録画面用 start
 * getJsonSchema
 * deleteCase
 */

router.post('/registrationCaseAndDocument/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/registrationCaseAndDocument',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), roll.edit);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    registrationCaseAndDocument(req.body as SaveDataObjDefine)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/registrationCaseAndDocument',
      getUsernameFromRequest(req)
    );
  }
});

router.get('/getCaseAndDocument/:caseId', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getCaseAndDocument',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), roll.view);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    getCaseAndDocument(Number(req.params.caseId))
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/getCaseAndDocument',
      getUsernameFromRequest(req)
    );
  }
});

router.post('/getCasesAndDocuments', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getCasesAndDocuments',
    getUsernameFromRequest(req)
  );
  // 権限の確認（プリセット表示でシステムオペレータも使用するため、login権限も許可）
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
    return;
  }
  if (authResult.body) {
    const caseIds = req.body.caseIds as number[];
    if (!Array.isArray(caseIds)) {
      res.status(200).send({
        statusNum: RESULT.ABNORMAL_TERMINATION,
        body: 'caseIds must be an array',
      });
      return;
    }
    getCasesAndDocuments(caseIds)
      .then((result) => res.status(200).send(result))
      .catch(next);
  } else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/getCasesAndDocuments',
      getUsernameFromRequest(req)
    );
  }
});

// eslint-disable-next-line
router.get('/getblacklist/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getblacklist',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    getInfiniteLoopBlackList()
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/getblacklist',
      getUsernameFromRequest(req)
    );
  }
});

/**
 * 症例登録画面用 end
 */

/**
 * システム設定用 start
 */
router.get('/getSettings/', async (req, res, next) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'router', '/getSettings');
  // ログイン画面でも使用するので権限を設定しない
  await getSettings()
    .then((result) => res.status(200).send(result))
    .catch(next);
});

router.post('/updateSettings/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/updateSettings',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    updateSettings(req.body as settings)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/updateSettings',
      getUsernameFromRequest(req)
    );
  }
});
/**
 * システム設定用 end
 */

/**
 * プラグイン用 start
 */
// eslint-disable-next-line
// スキーマアップロード
router.post('/upload/', upload.single('files'), async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/upload',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    uploadZipFile(req.file)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/upload',
      getUsernameFromRequest(req)
    );
  }
});

// eslint-disable-next-line
router.get('/gettree/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/gettree',
    getUsernameFromRequest(req)
  );
  // 権限の確認（一般ユーザ・上級ユーザ・システムオペレータがプリセット管理で使用するためview権限に変更）
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    [roll.login, roll.view]
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    getSchemaTree()
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/gettree',
      getUsernameFromRequest(req)
    );
  }
});

router.post('/updateSchemas/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/updateSchemas',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.systemManage
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    updateSchemas(req.body as JesgoDocumentSchema[])
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/updateSchemas',
      getUsernameFromRequest(req)
    );
  }
});

router.post('/packaged-document/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/packaged-document',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.pluginSelect,
    roll.pluginUpdate,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    getPackagedDocument(req.body as PackageDocumentRequest)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/packaged-document',
      getUsernameFromRequest(req)
    );
  }
});

/**
 * プラグイン一覧
 */
router.get('/plugin-list/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/plugin-list',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.login
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    getPluginList()
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/plugin-list',
      getUsernameFromRequest(req)
    );
  }
});

// eslint-disable-next-line
router.post(
  '/upload-plugin/',
  upload.single('files'),
  async (req, res, next) => {
    logging(
      LOGTYPE.DEBUG,
      '呼び出し',
      'router',
      '/upload-plugin',
      getUsernameFromRequest(req)
    );
    // 権限の確認
    const authResult: ApiReturnObject = await checkAuth(
      getToken(req),
      roll.pluginRegisterable
    );
    if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
      res.status(200).send(authResult);
    }
    if (authResult.body) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      uploadPluginZipFile(req.file, authResult.userId)
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/upload-plugin',
        getUsernameFromRequest(req)
      );
    }
  }
);

router.post('/deletePlugin/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/deletePlugin',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.pluginRegisterable
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  }
  if (authResult.body) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const body: { data: { plugin_id: number } } = req.body as {
      data: { plugin_id: number };
    };
    deletePlugin(body.data.plugin_id)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
  // 権限が無い場合
  else {
    logging(
      LOGTYPE.ERROR,
      '権限エラー',
      'router',
      '/deletePlugin',
      getUsernameFromRequest(req)
    );
  }
});

router.get('/getPatientDocuments', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/getPatientDocuments',
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.pluginUpdate
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getPatientDocuments(req.query as getPatientDocumentRequest)
        .then((result) => res.status(200).send(result))
        .catch(next);
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/getPatientDocuments',
        getUsernameFromRequest(req)
      );
    }
  }
});

router.post('/plugin-update', async (req, res, next) => {
  await routing(
    '/plugin-update',
    updatePluginExecute,
    req,
    res,
    next,
    roll.pluginUpdate,
    req.body
  );
});

router.post('/executeUpdate', async (req, res, next) => {
  await routing(
    '/executeUpdate',
    executeUpdate,
    req,
    res,
    next,
    roll.pluginUpdate,
    { updateObjects: req.body, executeUserId: getUserIdFromRequest(req) }
  );
});

router.post('/register-case', async (req, res, next) => {
  await routing(
    '/register-case',
    importPluginExecute,
    req,
    res,
    next,
    roll.pluginUpdate,
    { updateObjects: req.body, executeUserId: getUserIdFromRequest(req) }
  );
});

router.get('/getCaseIdAndDocIdList', async (req, res, next) => {
  await routing(
    '/getCaseIdAndDocIdList',
    getCaseIdAndDocIdList,
    req,
    res,
    next,
    roll.pluginUpdate
  );
});

router.get('/getCaseIdAndHashList', async (req, res, next) => {
  await routing(
    '/getCaseIdAndHashList',
    getCaseIdAndHashList,
    req,
    res,
    next,
    roll.pluginUpdate
  );
});

router.get('/getCaseIdAndCaseNoList', async (req, res, next) => {
  await routing(
    '/getCaseIdAndCaseNoList',
    getCaseIdAndCaseNoList,
    req,
    res,
    next,
    roll.pluginUpdate
  );
});

router.get('/getDocumentsAndNameList', async (req, res, next) => {
  await routing(
    '/getDocumentsAndNameList',
    getDocumentsAndNameList,
    req,
    res,
    next,
    roll.pluginUpdate,
    5
  );
});

/**
 * jesgo_document_schemaテーブルのsubschema、child_schemaを再更新するAPIを外部公開
 */
router.get('/repair-childschema/', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/repair-childschema',
    getUsernameFromRequest(req)
  );

  repairChildSchema()
    .then((result) => res.status(200).send(result))
    .catch(next);
});

router.post('/save-plugin', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/save-plugin',
    getUsernameFromRequest(req)
  );

  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.pluginRegisterable
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestBody = req.body as any;
    
    // フロントエンドからのリクエスト構造に対応
    const data: jesgoPluginColumns[] = requestBody.data || requestBody;
    
    // パラメータの存在確認
    if (!data || !Array.isArray(data)) {
      logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(data)}`, 'router', '/savePluginList');
      res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
      return;
    }
    
    savePluginList(data)
      .then((result) => res.status(200).send(result))
      .catch(next);
  }
});

/**
 * プラグイン用 end
 */

/**
 * プリセット管理用 start
 */

/**
 * プリセット一覧取得
 */
router.get('/preset-list', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/preset-list',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getPresetList()
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/preset-list',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * プリセット詳細取得
 */
router.get('/preset-detail/:presetId', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/preset-detail',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      const presetId = Number(req.params.presetId);
      getPresetDetail(presetId)
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/preset-detail',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * プリセット保存（新規作成・更新）
 */
router.post('/preset-save', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/preset-save',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認（プラグイン登録と同様の権限設定）
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.pluginRegisterable
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const requestBody = req.body as any;
      
      // フロントエンドからのリクエスト構造に対応
      const presetData: PresetDetailData = requestBody.data || requestBody;
      
      // パラメータの存在確認
      if (!presetData || !presetData.preset_name || !presetData.fields) {
        logging(LOGTYPE.ERROR, `Missing required parameters: ${JSON.stringify(presetData)}`, 'router', '/preset-save');
        res.status(400).send({ statusNum: RESULT.FAILED_USER_ERROR, body: '必須パラメータが不足しています' });
        return;
      }
      
      savePreset(presetData, req)
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/preset-save',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * プリセット削除
 */
router.delete('/preset-delete/:presetId', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/preset-delete',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認（プラグイン登録と同様の権限設定）
  const authResult: ApiReturnObject = await checkAuth(
    getToken(req),
    roll.pluginRegisterable
  );
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      const presetId = Number(req.params.presetId);
      const userId = getUserIdFromRequest(req);
      
      logging(
        LOGTYPE.DEBUG,
        `削除処理開始 - presetId: ${presetId}, userId: ${userId}`,
        'router',
        '/preset-delete'
      );
      
      deletePreset(presetId, userId)
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/preset-delete',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * 固定項目一覧取得
 */
router.get('/fixed-field-list', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/fixed-field-list',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.view,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getFixedFieldList()
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/fixed-field-list',
        getUsernameFromRequest(req)
      );
    }
  }
});

/**
 * プリセット管理用 end
 */

/**
 * 固定項目マスターデータ取得
 */
router.get('/fixed-field-master', async (req, res, next) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    '/fixed-field-master',
    getUsernameFromRequest(req)
  );
  
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), [
    roll.login,
    roll.edit,
  ]);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      getFixedFieldMaster()
        .then((result) => res.status(200).send(result))
        .catch(next);
    } else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        '/fixed-field-master',
        getUsernameFromRequest(req)
      );
    }
  }
});

// -------------------------------------------------
//  以下、何のルーティングにもマッチしないorエラー
// -------------------------------------------------

// いずれのルーティングにもマッチしない(==NOT FOUND)
router.use((req, res) => {
  res.status(404);
  res.json({
    statusNum: RESULT.ABNORMAL_TERMINATION,
    body: `Route not found: ${req.method} ${req.path}`,
  });
});

//routerをモジュールとして扱う準備
export default router;
