import { DbAccess } from '../logic/DbAccess';
import { hash, compareSync } from 'bcrypt';
import { ParsedQs } from 'qs';
import {
  JsonWebTokenError,
  sign,
  TokenExpiredError,
  verify,
} from 'jsonwebtoken';
import envVariables from '../config';
import { ApiReturnObject, getToken, RESULT } from '../logic/ApiCommon';
import { logging, LOGTYPE } from '../logic/Logger';
// 共通パッケージからインポート
import { StaffErrorMessage, LOGINID_PATTERN, PASSWORD_PATTERN } from '@jesgo/common';

// 共通パッケージからの再エクスポート
export { StaffErrorMessage, LOGINID_PATTERN, PASSWORD_PATTERN };

export const DISPLAYNAME_MAX_LENGTH = 20;

const rollList = [0, 1, 100, 101, 1000];

export const loginIdCheck = (value: string): boolean => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'loginIdCheck');
  const regex = new RegExp(LOGINID_PATTERN);
  if (regex.test(value)) {
    logging(
      LOGTYPE.DEBUG,
      '正規表現パターンに一致しています。',
      'Users',
      'loginIdCheck'
    );
  } else {
    logging(
      LOGTYPE.DEBUG,
      '正規表現パターンに一致していません。',
      'Users',
      'loginIdCheck'
    );
    return false;
  }
  return true;
};

export const passwordCheck = (value: string): boolean => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'passwordCheck');
  const regex = new RegExp(PASSWORD_PATTERN);
  if (regex.test(value)) {
    logging(
      LOGTYPE.DEBUG,
      '正規表現パターンに一致しています。',
      'Users',
      'passwordCheck'
    );
  } else {
    logging(
      LOGTYPE.DEBUG,
      '正規表現パターンに一致していません。',
      'Users',
      'passwordCheck'
    );
    return false;
  }
  return true;
};

/**
 * パスワードをハッシュ化する共通関数
 * @param password 平文のパスワード
 * @returns ハッシュ化されたパスワード
 */
