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
  Checkbox,
} from 'react-bootstrap';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import {
  DISPLAYNAME_MAX_LENGTH,
  loginIdCheck,
  passwordCheck,
  RollMaster,
  StaffErrorMessage,
} from '../../common/StaffMaster';
import Loading from '../CaseRegistration/Loading';
import ModalDialog from '../common/ModalDialog';
import './StaffEditModal.css';
import { staffData } from './StaffData';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

const toBooleanFlag = (value: unknown): boolean =>
  value === true || value === 'true' || value === 't' || value === 1 || value === '1';

/** react-bootstrap の Checkbox はラベルクリックで state がずれることがあるため、保存時は DOM を正とする */
const readHideSaveConfirmFromDom = (fallback: boolean): boolean => {
  const el = document.getElementById(
    'chkHideSaveConfirm'
  ) as HTMLInputElement | null;
  if (el && typeof el.checked === 'boolean') {
    return el.checked;
  }
  return fallback === true;
};

export const StaffEditModalDialog = (props: {
  onHide: () => void;
  onOk: () => void;
  onCancel: MouseEventHandler<Button>;
  show: boolean;
  title: string;
  insert: boolean;
  data: staffData | undefined;
}) => {
  const { onHide, onOk, onCancel, show, title, insert, data } = props;
  const [userId, setUserId] = useState<number>(-1);
  const [loginId, setLoginId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfilm, setPasswordConfilm] = useState<string>('');
  const [roll, setRoll] = useState<number>(-1);
  const [hideSaveConfirm, setHideSaveConfirm] = useState<boolean>(false);

  const [errShow, setErrShow] = useState(false);
  const [message, setMessage] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);

  const [rollMaster, setRollMaster] = useState<RollMaster[]>([]);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 権限マスタ取得
  const ReadRollMaster = async () => {
    setIsLoading(true);
    // jesgo_user list
    const returnApiObject = await apiAccess(
      METHOD_TYPE.GET,
      `getUserRollItemMaster`
    );
    setIsLoading(false);
    return {
      statusNum: returnApiObject.statusNum,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data: (returnApiObject.body as any)?.data as RollMaster[],
    };
  };

  // モーダルを開いたときだけ初期化する。開いている最中に data 参照が変わってもチェックを戻さない
  useEffect(() => {
    if (!show) return;
    if (data !== undefined) {
      setUserId(data.user_id);
      setLoginId(data.name);
      setDisplayName(data.display_name);
      setRoll(data.roll_id);
      setHideSaveConfirm(toBooleanFlag(data.hide_save_confirm));
    } else {
      setUserId(-1);
      setLoginId('');
      setDisplayName('');
      setRoll(-1);
      setHideSaveConfirm(false);
    }
    setPassword('');
    setPasswordConfilm('');
    // data は show が true になった時点の props を使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    // eslint-disable-next-line no-void
    void ReadRollMaster().then((result) => {
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        if (result.data) {
          setRollMaster([{ roll_id: -1, title: '' }, ...result.data]);
        }
      } else {
        navigate('/login');
      }
    });
  }, []);

  const onChangeItem = (event: React.FormEvent<FormControl>) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const eventTarget: EventTarget & HTMLInputElement =
      event.target as EventTarget & HTMLInputElement;

    let value: number | string;
    switch (eventTarget.id) {
      case 'name':
        value = eventTarget.value;
        setLoginId(value);
        break;
      case 'displayName':
        value = eventTarget.value;
        setDisplayName(value);
        break;
      case 'password':
        value = eventTarget.value;
        setPassword(value);
        break;
      case 'passwordConfilm':
        value = eventTarget.value;
        setPasswordConfilm(value);
        break;
      case 'roll':
        value = eventTarget.value;
        setRoll(Number(value));
        break;
      default:
        break;
    }
  };

  // 入力チェック
  const hasInputError = (isAddUser: boolean) => {
    const errorMessage: string[] = [];

    if (isAddUser) {
      const checkName = loginId.trim();
      if (!checkName) errorMessage.push(StaffErrorMessage.LOGINID_NOT_ENTERED);
      else if (!loginIdCheck(checkName)) {
        errorMessage.push(StaffErrorMessage.LOGINID_POLICY_ERROR);
      }

      const checkDisplayName = displayName.trim();
      if (!checkDisplayName) {
        errorMessage.push(StaffErrorMessage.DISPLAYNAME_NOT_ENTERED);
      } else if (checkDisplayName.length > DISPLAYNAME_MAX_LENGTH) {
        errorMessage.push(StaffErrorMessage.DISPLAYNAME_LENGTH_ERROR);
      }
    }

    // パスワードの確認
    const checkPassword = password.trim();
    const checkPasswordConfilm = passwordConfilm.trim();

    if (isAddUser || checkPassword || checkPasswordConfilm) {
      if (!checkPassword) {
        // パスワード未入力
        errorMessage.push(StaffErrorMessage.PASSWORD_NOT_ENTERED);
      } else {
        // パスワードポリシー確認
        if (!passwordCheck(checkPassword)) {
          errorMessage.push(StaffErrorMessage.PASSWORD_POLICY_ERROR);
        }

        // パスワード確認用との比較
        if (checkPassword !== checkPasswordConfilm) {
          errorMessage.push(StaffErrorMessage.PASSWORD_COMPARE_ERROR);
        }
      }
    }

    if (roll === -1) {
      errorMessage.push(StaffErrorMessage.ROLL_ERROR);
    }

    if (errorMessage.length > 0) {
      setMessage(errorMessage.join('\n'));
      setErrShow(true);
      return true;
    }

    return false;
  };

  const addUser = async () => {
    // password policy
    // const errorMessage: string[] = [];

    if (hasInputError(true)) return;

    const hideSaveConfirmValue = readHideSaveConfirmFromDom(hideSaveConfirm);

    // jesgo_user list
    const returnApiObject = await apiAccess(METHOD_TYPE.POST, `signup/`, {
      name: loginId,
      display_name: displayName,
      password,
      roll_id: roll,
      hide_save_confirm: hideSaveConfirmValue,
    });
    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      // eslint-disable-next-line no-alert
      alert('登録しました');
      onOk();
    } else if (
      returnApiObject.statusNum === RESULT.FAILED_USER_ALREADY_REGISTERED
    ) {
      // eslint-disable-next-line no-alert
      alert('【エラー】\nこのIDは既に登録されています');
    } else {
      // eslint-disable-next-line no-alert
      alert('【エラー】\n登録エラー');
    }
  };

  const updateUser = async () => {
    if (hasInputError(false)) return;

    const hideSaveConfirmValue = readHideSaveConfirmFromDom(hideSaveConfirm);

    // jesgo_user list
    const returnApiObject = await apiAccess(METHOD_TYPE.POST, `editUser/`, {
      user_id: userId,
      name: loginId,
      display_name: displayName,
      password,
      roll_id: roll,
      hide_save_confirm: hideSaveConfirmValue,
    });
    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      // 編集対象がログイン中ユーザーなら、症例編集への反映のため localStorage / Redux も更新する
      if (localStorage.getItem('user_id') === userId.toString()) {
        localStorage.setItem(
          'hide_save_confirm',
          hideSaveConfirmValue.toString()
        );
        dispatch({
          type: 'SAVE_MESSAGE_STATE',
          isHiddenSaveMassage: hideSaveConfirmValue,
          isSaveAfterTabbing: hideSaveConfirmValue,
        });
      }
      // eslint-disable-next-line no-alert
      alert('更新しました');
      onOk();
    } else {
      // eslint-disable-next-line no-alert
      alert('【エラー】\n登録エラー');
    }
  };

  const onSave = async () => {
    setIsLoading(true);
    if (insert) {
      await addUser();
    } else {
      await updateUser();
    }
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
          <FormGroup controlId="name">
            <ControlLabel>ログインID</ControlLabel>
            <FormControl
              required
              className="input-ime-disable"
              autoComplete="new-password"
              autoCorrect="off"
              type="tel"
              placeholder="ログインIDを入力"
              onChange={onChangeItem}
              value={loginId}
              readOnly={!insert}
            />
          </FormGroup>
          <FormGroup controlId="displayName">
            <ControlLabel>表示名</ControlLabel>
            <FormControl
              required
              className="input-ime-active"
              autoComplete="new-password"
              autoCorrect="off"
              type="text"
              placeholder="表示名を入力"
              onChange={onChangeItem}
              value={displayName}
            />
          </FormGroup>
          <FormGroup controlId="roll">
            <ControlLabel>権限</ControlLabel>
            <FormControl
              required
              name="roll"
              defaultValue={-1}
              value={roll}
              onChange={onChangeItem}
              componentClass="select"
            >
              {rollMaster &&
                rollMaster.length > 0 &&
                rollMaster.map((item) => (
                  <option value={item.roll_id}>{item.title}</option>
                ))}
            </FormControl>
          </FormGroup>
          <FormGroup>
            <Checkbox
              id="chkHideSaveConfirm"
              checked={hideSaveConfirm}
              onChange={(event: React.FormEvent<Checkbox>) => {
                const target = event.target as HTMLInputElement;
                setHideSaveConfirm(target.checked === true);
              }}
            >
              症例編集中の保存確認を表示しない
            </Checkbox>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              チェックすると、症例保存時の確認ダイアログ（「以降、この症例の編集中に保存については確認しない」）が表示されなくなります。
            </p>
          </FormGroup>
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
              onChange={onChangeItem}
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
              onChange={onChangeItem}
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

export default StaffEditModalDialog;
