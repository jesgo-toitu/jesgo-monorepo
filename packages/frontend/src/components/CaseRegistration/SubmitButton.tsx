/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import React, { useEffect, useState } from 'react';
import { Button, Col } from 'react-bootstrap';
import '../../views/Registration.css';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import store from '../../store/index';
import SaveCommand, {
  LoadPluginList,
  responseResult,
} from '../../common/DBUtility';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { RemoveBeforeUnloadEvent, backToPatientsList } from '../../common/CommonUtility';
import { IsNotUpdate } from '../../common/CaseRegistrationUtility';
import { RegistrationErrors } from './Definition';
import { jesgoPluginColumns } from '../../common/Plugin';
import { TargetPatientPluginButton } from '../common/PluginButton';
import { reloadState } from '../../views/Registration';

interface ButtonProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadedJesgoCase: React.Dispatch<React.SetStateAction<responseResult>>;
  setCaseId: React.Dispatch<React.SetStateAction<number | undefined>>;
  setReload: React.Dispatch<React.SetStateAction<reloadState>>;
  setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>;
}

const SubmitButton = (props: ButtonProps) => {
  const { setIsLoading, setLoadedJesgoCase, setCaseId, setReload, setErrors } =
    props;

  const [jesgoPluginList, setJesgoPluginList] = useState<jesgoPluginColumns[]>(
    []
  );

  const dispatch = useDispatch();

  useEffect(() => {
    const f = async () => {
      // プラグイン全ロード処理
      const pluginListReturn = await LoadPluginList();
      if (
        pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION ||
        pluginListReturn.statusNum === RESULT.PLUGIN_CACHE
      ) {
        const pluginList = pluginListReturn.body as jesgoPluginColumns[];

        if (pluginListReturn.statusNum === RESULT.NORMAL_TERMINATION) {
          dispatch({ type: 'PLUGIN_LIST', pluginList });
        }

        setJesgoPluginList(pluginList);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // 保存時の応答
  const [saveResponse, setSaveResponse] = useState<responseResult>({
    message: '',
  });

  const navigate = useNavigate();

  // 保存時のコールバック
  useEffect(() => {
    // 初回描画時などコールバック以外で呼び出された場合は何もしない
    if (saveResponse.resCode === undefined) {
      return;
    }

    // 保存しましたなどのメッセージ表示
    if (
      saveResponse.resCode !== RESULT.TOKEN_EXPIRED_ERROR &&
      saveResponse.message
    ) {
      alert(saveResponse.message);
    }

    setIsLoading(false);

    if (saveResponse.resCode === RESULT.NORMAL_TERMINATION) {
      // 保存して戻る場合は症例一覧に戻る
      if (
        saveResponse.anyValue &&
        (saveResponse.anyValue as boolean) === true
      ) {
        RemoveBeforeUnloadEvent();
        backToPatientsList(navigate);
      } else if (saveResponse.caseId) {
        // 保存ボタンの場合は再読み込み
        setIsLoading(true);
        setLoadedJesgoCase({
          message: '',
          resCode: undefined,
          loadedSaveData: undefined,
        });
        setCaseId(saveResponse.caseId);
        setReload({ isReload: true, caller: '' });
      } else {
        // 読み込み失敗
        setIsLoading(false);
        RemoveBeforeUnloadEvent();
        backToPatientsList(navigate);
      }
    } else if (saveResponse.resCode === RESULT.TOKEN_EXPIRED_ERROR) {
      // トークン期限切れはログイン画面に戻る
      RemoveBeforeUnloadEvent();
      navigate('/login');
    }
  }, [saveResponse]);

  /**
   * 保存ボタンクリック
   * @param isBack 保存して戻る場合はtrue
   */
  const clickSubmit = (isBack: boolean) => {
    const formDatas = store.getState().formDataReducer.formDatas;
    const saveData = store.getState().formDataReducer.saveData;

    // スクロール位置保存
    dispatch({
      type: 'SCROLL_POSITION',
      scrollTop: document.scrollingElement
        ? document.scrollingElement.scrollTop
        : undefined,
    });

    SaveCommand(
      formDatas,
      saveData,
      dispatch,
      setIsLoading,
      setSaveResponse,
      isBack,
      setErrors
    );
  };

  // 保存せずリストに戻る
  const clickCancel = () => {
    if (
      localStorage.getItem('is_edit_roll') !== 'true' ||
      IsNotUpdate() ||
      confirm(
        '画面を閉じて患者リストに戻ります。保存してないデータは失われます。\nよろしいですか？'
      )
    ) {
      RemoveBeforeUnloadEvent();
      backToPatientsList(navigate);
    }
  };

  const getPatient = () => [
    store.getState().formDataReducer.saveData.jesgo_case,
  ];

  return (
    <Col className="user-info-button-col">
      <div className="user-info-button-div">
        <TargetPatientPluginButton
          pluginList={jesgoPluginList}
          getTargetFunction={getPatient}
          setIsLoading={setIsLoading}
          setReload={setReload}
        />
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
        {localStorage.getItem('is_edit_roll') === 'true' && (
          <>
            <Button
              bsStyle="success"
              className="normal-button"
              onClick={() => {
                clickSubmit(false);
              }}
            >
              保存
            </Button>
            <Button
              onClick={() => {
                clickSubmit(true);
              }}
              bsStyle="success"
              className="normal-button"
            >
              保存してリストに戻る
            </Button>
          </>
        )}
        <Button
          onClick={clickCancel}
          bsStyle="primary"
          className="normal-button"
        >
          リストに戻る
        </Button>
      </div>
    </Col>
  );
};

export default SubmitButton;