export const hashPassword = async (password: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    hash(password + envVariables.passwordSalt, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

/**
 * JWTトークンとリフレッシュトークンを生成する共通関数
 * @param user ユーザー情報
 * @returns トークンとリフレッシュトークンを含むオブジェクト
 */
export const generateTokens = (user: dispUser): {
  token: string;
  reflesh_token: string;
} => {
  return {
    token: sign(user, envVariables.privateKey, {
      expiresIn: '1h',
    }),
    reflesh_token: sign(user, `${envVariables.privateKey}reflesh`, {
      expiresIn: '3h',
    }),
  };
};

//インターフェース
export interface Jwt {
  token: string;
}

export interface dispUser {
  user_id: number;
  name: string;
  display_name: string;
  password_hash: string;
  roll_id: number;
  deleted: boolean;
}

export interface localStorageObject {
  user_id: number;
  display_name: string;
  token: string;
  reflesh_token: string;
  roll_id: number;
  is_view_roll: boolean;
  is_add_roll: boolean;
  is_edit_roll: boolean;
  is_remove_roll: boolean;
  is_plugin_registerable: boolean;
  is_plugin_executable_select: boolean;
  is_plugin_executable_update: boolean;
  is_data_manage_roll: boolean;
  is_system_manage_roll: boolean;
}

interface rollAuth {
  roll_id: number;
  title: string;
  login: boolean;
  view: boolean;
  add: boolean;
  edit: boolean;
  remove: boolean;
  data_manage: boolean;
  system_manage: boolean;
  plugin_registerable: boolean;
  plugin_executable_select: boolean;
  plugin_executable_update: boolean;
  deleted: boolean;
}

export type JesgoUserRoll = {
  roll_id: number;
  title: string;
  isNew?: boolean; // trueは新規作成したレコード

  login: boolean;
  view: boolean;
  add: boolean;
  edit: boolean;
  remove: boolean;
  data_manage: boolean;
  system_manage: boolean;
  plugin_registerable: boolean;
  plugin_executable_select: boolean;
  plugin_executable_update: boolean;

  deleted: boolean;
};

export interface userObject extends dispUser {
  password: string;
}

export const roll = {
  login: 'login',
  view: 'view',
  add: 'add',
  edit: 'edit',
  remove: 'remove',
  dataManage: 'data_manage',
  systemManage: 'system_manage',
  pluginRegisterable: 'plugin_registerable',
  pluginSelect: 'plugin_executable_select',
  pluginUpdate: 'plugin_executable_update',
};

/**
 * マスタに存在するroll_idか否か
 * @param roll_id
 * @returns
 */
const hasUserRollIdMaster = async (roll_id: number) => {
  const dbAccess = new DbAccess();
  try {
    await dbAccess.connectWithConf();

    const ret = (await dbAccess.query(
      'SELECT COUNT(*) as cnt FROM jesgo_user_roll WHERE roll_id = $1',
      [roll_id]
    )) as { cnt: number }[];

    return ret[0].cnt > 0;
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    await dbAccess.end();
  }
};

/**
 * ユーザの新規登録
 * 権限：管理者
 * 必要情報を入力し、ユーザを新規登録する
 * @param name ログイン名
 * @param display_name 表示名
 * @param password パスワード(平文)
 * @param roll_id ロール種別
 * @returns ApiReturnObject
 */
export const signUpUser = async (
  name: string,
  display_name: string,
  password: string,
  roll_id: number
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'signUpUser');

  let result = RESULT.NORMAL_TERMINATION;
  let updateId = -1;

  const errorMessage = [];

  const checkName = name.trim();
  if (!checkName) errorMessage.push(StaffErrorMessage.LOGINID_NOT_ENTERED);
  else {
    if (!loginIdCheck(checkName))
      errorMessage.push(StaffErrorMessage.LOGINID_POLICY_ERROR);
  }

  const checkDisplayName = display_name.trim();
  if (!checkDisplayName) {
    errorMessage.push(StaffErrorMessage.DISPLAYNAME_NOT_ENTERED);
  } else {
    if (checkDisplayName.length > DISPLAYNAME_MAX_LENGTH)
      errorMessage.push(StaffErrorMessage.DISPLAYNAME_LENGTH_ERROR);
  }

  const checkPassword = password.trim();
  if (!checkPassword) {
    errorMessage.push(StaffErrorMessage.PASSWORD_NOT_ENTERED);
  } else {
    if (!passwordCheck(checkPassword)) {
      errorMessage.push(StaffErrorMessage.PASSWORD_POLICY_ERROR);
    }
  }

  if ((await hasUserRollIdMaster(roll_id)) === false) {
    errorMessage.push(StaffErrorMessage.ROLL_ERROR);
  }

  if (errorMessage.length > 0) {
    result = RESULT.FAILED_USER_ERROR;

    const json = `{ "detail":[ ${errorMessage.join()} ] }`;

    return { statusNum: result, body: json };
  }

  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();

  const ret = (await dbAccess.query(
    'SELECT user_id, name, display_name, roll_id, deleted FROM jesgo_user WHERE name = $1',
    [name]
  )) as dispUser[];

  if (ret.length > 0) {
    if (ret[0].deleted) {
      logging(LOGTYPE.INFO, 'User Already deleted', 'Users', 'signUpUser');
      updateId = ret[0].user_id;
    } else {
      logging(LOGTYPE.INFO, 'User Already to update', 'Users', 'signUpUser');
      result = result = RESULT.FAILED_USER_ALREADY_REGISTERED;
    }
  }

  if (result == RESULT.NORMAL_TERMINATION) {
    try {
      const hashedPassword = await hashPassword(password);

      let ret;
      if (updateId > -1) {
        // update
        logging(
          LOGTYPE.INFO,
          `User update user_id:${updateId}`,
          'Users',
          'signUpUser'
        );
        ret = await dbAccess.query(
          'UPDATE jesgo_user set name = $1, display_name = $2, password_hash = $3, roll_id = $4, deleted = false WHERE user_id = $5',
          [name, display_name, hashedPassword, Number(roll_id), updateId]
        );
        await dbAccess.end();
      } else {
        //insert
        logging(LOGTYPE.INFO, 'User insert', 'Users', 'signUpUser');
        ret = await dbAccess.query(
          'INSERT INTO jesgo_user (name, display_name, password_hash, roll_id) VALUES ($1, $2, $3, $4)',
          [name, display_name, hashedPassword, Number(roll_id)]
        );
        await dbAccess.end();
      }
      if (ret != null) {
        logging(LOGTYPE.INFO, 'success', 'Users', 'signUpUser');
      } else {
        logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'signUpUser');
        result = RESULT.FAILED_USER_ERROR;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      logging(LOGTYPE.ERROR, errorMessage, 'Users', 'signUpUser');
      result = RESULT.FAILED_USER_ERROR;
    }
  }
  return { statusNum: result, body: null };
};

/**
 * ユーザーの削除
 * @param user_id
 * @returns
 */
export const deleteUser = async (user_id: number): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'deleteUser');

  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();

  let result = RESULT.NORMAL_TERMINATION;

  const ret = await dbAccess.query(
    'UPDATE jesgo_user SET deleted = true WHERE user_id = $1',
    [user_id]
  );
  await dbAccess.end();
  if (ret != null) {
    logging(LOGTYPE.INFO, `success user_id: ${user_id}`, 'Users', 'deleteUser');
  } else {
    result = RESULT.FAILED_USER_ERROR;
  }
  return { statusNum: result, body: null };
};

