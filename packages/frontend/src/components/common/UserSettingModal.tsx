/* eslint-disable no-alert */
import React, { MouseEventHandler, useEffect, useState } from 'react';
import { Modal, Button, Checkbox, FormGroup, HelpBlock } from 'react-bootstrap';
import {
  DEFAULT_USER_SETTING,
  SaveConfirmSettingText,
  UserSetting,
} from '@jesgo/common';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { storeHideSaveConfirm } from '../../common/UserSetting';
import Loading from '../CaseRegistration/Loading';

/**
 * APIの応答から利用者ごとの設定を取り出す
 * @param body APIの応答(body)
 * @returns 設定。形式が想定と異なる場合は undefined
 */
const toUserSetting = (body: unknown): UserSetting | undefined => {
  if (body === null || typeof body !== 'object') {
    return undefined;
  }
  const value = (body as { hide_save_confirm?: unknown }).hide_save_confirm;
  return typeof value === 'boolean' ? { hide_save_confirm: value } : undefined;
};

/**
 * 利用者ごとの設定ダイアログ（ユーザーメニューから本人が開く）
 * 現在の項目は「保存確認の表示設定」のみ
 */
export const UserSettingModalDialog = (props: {
  onHide: () => void;
  onOk: () => void;
  onCancel: () => void;
  show: boolean;
  title: string;
}) => {
  const { onHide, onOk, onCancel, show, title } = props;

  // 保存確認ダイアログを表示しないか否か
  const [hideSaveConfirm, setHideSaveConfirm] = useState<boolean>(
    DEFAULT_USER_SETTING.hide_save_confirm
  );
  // サーバから現在の設定を読み込めたか否か(読み込めるまでは登録させない)
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ダイアログを開くたびに、サーバに保存されている現在の設定を読み込む
  useEffect(() => {
    if (!show) {
      return undefined;
    }

    let canceled = false;
    setIsLoaded(false);
    setIsLoading(true);

    const loadSetting = async () => {
      const returnApiObject = await apiAccess(
        METHOD_TYPE.GET,
        `getUserSetting`
      );
      if (canceled) {
        return;
      }
      setIsLoading(false);

      const setting =
        returnApiObject.statusNum === RESULT.NORMAL_TERMINATION
          ? toUserSetting(returnApiObject.body)
          : undefined;
      if (setting) {
        setHideSaveConfirm(setting.hide_save_confirm);
        setIsLoaded(true);
        // 画面に表示する状態と実際の挙動を一致させるため、保持している設定も読み込んだ値に合わせる
        storeHideSaveConfirm(setting.hide_save_confirm);
      } else {
        alert('【エラー】\n設定の読み込みに失敗しました');
        onCancel();
      }
    };
    // eslint-disable-next-line no-void
    void loadSetting();

    return () => {
      canceled = true;
    };
  }, [show]);

  const onChangeHideSaveConfirm = (event: React.FormEvent<Checkbox>) => {
    const eventTarget = event.target as EventTarget & HTMLInputElement;
    setHideSaveConfirm(eventTarget.checked);
  };

  const onSave = async () => {
    if (!isLoaded) {
      return;
    }

    setIsLoading(true);
    const requestBody: UserSetting = { hide_save_confirm: hideSaveConfirm };
    const returnApiObject = await apiAccess(
      METHOD_TYPE.POST,
      `updateUserSetting/`,
      requestBody
    );
    setIsLoading(false);

    const saved =
      returnApiObject.statusNum === RESULT.NORMAL_TERMINATION
        ? toUserSetting(returnApiObject.body)
        : undefined;
    if (saved) {
      // サーバに保存できた場合のみ、保持している設定を書き換える(以降のタブ切り替えから有効)
      storeHideSaveConfirm(saved.hide_save_confirm);
      alert('変更しました');
      onOk();
    } else {
      // 保存できなかった場合は保持している設定を変えず、ダイアログも閉じない
      alert('【エラー】\n設定の変更に失敗しました');
    }
  };

  const onClickCancel: MouseEventHandler<Button> = () => {
    onCancel();
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormGroup>
          <Checkbox
            id="userHideSaveConfirm"
            checked={hideSaveConfirm}
            disabled={!isLoaded}
            onChange={onChangeHideSaveConfirm}
          >
            {SaveConfirmSettingText.LABEL}
          </Checkbox>
          <HelpBlock>{SaveConfirmSettingText.DESCRIPTION}</HelpBlock>
        </FormGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="default" onClick={onClickCancel}>
          キャンセル
        </Button>
        <Button bsStyle="primary" onClick={onSave} disabled={!isLoaded}>
          登録
        </Button>
      </Modal.Footer>
      {isLoading && <Loading />}
    </Modal>
  );
};

export default UserSettingModalDialog;
