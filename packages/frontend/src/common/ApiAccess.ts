import axios, { AxiosRequestConfig } from 'axios';
// 共通パッケージからインポート
import { ApiReturnObject, RESULT, METHOD_TYPE, WebAppConfig } from '@jesgo/common';

// 共通パッケージからの再エクスポート
export { ApiReturnObject, RESULT, METHOD_TYPE };

const CONFIG_PATH = './config.json' as string;

// デフォルト設定
const DEFAULT_CONFIG: WebAppConfig = {
  webAppPort: 3030,
  endPointUrl: 'http://localhost:8000/',
};

// 設定のキャッシュ（シングルトンパターン）
let configCache: WebAppConfig | null = null;
let configLoadPromise: Promise<WebAppConfig> | null = null;

/**
 * 設定ファイルを読み込む（シングルトン）
 * 初回のみ読み込み、以降はキャッシュを返す
 */
const loadConfig = async (): Promise<WebAppConfig> => {
  // キャッシュがあればそれを返す
  if (configCache !== null) {
    return configCache;
  }

  // 読み込み中の場合は、その Promise を返す（並列リクエストの重複読み込みを防ぐ）
  if (configLoadPromise !== null) {
    return configLoadPromise;
  }

  // 設定ファイルを読み込む
  configLoadPromise = axios
    .get(CONFIG_PATH)
    .then((res) => {
      const configJson = res.data as { webApp: WebAppConfig };
      const config = configJson.webApp || DEFAULT_CONFIG;
      configCache = config;
      console.log(`✓ 設定ファイルを読み込みました: endPointUrl = ${config.endPointUrl}`);
      return config;
    })
    .catch((error) => {
      console.warn('⚠ 設定ファイルの読み込みに失敗しました。デフォルト設定を使用します。', error);
      console.log(`  デフォルト endPointUrl = ${DEFAULT_CONFIG.endPointUrl}`);
      configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    })
    .finally(() => {
      configLoadPromise = null;
    });

  return configLoadPromise;
};

const apiAccess = async (
  methodType: number,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any = null,
  uploadType = 'schemas'
): Promise<ApiReturnObject> => {
  let returnObj: ApiReturnObject = {
    statusNum: RESULT.ABNORMAL_TERMINATION,
    body: null,
  };

  // 設定を読み込む（初回のみ実際に読み込み、以降はキャッシュを使用）
  const config = await loadConfig();

  let token = localStorage.getItem('token');
  if (token == null) {
    token = '';
  }
  // eslint-disable-next-line
  let payloadObj: AxiosRequestConfig<Record<string, any>> | undefined;

  if (body !== null) {
    // ZIPファイル送信時はファイル形式を替える
    if (methodType === METHOD_TYPE.POST_ZIP) {
      const data = new FormData();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      data.append('files', body);
      payloadObj = {
        headers: { token, 'content-type': 'multipart/form-data', uploadType },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data,
      };
    } else {
      payloadObj = {
        headers: { 
          token,
          'Content-Type': 'application/json'  // JSONリクエストであることを明示
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: body,
      };
    }
  } else {
    payloadObj = { headers: { token } };
  }

  let errMsg: unknown;

  // URL構築のヘルパー関数
  const buildUrl = (baseUrl: string, endpoint: string): string => {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBaseUrl}${cleanEndpoint}`;
  };

  /**
   * Axiosリクエストを実行する共通関数
   * @param requestFn Axiosリクエスト関数
   */
  const executeRequest = async (
    requestFn: () => Promise<{ data: ApiReturnObject }>
  ): Promise<void> => {
    try {
      const response = await requestFn();
      returnObj = response.data as ApiReturnObject;
    } catch (err) {
      errMsg = err;
    }
  };

  // リクエストタイプに応じて適切なリクエストを実行
  const requestUrl = buildUrl(config.endPointUrl, url);
  switch (methodType) {
    case METHOD_TYPE.GET:
      await executeRequest(() => axios.get(requestUrl, payloadObj));
      break;

    case METHOD_TYPE.POST:
      // POSTの場合は第2引数がリクエストボディ、第3引数が設定オブジェクト
      await executeRequest(() =>
        axios.post(requestUrl, body, { headers: payloadObj?.headers })
      );
      break;

    case METHOD_TYPE.DELETE:
      await executeRequest(() => axios.delete(requestUrl, payloadObj));
      break;

    case METHOD_TYPE.POST_ZIP:
      await executeRequest(() =>
        axios.post(requestUrl, payloadObj.data, payloadObj)
      );
      break;

    default:
  }

  if (errMsg !== null && errMsg !== undefined) {
    // axiosエラーのメッセージがネットワークエラーの場合その旨を返す
    if (axios.isAxiosError(errMsg) && errMsg.message === 'Network Error') {
      return { statusNum: RESULT.NETWORK_ERROR, body: null };
    }

    // axiosエラーのメッセージが転送量エラーの場合その旨を返す
    if (axios.isAxiosError(errMsg) && errMsg.response?.status === 413) {
      return { statusNum: RESULT.TOO_LARGE_ERROR, body: null };
    }
  }

  if (returnObj.statusNum === RESULT.TOKEN_EXPIRED_ERROR) {
    // リフレッシュトークンから取得を行う
    const refleshToken = localStorage.getItem('reflesh_token');
    if (refleshToken !== null) {
      await axios
        .post(`${config.endPointUrl}relogin/`, {
          reflesh_token: refleshToken,
        })
        .then(async (response) => {
          const refleshResponse = response.data as ApiReturnObject;
          if (refleshResponse.statusNum === RESULT.NORMAL_TERMINATION) {
            const tokens = refleshResponse.body as {
              token: string;
              reflesh_token: string;
            };
            localStorage.setItem('token', tokens.token);
            localStorage.setItem('reflesh_token', tokens.reflesh_token);

            // 再度自身を呼び直す
            returnObj = await apiAccess(methodType, url, body);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('reflesh_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('display_name');
            localStorage.removeItem('roll_id');
            returnObj = { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('reflesh_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('display_name');
          localStorage.removeItem('roll_id');
          returnObj = { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
        });
    } else {
      returnObj = { statusNum: RESULT.ABNORMAL_TERMINATION, body: null };
    }
  }
  return returnObj;
};

export default apiAccess;