/**
 * パスワード変更
 * @param user_id
 * @param password
 * @returns
 */
export const changePassword = async (
  user_id: number,
  password: string
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'changePassword');

  let result = RESULT.NORMAL_TERMINATION;

  try {
    const hashedPassword = await hashPassword(password);
    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();

    //update文を発行
    const ret = await dbAccess.query(
      'UPDATE jesgo_user SET password_hash = $1 WHERE user_id = $2',
      [hashedPassword, user_id]
    );
    await dbAccess.end();
    if (ret != null) {
      logging(LOGTYPE.INFO, 'success', 'Users', 'changePassword');
    } else {
      logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'changePassword');
      result = RESULT.FAILED_USER_ERROR;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    logging(LOGTYPE.ERROR, errorMessage, 'Users', 'changePassword');
    result = RESULT.FAILED_USER_ERROR;
  }
  return { statusNum: result, body: null };
};

/**
 * ユーザの既存編集
 * 権限：管理者
 * 必要情報を入力し、ユーザ情報を編集する
 入力：ユーザID、ログイン名、表示名、パスワード(平文)、ロール種別
 返却：TRUEorFALSE
 * @param name 
 * @param password 
 * @returns 
 */
export const editUserProfile = async (
  user_id: number,
  name: string,
  display_name: string,
  password: string,
  roll_id: number
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'editUserProfile');

  let result = RESULT.NORMAL_TERMINATION;

  // パスワード変更フラグ
  let passwordChange = false;
  if (password.length > 0) {
    // パスワードが1文字以上であればパスワード変更フラグを立てる
    passwordChange = true;
  }
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();

  if (passwordChange) {
    try {
      const hashedPassword = await hashPassword(password);

      //update文を発行
      const ret = await dbAccess.query(
        'UPDATE jesgo_user SET display_name = $1, password_hash = $2, roll_id = $3 WHERE user_id = $4',
        [display_name, hashedPassword, roll_id, user_id]
      );
      await dbAccess.end();
      if (ret != null) {
        logging(
          LOGTYPE.INFO,
          'editUserProfile with password change success',
          'Users',
          'editUserProfile'
        );
      } else {
        logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'editUserProfile');
        result = RESULT.FAILED_USER_ERROR;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      logging(LOGTYPE.ERROR, errorMessage, 'Users', 'editUserProfile');
      result = RESULT.FAILED_USER_ERROR;
    }
  } else {
    const ret = await dbAccess.query(
      'UPDATE jesgo_user SET display_name = $1, roll_id = $2 WHERE user_id = $3',
      [display_name, roll_id, user_id]
    );
    await dbAccess.end();
    if (ret != null) {
      logging(
        LOGTYPE.INFO,
        'editUserProfile success',
        'Users',
        'editUserProfile'
      );
    } else {
      result = RESULT.FAILED_USER_ERROR;
    }
  }
  return { statusNum: result, body: null };
};

