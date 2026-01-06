import { logging, LOGTYPE } from '../logic/Logger';
import { ApiReturnObject, RESULT } from '../logic/ApiCommon';
import { DbAccess } from '../logic/DbAccess';

export type settings = {
  hisid_alignment: boolean;
  hisid_digit: number;
  hisid_hyphen_enable: boolean;
  hisid_alphabet_enable: boolean;
  jesgo_required_highlight: JesgoRequiredHighlight;
  facility_name: string;
  jsog_registration_number: string;
  joed_registration_number: string;
  default_page_size: number;
};

/**
 * jesgo:requiredのハイライト設定
 */
export type JesgoRequiredHighlight = {
  jsog: boolean,  // JSOG
  jsgoe: boolean, // JSGOE
  others: boolean,  // JSOG・JSGOE以外(独自拡張を想定)
}

export const getSettings = async (): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Settings', 'getSettings');
  try {
    const query = `SELECT 
    value->'setting'->'hisid'->>'alignment' as hisid_alignment, 
    value->'setting'->'hisid'->>'digit' as hisid_digit, 
    value->'setting'->'hisid'->>'hyphen_enable' as hisid_hyphen_enable, 
    value->'setting'->'hisid'->>'alphabet_enable' as hisid_alphabet_enable, 
    value->'setting'->'display'->>'jesgo_required_highlight' as jesgo_required_highlight, 
    value->'setting'->'display'->>'default_page_size' as default_page_size, 
    value->'setting'->'facility_information'->>'name' as facility_name, 
    value->'setting'->'facility_information'->>'jsog_registration_number' as jsog_registration_number, 
    value->'setting'->'facility_information'->>'joed_registration_number' as joed_registration_number 
    FROM jesgo_system_setting 
    WHERE setting_id = 1`;

    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();
    const ret = (await dbAccess.query(query)) as settings[];
    await dbAccess.end();

    return { statusNum: RESULT.NORMAL_TERMINATION, body: ret[0] };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Settings',
      'getSettings'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};

export const updateSettings = async (
  json: any
): Promise<ApiReturnObject> => {
  logging(LOGTYPE.DEBUG, '呼び出し', 'Settings', 'updateSettings');
  try {
    // 実際の設定データを抽出（dataプロパティから取得）
    const settingsData = json.data || json;
    const saveJson = {
      setting: {
        hisid: {
          alignment: settingsData.hisid_alignment,
          digit: settingsData.hisid_digit,
          hyphen_enable: settingsData.hisid_hyphen_enable,
          alphabet_enable: settingsData.hisid_alphabet_enable,
        },
        display: {
          jesgo_required_highlight: settingsData.jesgo_required_highlight,
          default_page_size: settingsData.default_page_size,
        },
        facility_information: {
          name: settingsData.facility_name,
          jsog_registration_number: settingsData.jsog_registration_number,
          joed_registration_number: settingsData.joed_registration_number,
        },
      },
    };

    logging(LOGTYPE.DEBUG, `保存データ: ${JSON.stringify(saveJson)}`, 'Settings', 'updateSettings');
    const query = `UPDATE jesgo_system_setting SET value = $1 WHERE setting_id = 1`;

    const dbAccess = new DbAccess();
    await dbAccess.connectWithConf();
    await dbAccess.query(query, [JSON.stringify(saveJson)]);
    await dbAccess.end();
    
    logging(LOGTYPE.DEBUG, 'データベース更新完了', 'Settings', 'updateSettings');

    return { statusNum: RESULT.NORMAL_TERMINATION, body: null };
  } catch (e) {
    logging(
      LOGTYPE.ERROR,
      `エラー発生 ${(e as Error).message}`,
      'Settings',
      'updateSettings'
    );
    return { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
  }
};
