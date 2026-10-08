import React, { useCallback, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DropdownButton from 'react-bootstrap/lib/DropdownButton';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import { useNavigate } from 'react-router-dom';
import { RemoveBeforeUnloadEvent } from '../../common/CommonUtility';
import { clearUserSetting } from '../../common/UserSetting';
import { StaffPasswordChangeModalDialog } from '../Staff/StaffPasswordChangeModal';
import ModalDialog from './ModalDialog';
import { UserSettingModalDialog } from './UserSettingModal';

export const UserMenu = (props: {
  title: string | null;
  i: number;
  isConfirm: (() => boolean) | null;
}) => {
  const { title, i, isConfirm } = props;
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [showPasswordChange, setShowPassowrdChange] = useState(false);
  // 利用者ごとの設定(保存確認の表示設定)ダイアログの表示有無
  const [showUserSetting, setShowUserSetting] = useState(false);

  const handleShow = () => {
    if (isConfirm === null || isConfirm()) {
      setShow(true);
    }
  };

  const handlPasswordChenge = useCallback(() => {
    setShowPassowrdChange(true);
  }, []);

  const handleUserSetting = useCallback(() => {
    setShowUserSetting(true);
  }, []);

  const closeUserSetting = useCallback(() => {
    setShowUserSetting(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const modalHide = useCallback(() => {}, []);

  const modalOk = useCallback(() => {
    // ログアウト時にプリセット設定を保存（localStorageに保存されているため自動的に保持される）
    setShow(false);
    RemoveBeforeUnloadEvent();
    
    // tokenと認証情報を削除
    localStorage.removeItem('token');
    localStorage.removeItem('reflesh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('display_name');
    localStorage.removeItem('roll_id');
    
    // 権限情報を削除
    localStorage.removeItem('is_view_roll');
    localStorage.removeItem('is_add_roll');
    localStorage.removeItem('is_edit_roll');
    localStorage.removeItem('is_remove_roll');
    localStorage.removeItem('is_plugin_registerable');
    localStorage.removeItem('is_plugin_executable_select');
    localStorage.removeItem('is_plugin_executable_update');
    localStorage.removeItem('is_data_manage_roll');
    localStorage.removeItem('is_system_manage_roll');

    // 利用者ごとの設定を削除（次にログインする利用者へ引き継がない）
    clearUserSetting();

    // プリセットIDは保持（次回ログイン時に使用）
    // localStorage.removeItem('selected_preset_id'); // コメントアウト：保持する
    
    navigate('/login');
  }, [setShow, navigate]);

  const modalOkPasswordchange = useCallback(() => {
    setShowPassowrdChange(false);
  }, [setShowPassowrdChange]);

  const modalCancel = useCallback(() => {
    setShow(false);
  }, [setShow]);

  const modalCancelPasswoedChange = useCallback(() => {
    setShowPassowrdChange(false);
  }, [setShowPassowrdChange]);

  return (
    <div>
      <ButtonToolbar>
        <DropdownButton
          bsSize="small"
          title={title || 'ユーザーメニュー'}
          key={i}
          id={`dropdown-basic-${0}`}
        >
          <MenuItem onSelect={handlPasswordChenge}>パスワード変更</MenuItem>
          <MenuItem onSelect={handleUserSetting}>保存確認の設定</MenuItem>
          <MenuItem onSelect={handleShow}>ログアウト</MenuItem>
        </DropdownButton>
      </ButtonToolbar>
      <StaffPasswordChangeModalDialog
        show={showPasswordChange}
        onHide={() => modalHide()}
        onOk={() => modalOkPasswordchange()}
        onCancel={() => modalCancelPasswoedChange()}
        title="JESGO パスワード変更"
      />
      <UserSettingModalDialog
        show={showUserSetting}
        onHide={() => modalHide()}
        onOk={closeUserSetting}
        onCancel={closeUserSetting}
        title="JESGO 保存確認の設定"
      />
      <ModalDialog
        show={show}
        onHide={() => modalHide()}
        onOk={() => modalOk()}
        onCancel={() => modalCancel()}
        title="JESGO"
        type="Confirm"
        message="ログアウトしますか？"
      />
    </div>
  );
};

export default UserMenu;