/**
ユーザの既存編集
 * 権限：本人
 * 必要情報を入力し、ユーザ情報を編集する、ただし権限は変更不可
 入力：ログイン名、表示名、パスワード(平文)
 返却：TRUEorFALSE
 * @param name 
 * @param password 
 * @returns 
 */
export const editMyProfile = async (
  user_id: number,
  name: string,
  display_name: string,
  password: string
): Promise<boolean> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'editMyProfile');
  // パスワード変更フラグ
  let passwordChange = false;
  if (password.length > 0) {
    // パスワードが1文字以上であればパスワード変更フラグを立てる
    passwordChange = true;
  }
  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();

  try {
    let ret;
    if (passwordChange) {
      const hashedPassword = await hashPassword(password);
      ret = await dbAccess.query(
        'UPDATE jesgo_user SET name = $1, display_name = $2, password_hash = $3 WHERE user_id = $4',
        [name, display_name, hashedPassword, user_id]
      );
    } else {
      ret = await dbAccess.query(
        'UPDATE jesgo_user SET name = $1, display_name = $2 WHERE user_id = $3',
        [name, display_name, user_id]
      );
    }
    await dbAccess.end();
    if (ret != null) {
      logging(LOGTYPE.INFO, 'success', 'Users', 'editMyProfile');
      return true;
    } else {
      logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'editMyProfile');
      return false;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    logging(LOGTYPE.ERROR, errorMessage, 'Users', 'editMyProfile');
    await dbAccess.end();
    return false;
  }
};

/**
 * JWTからユーザ情報を取得する
 * @param token
 * @returns ユーザ情報(dispUser)
 */
export const decordJwt = (token: Jwt, isReflesh = false): ApiReturnObject => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'decordJwt');
  try {
    let secret = envVariables.privateKey;
    if (isReflesh) {
      secret += 'reflesh';
    }
    const decoded = verify(token.token, secret) as dispUser;
    return { statusNum: RESULT.NORMAL_TERMINATION, body: decoded };
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      logging(
        LOGTYPE.INFO,
        'トークンの有効期限が切れています。',
        'Users',
        'decordJwt'
      );
      return { statusNum: RESULT.TOKEN_EXPIRED_ERROR, body: null };
    } else if (e instanceof JsonWebTokenError) {
      logging(LOGTYPE.ERROR, 'トークンが不正です。', 'Users', 'decordJwt');
    } else {
      logging(
        LOGTYPE.ERROR,
        'トークンの検証でその他のエラーが発生しました。',
        'Users',
        'decordJwt'
      );
    }
  }
  return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUsernameFromRequest = (req: any) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'getUsernameFromRequest');
  try {
    const jwt: Jwt = { token: getToken(req) };
    const myApiReturnObject = decordJwt(jwt);
    if (myApiReturnObject.statusNum === RESULT.NORMAL_TERMINATION) {
      return (myApiReturnObject.body as dispUser).display_name;
    } else {
      // 戻り値がエラーの場合はログイン名なし
      return '';
    }
  } catch {
    return '';
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUserIdFromRequest = (req: any) => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'getUserIdFromRequest');
  try {
    const jwt: Jwt = { token: getToken(req) };
    const myApiReturnObject = decordJwt(jwt);
    if (myApiReturnObject.statusNum === RESULT.NORMAL_TERMINATION) {
      return (myApiReturnObject.body as dispUser).user_id;
    } else {
      // 戻り値がエラーの場合は-1を返す
      return -1;
    }
  } catch {
    return -1;
  }
};

/**
 *
 * @param token Jwt、あるいはNULL
 * @param targetAuth 確認したい権限、roll.~で指定できる
 * @return 該当権限を持っているかをTRUEorFALSEで返す
 **/
