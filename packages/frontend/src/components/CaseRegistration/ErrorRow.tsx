/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';
import { Button, Glyphicon } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import jsonpatch from 'jsonpatch';
import {
  AddJesgoError,
  ErrorMsgObject,
} from '../../common/CaseRegistrationUtility';
import store from '../../store';
import { RegistrationErrors } from './Definition';
import { Const } from '../../common/Const';

/**
 * エラー表示行
 */
const ErrorRow = React.memo(
  (props: {
    errMsgObj: ErrorMsgObject;
    setErrors: React.Dispatch<React.SetStateAction<RegistrationErrors[]>>;
  }) => {
    const { errMsgObj, setErrors } = props;

    const dispatch = useDispatch();

    /**
     * 削除ボタン押下時の処理
     */
    const deleteError = () => {
      const jesgoDocuments =
        store.getState().formDataReducer.saveData.jesgo_document;
      const targetDoc = jesgoDocuments.find(
        (p) => p.key === errMsgObj.registErrors.documentId
      );
      if (targetDoc && targetDoc.value.document != null) {
        const targetDocValue = targetDoc.value.document as {
          [prop: string]: any;
        };
        const jesgoError = targetDocValue[Const.EX_VOCABULARY.JESGO_ERROR];

        const path = errMsgObj.validateItem?.jsonpath;
        if (path != null) {
          // 削除用のjson-patch
          const patch = [
            {
              op: 'remove',
              path,
            },
          ];

          const patchedObj = jsonpatch.apply_patch(jesgoError, patch);

          if (patchedObj && Array.isArray(patchedObj)) {
            const validErrors = patchedObj.filter((item) => {
              // nullは除外(objectなので最初にはじく)
              if (item == null) {
                return false
              }
              // 空配列は除外
              if (Array.isArray(item)) {
                // 配列中のnullや空白のみの要素は除外する
                return item.filter(value => (value.toString().trim() != '' || value != null)).length > 0;
              }
              // 空オブジェクトは除外
              if (typeof item === 'object') {
                return Object.entries(item).length > 0;
              }
              return item;
            });
            if (validErrors.length > 0) {
              // 新しいjesgo:errorをセット
              targetDocValue[Const.EX_VOCABULARY.JESGO_ERROR] = validErrors;
            } else {
              // jesgo:errorの内容が1つもなければプロパティごと削除
              delete targetDocValue[Const.EX_VOCABULARY.JESGO_ERROR];
            }
          }
        }
        // フォームデータの更新
        dispatch({
          type: 'INPUT',
          schemaId: errMsgObj.registErrors.schemaId,
          formData: targetDocValue,
          documentId: errMsgObj.registErrors.documentId,
          isUpdateInput: true,
        });

        let errors = store.getState().formDataReducer.extraErrors;
        errors = AddJesgoError(
          errors,
          targetDocValue,
          errMsgObj.registErrors.documentId,
          errMsgObj.registErrors.schemaId,
          errMsgObj.registErrors.validationResult.schema
        );

        // 画面更新
        setErrors([...errors]);
        dispatch({ type: 'SET_ERROR', extraErrors: errors });
      }
    };

    return (
      <div className="content-area">
        <div className="error-msg-jesgo-err-div">
          {typeof errMsgObj !== 'string' &&
            errMsgObj.message.split('\n').map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <br />}
                {item}
              </React.Fragment>
            ))}
          {errMsgObj.showDeleteButton && (
            <Button
              bsClass="btn btn-xs"
              onClick={deleteError}
              className="error-msg-btn-delete"
            >
              <Glyphicon glyph="remove" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

export default ErrorRow;
