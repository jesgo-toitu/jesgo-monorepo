/* eslint-disable no-param-reassign */
/* eslint-disable array-callback-return */
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { Modal, Button, Checkbox } from 'react-bootstrap';
import {
  generateUuid,
  getArrayWithSafe,
  getPointerTrimmed,
  isPointerWithArray,
} from '../../common/CommonUtility';
import './PluginOverwriteConfirm.css';

export type overWriteSchemaInfo = {
  schema_title: string;
  isOverwrite?: boolean;
  uuid?: string;
  itemList: {
    uuid?: string;
    isOverwrite: boolean;
    item_name: string;
    current_value: string | number | any[] | undefined;
    updated_value: string | number | any[] | undefined;
  }[];
};

export type overwriteInfo = {
  his_id: string;
  patient_name: string;
  schemaList?: overWriteSchemaInfo[];
};

export type OverwriteDialogPlop = {
  onHide: () => void;
  onClose: (value: {
    result: boolean;
    skip: boolean;
    body: overWriteSchemaInfo[];
  }) => void;
  show: boolean;
  title: string;
  type: string;
  data: overwriteInfo;
};

export const PluginOverwriteConfirm = (props: OverwriteDialogPlop) => {
  const { title, onClose, onHide, show, data } = props;
  const [schemas, setSchemas] = useState<overWriteSchemaInfo[]>();
  const [isSkip, setIsSkip] = useState(false);

  const handleOk = () => {
    onClose({ result: true, skip: isSkip, body: schemas ?? [] });
  };

  const handleCancel = () => {
    onClose({ result: false, skip: false, body: [] });
  };

  useEffect(() => {
    data.schemaList?.map((schemaLists) => {
      schemaLists.uuid = generateUuid();
      schemaLists.isOverwrite = true;
    });
    setSchemas(data.schemaList);
  }, [data]);

  const setOverWriteCheck = (uuid: string, isChecked: boolean) => {
    const tmpSchema = cloneDeep(schemas);
    tmpSchema?.map((schemaLists) => {
      const targetItem = schemaLists.itemList.find(
        (schema) => schema.uuid === uuid
      );
      if (targetItem) {
        targetItem.isOverwrite = isChecked;
      }
      let allChecked = true;
      schemaLists.itemList.map((item) => {
        if (!item.isOverwrite) {
          allChecked = false;
        }
      });
      schemaLists.isOverwrite = allChecked;
    });
    setSchemas(tmpSchema);
  };

  const setAllCheck = (uuid: string, isChecked: boolean) => {
    const tmpSchema = cloneDeep(schemas);
    const targetSchema = tmpSchema?.find(
      (schemaLists) => schemaLists.uuid === uuid
    );
    if (targetSchema) {
      targetSchema.isOverwrite = isChecked;
      targetSchema.itemList.map((item) => {
        item.isOverwrite = isChecked;
      });
    }
    setSchemas(tmpSchema);
  };

  const buttonControl = () => (
    <>
      <Button bsStyle="default" onClick={handleCancel}>
        キャンセル
      </Button>
      <Button bsStyle="primary" onClick={handleOk}>
        更新
      </Button>
    </>
  );

  return (
    <Modal show={show} onHide={onHide} dialogClassName="modal-size">
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-cr">
        <p>
          患者ID:[ {`${data.his_id}`} ] 患者名: [ {`${data.patient_name}`} ]
        </p>
        <p>
          以下の項目は変更後の値に上書きします。
          <span style={{ color: 'red' }}>
            上書きしない場合はチェックを外してください
          </span>
        </p>
        <div className="modal-inner-element">
          {schemas &&
            schemas.length > 0 &&
            schemas.map((schema) => (
              <>
                <p />
                <p className="overwrite-schema-title">
                  {`【 ${schema.schema_title} 】`}
                </p>
                <table className="confirm-table">
                  <tr className="confirm-tr">
                    <th className="confirm-th">
                      <Checkbox
                        className="overwrite-checkbox"
                        checked={schema.isOverwrite}
                        onChange={() =>
                          setAllCheck(schema.uuid ?? '', !schema.isOverwrite)
                        }
                      >
                        上書きする
                      </Checkbox>
                    </th>
                    <th className="confirm-th">項目名</th>
                    <th className="confirm-th">順番</th>
                    <th className="confirm-th">変更前</th>
                    <th className="confirm-th">変更後</th>
                  </tr>
                  {schema.itemList &&
                    schema.itemList.length > 0 &&
                    schema.itemList.map((schemaItem) => {
                      // Arrayの場合
                      if (
                        Array.isArray(schemaItem.current_value) ||
                        Array.isArray(schemaItem.updated_value)
                      ) {
                        // 要素数が多い方に合わせる
                        const rowCount = Math.max(
                          ((schemaItem.current_value ?? []) as any[]).length,
                          ((schemaItem.updated_value ?? []) as any[]).length
                        );
                        const rowList: JSX.Element[] = [];
                        for (let i = 0; i < rowCount; i += 1) {
                          // 変更前と変更後の値がオブジェクトの場合はJSON.stringifyして文字列にする
                          // 変更前の値
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          let currentValue =
                            getArrayWithSafe(schemaItem.current_value, i) ?? '';
                          if (typeof currentValue === 'object') {
                            currentValue = JSON.stringify(currentValue);
                          }
                          // 変更後の値
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          let updatedValue =
                            getArrayWithSafe(schemaItem.updated_value, i) ?? '';
                          if (typeof updatedValue === 'object') {
                            updatedValue = JSON.stringify(updatedValue);
                          }

                          rowList.push(
                            <tr className="confirm-tr">
                              {/* 上書きチェック 最初の項目以外は非表示 */}
                              <td className="confirm-td aligh-center">
                                {i === 0 && (
                                  <Checkbox
                                    className="overwrite-checkbox"
                                    checked={schemaItem.isOverwrite}
                                    onChange={() =>
                                      setOverWriteCheck(
                                        schemaItem.uuid ?? '',
                                        !schemaItem.isOverwrite
                                      )
                                    }
                                  />
                                )}
                              </td>
                              {/* 項目名 最初の項目以外は非表示 */}
                              <td className="confirm-td">
                                {i === 0 &&
                                  (isPointerWithArray(schemaItem.item_name)
                                    ? getPointerTrimmed(schemaItem.item_name)
                                    : schemaItem.item_name)}
                              </td>
                              {/* 順番 */}
                              <td className="confirm-td aligh-center">
                                {i + 1}
                              </td>
                              {/* 変更前 */}
                              <td className="confirm-td">
                                {currentValue as string}
                              </td>
                              {/* 変更後 */}
                              <td className="confirm-td">
                                {updatedValue as string}
                              </td>
                            </tr>
                          );
                        }

                        return rowList;
                      }
                      // Array以外
                      return (
                        <tr className="confirm-tr">
                          {/* 上書きチェック */}
                          <td className="confirm-td aligh-center">
                            <Checkbox
                              className="overwrite-checkbox"
                              checked={schemaItem.isOverwrite}
                              onChange={() =>
                                setOverWriteCheck(
                                  schemaItem.uuid ?? '',
                                  !schemaItem.isOverwrite
                                )
                              }
                            />
                          </td>
                          {/* 項目名 */}
                          <td className="confirm-td">
                            {isPointerWithArray(schemaItem.item_name)
                              ? getPointerTrimmed(schemaItem.item_name)
                              : schemaItem.item_name}
                          </td>
                          {/* 順番 */}
                          <td className="confirm-td aligh-center"> </td>
                          {/* 変更前 */}
                          <td className="confirm-td">
                            {typeof schemaItem.current_value === 'string'
                              ? schemaItem.current_value
                              : JSON.stringify(schemaItem.current_value)}
                          </td>
                          {/* 変更後 */}
                          <td className="confirm-td">
                            {typeof schemaItem.updated_value === 'string'
                              ? schemaItem.updated_value
                              : JSON.stringify(schemaItem.updated_value)}
                          </td>
                        </tr>
                      );
                    })}
                </table>
              </>
            ))}
        </div>
        <div>
          <Checkbox checked={isSkip} onChange={() => setIsSkip(!isSkip)}>
            以降、すべての項目を上書きし確認ダイアログを表示しない
          </Checkbox>
        </div>
      </Modal.Body>
      <Modal.Footer>{buttonControl()}</Modal.Footer>
    </Modal>
  );
};

export default PluginOverwriteConfirm;