export const checkAuth = async (
  token: string | undefined,
  targetAuth: string | string[]
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'checkAuth');
  try {
    let myApiReturnObject: ApiReturnObject = {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: null,
    };
    if (token === undefined) {
      return myApiReturnObject;
    }
    const jwt: Jwt = { token: token };
    myApiReturnObject = decordJwt(jwt);
    // トークン期限切れエラー含むエラーが出ている場合、その旨をそのまま返す
    if (
      myApiReturnObject.statusNum === RESULT.ABNORMAL_TERMINATION ||
      myApiReturnObject.statusNum === RESULT.TOKEN_EXPIRED_ERROR
    ) {
      return myApiReturnObject;
    }

    // トークンが正常にデコード出来た場合
    const user: dispUser = myApiReturnObject.body as dispUser;
    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();

    const authList: string[] = [];
    if (Array.isArray(targetAuth)) {
      authList.push(...targetAuth);
    } else {
      authList.push(targetAuth);
    }

    let authSql = '';
    for (let i = 0; i < authList.length; i += 1) {
      authSql += `${authList[i]} as auth${i}`;
      if (i < authList.length - 1) {
        authSql += ',';
      }
    }

    const ret = (await dbAccess.query(
      `SELECT ${authSql} FROM jesgo_user u JOIN jesgo_user_roll r ON u.roll_id = r.roll_id WHERE user_id = $1 and (r.deleted = false or r.deleted IS NULL)`,
      [user.user_id]
    )) as object[];
    await dbAccess.end();

    if (ret.length > 0) {
      // レコードがあればその結果を返却する

      // 権限が複数指定されていた場合はいずれかの権限がTrueの場合に権限ありとみなす
      const auth = Object.entries(ret[0]).some((auth) => auth[1] === true);

      myApiReturnObject.body = auth;
      myApiReturnObject.userId = user.user_id; // user_idも返す
      // 認証がfalseであればstatusを変更する
      if (myApiReturnObject.body === false) {
        myApiReturnObject.statusNum = RESULT.ABNORMAL_TERMINATION;
      }
    } else {
      // レコードが見つからなければbodyをnullにしてエラーを返却する
      logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'checkAuth');
      myApiReturnObject.statusNum = RESULT.ABNORMAL_TERMINATION;
      myApiReturnObject.body = null;
    }
    return myApiReturnObject;
  } catch {
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

/**
 * ID、PWを照合し、適切なものがあれば認証用JWTを返す
 * @param name ログイン用ID
 * @param password パスワード(平文)
 * @returns JWTと表示名、ユーザID
 */
export const loginUser = async (
  name: string,
  password: string
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'loginUser');
  const dbAccess = new DbAccess();
  const plainPassword = password + envVariables.passwordSalt;
  await dbAccess.connectWithConf();
  const ret = (await dbAccess.query(
    'SELECT user_id, name, display_name, roll_id, password_hash FROM jesgo_user WHERE name = $1',
    [name]
  )) as dispUser[];
  if (ret.length === 0) {
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: { token: 'error', reflesh_token: 'error' },
    };
  }
  const roll = (await dbAccess.query(
    'SELECT login, view, add, edit, remove, plugin_registerable, plugin_executable_select, plugin_executable_update, data_manage, system_manage FROM jesgo_user_roll WHERE roll_id = $1 and (deleted = false or deleted IS NULL)',
    [ret[0].roll_id]
  )) as rollAuth[];
  await dbAccess.end();

  // ログイン権限ない場合はエラーを返す
  if (!roll[0].login) {
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: { token: 'error', reflesh_token: 'error' },
    };
  }

  if (compareSync(plainPassword, ret[0].password_hash)) {
    const returnObj: localStorageObject = {
      user_id: ret[0].user_id,
      display_name: ret[0].display_name,
      token: '',
      reflesh_token: '',
      roll_id: ret[0].roll_id,
      is_view_roll: roll[0].view,
      is_add_roll: roll[0].add,
      is_edit_roll: roll[0].edit,
      is_remove_roll: roll[0].remove,
      is_plugin_registerable: roll[0].plugin_registerable,
      is_plugin_executable_select: roll[0].plugin_executable_select,
      is_plugin_executable_update: roll[0].plugin_executable_update,
      is_data_manage_roll: roll[0].data_manage,
      is_system_manage_roll: roll[0].system_manage,
    };
    const tokens = generateTokens(ret[0]);
    returnObj.token = tokens.token;
    returnObj.reflesh_token = tokens.reflesh_token;
    return { statusNum: RESULT.NORMAL_TERMINATION, body: returnObj };
  } else {
    logging(LOGTYPE.ERROR, '不明なエラー', 'Users', 'loginUser');
    return {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: { token: 'error', reflesh_token: 'error' },
    };
  }
};

