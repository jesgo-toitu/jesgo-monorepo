/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useCallback } from 'react';
import { Modal, Button, Checkbox } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { commonAction } from '../../store/commonReducer';
import '../common/ModalDialog.css';

const SaveConfirmDialog = (props: any) => {
  const dispatch = useDispatch();

  const onChangeMessageHide = useCallback(() => {
    const chkCtrl = document.getElementById(
      'chkMessageHide'
    ) as HTMLInputElement;

    const action: commonAction = {
      type: 'SAVE_MESSAGE_STATE',
      isHiddenSaveMassage: chkCtrl.checked,
    };
    dispatch(action);
  }, []);

  return (
    <Modal show={props.show.showFlg} onHide={props.onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{props.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-cr">
        <p>{props.message}</p>
        <div>
          <Checkbox id="chkMessageHide" inline onChange={onChangeMessageHide}>
            以降、この症例の編集中に保存については確認しない
          </Checkbox>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="default" onClick={props.onCancel}>
          いいえ
        </Button>
        <Button bsStyle="primary" onClick={props.onOk}>
          はい
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveConfirmDialog;
