import React, { useCallback, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DropdownButton from 'react-bootstrap/lib/DropdownButton';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import { useNavigate } from 'react-router-dom';
import { RemoveBeforeUnloadEvent } from '../../common/CommonUtility';
import { StaffPasswordChangeModalDialog } from '../Staff/StaffPasswordChangeModal';
import ModalDialog from './ModalDialog';

export const UserMenu = (props: {
  title: string | null;
  i: number;
  isConfirm: (() => boolean) | null;
}) => {
  const { title, i, isConfirm } = props;
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [showPasswordChange, setShowPassowrdChange] = useState(false);

  const handleShow = () => {
    if (isConfirm === null || isConfirm()) {
      setShow(true);
    }
  };

  const handlPasswordChenge = useCallback(() => {
    setShowPassowrdChange(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const modalHide = useCallback(() => {}, []);

  const modalOk = useCallback(() => {
    localStorage.removeItem('token');
    setShow(false);
    RemoveBeforeUnloadEvent();
    navigate('/login');
  }, [setShow]);

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
          title={title}
          key={i}
          id={`dropdown-basic-${0}`}
        >
          <MenuItem onSelect={handlPasswordChenge}>パスワード変更</MenuItem>
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
