// ★TODO: JSXの属性を修正する
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import './Login.css';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { settingsFromApi } from './Settings';
import Loading from '../components/CaseRegistration/Loading';
import { storeSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import { LoadPluginList } from '../common/DBUtility';
import { jesgoPluginColumns } from '../common/Plugin';

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

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [facilityName, setFacilityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const f = async () => {
      // 設定情報取得APIを呼ぶ
      const returnApiObject = await apiAccess(METHOD_TYPE.GET, `getSettings`);

      // 正常に取得できた場合設定情報をlocalStorageに格納
      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = returnApiObject.body as settingsFromApi;
        localStorage.setItem('alignment', returned.hisid_alignment);
        localStorage.setItem('digit', returned.hisid_digit);
        localStorage.setItem('alphabet_enable', returned.hisid_alphabet_enable);
        localStorage.setItem('hyphen_enable', returned.hisid_hyphen_enable);
        localStorage.setItem('jesgo_required_highlight', returned.jesgo_required_highlight);
        setFacilityName(returned.facility_name);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  const submit = async () => {
    setIsLoading(true);
    const loginInfo = { name: username, password };
    // ログインAPIを呼ぶ
    const returnApiObject = await apiAccess(
      METHOD_TYPE.POST,
      `login`,
      loginInfo
    );
    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      const localStorageObj = returnApiObject.body as localStorageObject;
      localStorage.setItem('token', localStorageObj.token);
      localStorage.setItem('reflesh_token', localStorageObj.reflesh_token);
      localStorage.setItem('user_id', localStorageObj.user_id.toString());
      localStorage.setItem('display_name', localStorageObj.display_name);
      localStorage.setItem('roll_id', localStorageObj.roll_id.toString());
      localStorage.setItem(
        'is_view_roll',
        localStorageObj.is_view_roll.toString()
      );
      localStorage.setItem(
        'is_add_roll',
        localStorageObj.is_add_roll.toString()
      );
      localStorage.setItem(
        'is_edit_roll',
        localStorageObj.is_edit_roll.toString()
      );
      localStorage.setItem(
        'is_remove_roll',
        localStorageObj.is_remove_roll.toString()
      );
      localStorage.setItem(
        'is_plugin_registerable',
        localStorageObj.is_plugin_registerable.toString()
      );
      localStorage.setItem(
        'is_plugin_executable_select',
        localStorageObj.is_plugin_executable_select.toString()
      );
      localStorage.setItem(
        'is_plugin_executable_update',
        localStorageObj.is_plugin_executable_update.toString()
      );
      localStorage.setItem(
        'is_data_manage_roll',
        localStorageObj.is_data_manage_roll.toString()
      );
      localStorage.setItem(
        'is_system_manage_roll',
        localStorageObj.is_system_manage_roll.toString()
      );

      // スキーマ取得処理
      await storeSchemaInfo(dispatch);

      // プラグイン全ロード処理
      const pluginListReturn = await LoadPluginList(true);
      if (
        pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION ||
        pluginListReturn.statusNum === RESULT.PLUGIN_CACHE
      ) {
        const pluginList = pluginListReturn.body as jesgoPluginColumns[];

        if (pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION) {
          dispatch({ type: 'PLUGIN_LIST', pluginList });
        }
      }

      dispatch({
        type: 'SET_TOP_MENU_INFO',
        topMenuInfo: {
          paramString: '',
          isDetail: false
        },
      });

      navigate('/Patients');
    } else if (returnApiObject.statusNum === RESULT.NETWORK_ERROR) {
      // eslint-disable-next-line no-alert
      alert(`【エラー】\nサーバーへの接続に失敗しました。`);
      setIsLoading(false);
    } else {
      // eslint-disable-next-line no-alert
      alert(
        `【エラー】\nログインに失敗しました。ユーザ名かパスワードが間違っています。\nまたはログイン権限がありません。`
      );
      setIsLoading(false);
    }
  };

  const onSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  const onChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const value = event.currentTarget.value;
    setUsername(value);
  };

  const onChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const value = event.currentTarget.value;
    setPassword(value);
  };

  return (
    <div className="login-box">
      <div className="login-left" />
      <div className="login-right">
        <div className="login-inputarea">
          <div className="login-inputarea-title">
            <p>ログイン</p>
            <p className="ml40">{facilityName}</p>
          </div>
          <div className="login-inputarea-inner">
            <form onSubmit={onSubmit}>
              <div className="flex">
                <div>
                  <div className="mb10">
                    <label className="login-label">ユーザ名</label>
                    <div>
                      <input
                        type="text"
                        className="login-input"
                        placeholder="ユーザ名を入力してください"
                        value={username}
                        onChange={onChangeName}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="login-label">パスワード</label>
                    <div>
                      <input
                        type="password"
                        className="login-input"
                        placeholder="パスワードを入力してください"
                        value={password}
                        onChange={onChangePassword}
                      />
                    </div>
                  </div>
                </div>
                <div className="login-button-outer">
                  <button type="submit" className="login-button">
                    ログイン
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {isLoading && <Loading />}
    </div>
  );
};
