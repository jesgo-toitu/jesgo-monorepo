/* eslint-disable no-alert */
import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Modal,
  Button,
  ControlLabel,
  FormControl,
  FormGroup,
} from 'react-bootstrap';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { passwordCheck, StaffErrorMessage } from '../../common/StaffMaster';
import Loading from '../CaseRegistration/Loading';
import ModalDialog from '../common/ModalDialog';
import './StaffEditModal.css';

export const StaffPasswordChangeModalDialog = (props: {
  onHide: () => void;
  onOk: () => void;
  onCancel: MouseEventHandler<Button>;
  show: boolean;
  title: string;
}) => {
  const { onHide, onOk, onCancel, show, title } = props;
  const [password, setPassword] = useState<string>('');
  const [passwordConfilm, setPasswordConfilm] = useState<string>('');

  const [errShow, setErrShow] = useState(false);
  const [message, setMessage] = useState<string>('');

  const userId = localStorage.getItem('user_id');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPassword('');
    setPasswordConfilm('');
  }, [show]);

  const onChangeItem = (event: React.FormEvent<FormControl>) => {
    const eventTarget: EventTarget & HTMLInputElement =
      event.target as EventTarget & HTMLInputElement;

    let value: number | string;
    switch (eventTarget.id) {
      case 'password':
        value = eventTarget.value;
        setPassword(value);
        break;
      case 'passwordConfilm':
        value = eventTarget.value;
        setPasswordConfilm(value);
        break;
      default:
        break;
    }
  };

  const updatePassword = async () => {
    // password policy
    const errorMessage: string[] = [];

    const checkPassword = password.trim();
    const checkPasswordConfilm = passwordConfilm.trim();
    if (!checkPassword) {
      // パスワード未入力
      errorMessage.push(StaffErrorMessage.PASSWORD_NOT_ENTERED);
    } else {
      // パスワードポリシーチェック
      if (!passwordCheck(checkPassword)) {
        errorMessage.push(StaffErrorMessage.PASSWORD_POLICY_ERROR);
      }

      // パスワード確認用との比較
      if (checkPassword !== checkPasswordConfilm) {
        errorMessage.push(StaffErrorMessage.PASSWORD_COMPARE_ERROR);
      }
    }

    if (errorMessage.length > 0) {
      setMessage(errorMessage.join('\n'));
      setErrShow(true);
      return;
    }

    // jesgo_user
    const returnApiObject = await apiAccess(
      METHOD_TYPE.POST,
      `changeUserPassword/`,
      { user_id: userId, password }
    );
    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      alert('変更しました');
      onOk();
    } else {
      alert('【エラー】\nパスワード変更に失敗しました');
    }
  };

  const onSave = async () => {
    setIsLoading(true);
    await updatePassword();
    setIsLoading(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const errModalHide = useCallback(() => {}, []);

  const errModalOk = useCallback(() => {
    setErrShow(false);
  }, [errShow]);

  const errModalCancel = useCallback(() => {
    setErrShow(false);
  }, [errShow]);

  return (
    <>
      <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormGroup controlId="password">
            <ControlLabel>
              パスワード
              <br />
              ※半角英数字をそれぞれ1種類以上含む8文字以上20文字以内で入力してください
            </ControlLabel>
            <FormControl
              required
              autoComplete="new-password"
              autoCorrect="off"
              type="password"
              placeholder="パスワードを入力"
              onChange={(e) => onChangeItem(e)}
              value={password}
            />
          </FormGroup>
          <FormGroup controlId="passwordConfilm">
            <ControlLabel>パスワード(確認用)</ControlLabel>
            <FormControl
              required
              autoComplete="new-password"
              autoCorrect="off"
              type="password"
              placeholder="上記と同じパスワードを入力"
              onChange={(e) => onChangeItem(e)}
              value={passwordConfilm}
            />
          </FormGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="default" onClick={onCancel}>
            キャンセル
          </Button>
          <Button bsStyle="primary" onClick={onSave}>
            登録
          </Button>
        </Modal.Footer>
        {isLoading && <Loading />}
      </Modal>
      <ModalDialog
        show={errShow}
        onHide={() => errModalHide()}
        onOk={() => errModalOk()}
        onCancel={() => errModalCancel()}
        title="JESGO"
        type="Alert"
        message={message}
      />
    </>
  );
};

export default StaffPasswordChangeModalDialog;