export const refleshLogin = (oldToken: string | undefined): ApiReturnObject => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'refleshLogin');
  try {
    let myApiReturnObject: ApiReturnObject = {
      statusNum: RESULT.ABNORMAL_TERMINATION,
      body: null,
    };
    if (oldToken === undefined) {
      return myApiReturnObject;
    }
    const jwt: Jwt = { token: oldToken };
    myApiReturnObject = decordJwt(jwt, true);
    // リフレッシュトークン期限切れエラー含むエラーが出ている場合、異常終了にして返す(期限切れループしないため)
    if (
      myApiReturnObject.statusNum === RESULT.ABNORMAL_TERMINATION ||
      myApiReturnObject.statusNum === RESULT.TOKEN_EXPIRED_ERROR
    ) {
      return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
    }

    // リフレッシュトークンが正常にデコード出来た場合、再度トークン、リフレッシュトークンを発行して返す
    const oldUser: dispUser = myApiReturnObject.body as dispUser;
    const newUser: dispUser = {
      user_id: oldUser.user_id,
      name: oldUser.name,
      display_name: oldUser.display_name,
      roll_id: oldUser.roll_id,
      password_hash: oldUser.password_hash,
      deleted: oldUser.deleted,
    };
    const token = generateTokens(newUser);
    return { statusNum: RESULT.NORMAL_TERMINATION, body: token };
  } catch (err) {
    logging(LOGTYPE.ERROR, (err as Error).message, 'Users', 'refleshLogin');
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

export interface dbRow {
  user_id: number;
  name: string;
  displayName: string;
  rollId: number;
  rolltitle: string;
}

export interface searchUserRequest extends ParsedQs {
  userid: string;
  name: string;
  displayName: string;
  rollId: string;
  showProgressAndRecurrence: string;
}

export const searchUser = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'searchUser');

  const dbAccess = new DbAccess();
  await dbAccess.connectWithConf();
  const dbRows: dbRow[] = (await dbAccess.query(
    `SELECT 
    u.user_id, u.name, u.display_name, u.roll_id, m.title as rolltitle
    FROM jesgo_user u LEFT JOIN jesgo_user_roll m
    ON u.roll_id = m.roll_id
    WHERE u.deleted = false and u.roll_id <> 999 and  u.name <> 'system' and u.name <> 'systemuser'
    ORDER BY u.name;`
  )) as dbRow[];
  await dbAccess.end();

  logging(LOGTYPE.DEBUG, `rowLength = ${dbRows.length}`, 'Users', 'searchUser');
  return { statusNum: RESULT.NORMAL_TERMINATION, body: { data: dbRows } };
};

/**
 * 権限一覧取得
 * @returns
 */
