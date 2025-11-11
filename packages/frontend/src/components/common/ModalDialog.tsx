import React, { MouseEventHandler } from 'react';
import { Modal, Button } from 'react-bootstrap';
import './ModalDialog.css';

export const openModalDialog = (props: {
  onHide: () => void;
  onOk: () => void;
  onCancel: MouseEventHandler<Button>;
  show: boolean;
  title: string;
  type: string;
  message: string;
}) => {
  const { title, onOk, onCancel, type, show, onHide, message } = props;

  const buttonControl = () => {
    if (type === 'Confirm') {
      return (
        <>
          <Button bsStyle="default" onClick={onCancel}>
            いいえ
          </Button>
          <Button bsStyle="primary" onClick={onOk}>
            はい
          </Button>
        </>
      );
    }
    return (
      <Button bsStyle="primary" onClick={onOk}>
        閉じる
      </Button>
    );
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-cr">{message}</Modal.Body>
      <Modal.Footer>{buttonControl()}</Modal.Footer>
    </Modal>
  );
};

export default openModalDialog;