export const getUserRollList = async (
  mode: 'Setting' | 'ItemMaster'
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'getUserRollList');

  const dbAccess = new DbAccess();
  try {
    await dbAccess.connectWithConf();
    const whereParams = [];
    let whereSql = '(deleted IS NULL OR deleted = false) AND ';
    if (mode === 'Setting') {
      whereSql += `roll_id != all($1)`;
      whereParams.push([0, 999]);
    } else {
      // TODO: 条件は確認必要
      whereSql += `roll_id != all($1)`;
      whereParams.push([0, 999]);
    }

    const roll = (await dbAccess.query(
      `SELECT * FROM jesgo_user_roll WHERE ${whereSql} ORDER BY roll_id`,
      whereParams
    )) as rollAuth[];
    await dbAccess.end();

    logging(
      LOGTYPE.DEBUG,
      `rowLength = ${roll.length}`,
      'Users',
      'getUserRollList'
    );

    if (mode === 'Setting') {
      // すべての権限情報を返す
      return { statusNum: RESULT.NORMAL_TERMINATION, body: { data: roll } };
    } else {
      // roll_idとtitleのみ返す
      const rollMaster = roll.map((p) => {
        return { roll_id: p.roll_id, title: p.title };
      });
      return {
        statusNum: RESULT.NORMAL_TERMINATION,
        body: { data: rollMaster },
      };
    }
  } catch (err) {
    logging(LOGTYPE.ERROR, (err as Error).message, 'Users', 'getUserRollList');
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

/**
 * ユーザ権限更新
 */
export const saveUserRoll = async (
  userRollList: JesgoUserRoll[]
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Users', 'saveUserRoll');

  let result = RESULT.NORMAL_TERMINATION;

  if (userRollList && userRollList.length > 0) {
    if (
      userRollList.find(
        (p) => !(p.isNew && p.deleted) && (p.title == null || p.title === '')
      )
    ) {
      logging(
        LOGTYPE.ERROR,
        '権限名が未設定のため保存スキップ',
        'Users',
        'saveUserRoll'
      );
      return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
    }
  }

  const baseRollId = 10000; // ユーザが追加した権限のroll_id開始番号

  let currentRoll: JesgoUserRoll | undefined;

  const dbAccess = new DbAccess();
  try {
    await dbAccess.connectWithConf();

    if (userRollList && userRollList.length > 0) {
      // 削除しようとしている権限が設定された利用者がいないかチェック
      const deletedRollIds = userRollList
        .filter((p) => p.deleted)
        .map((roll) => roll.roll_id);
      if (deletedRollIds.length > 0) {
        const ret = (await dbAccess.query(
          `SELECT user_id FROM jesgo_user WHERE roll_id = any($1) AND (deleted IS NULL OR deleted = false)`,
          [deletedRollIds]
        )) as { user_id: string }[];

        if (ret.length > 0) {
          logging(
            LOGTYPE.ERROR,
            '削除対象の権限が使用中のため保存スキップ',
            'Users',
            'saveUserRoll'
          );
          result = RESULT.ABNORMAL_TERMINATION;
          return { statusNum: result, body: null };
        }
      }
    }

    if (userRollList && userRollList.length > 0) {
      await dbAccess.query('BEGIN');
      for (const roll of userRollList) {
        currentRoll = roll;

        let sqlQuery = '';
        const params: any[] = [
          roll.title,
          roll.login,
          roll.view,
          roll.add,
          roll.edit,
          roll.remove,
          roll.data_manage,
          roll.system_manage,
          roll.plugin_registerable,
          roll.plugin_executable_select,
          roll.plugin_executable_update,
          roll.deleted,
        ];
        if (roll.isNew && !roll.deleted) {
          // 新規レコードはINSERT
          sqlQuery = `INSERT INTO jesgo_user_roll (roll_id, title, login, view, add, edit, remove, data_manage, system_manage
            , plugin_registerable, plugin_executable_select, plugin_executable_update, deleted)
            VALUES ((SELECT (case when max(roll_id) >= ${baseRollId} then max(roll_id) else ${
            baseRollId - 1
          } end) + 1 FROM jesgo_user_roll),
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
        } else if (!roll.isNew) {
          // 既存レコードはUPDATE
          sqlQuery = `UPDATE jesgo_user_roll SET
          title = $2, login = $3, view = $4, add = $5, edit = $6, remove = $7, data_manage = $8, system_manage = $9,
          plugin_registerable = $10, plugin_executable_select = $11, plugin_executable_update = $12, deleted = $13
          WHERE roll_id = $1`;

          params.unshift(roll.roll_id);
        }

        await dbAccess.query(sqlQuery, params);
      }
      await dbAccess.query('COMMIT');
      logging(LOGTYPE.INFO, 'jesgo_user_roll更新完了', 'Users', 'saveUserRoll');
    }

    return { statusNum: result, body: null };
  } catch (err: any) {
    logging(
      LOGTYPE.ERROR,
      `[roll_id=${currentRoll ? currentRoll.roll_id : ''}]${
        (err as Error)?.message
      }`,
      'Users',
      'saveUserRoll'
    );
    result = RESULT.ABNORMAL_TERMINATION;
    return { statusNum: result, body: null };
  } finally {
    await dbAccess.end();
  }
};
