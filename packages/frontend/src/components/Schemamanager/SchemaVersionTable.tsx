/* eslint-disable react/require-default-props */
import React, { useEffect, useState } from 'react';
import { Button, Checkbox } from 'react-bootstrap';
import { FaDownload } from '@react-icons/all-files/fa/FaDownload';
import { cloneDeep } from 'lodash';
import { schemaWithValid } from '../CaseRegistration/SchemaUtility';
import { formatDateStr } from '../../common/CommonUtility';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';

type SchemaVersionTableProps = {
  schemaList: schemaWithValid[];
  handleCheckClick: (relation: number, type: number, v?: string) => void;
  handleDownloadClick: (
    schemaInfo: JesgoDocumentSchema | null,
    version?: string
  ) => void;
  checkType: number;
  validFrom: string[];
  validUntil: string[];
  setValidFrom: React.Dispatch<React.SetStateAction<string[]>>;
  setValidUntil: React.Dispatch<React.SetStateAction<string[]>>;
};

export const makeInitValidDate = (
  schemaList: schemaWithValid[]
): { validFrom: string[]; validUntil: string[] } => {
  const initValidFrom: string[] = [];
  const initValidUntil: string[] = [];
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < schemaList.length; index++) {
    const schema = schemaList[index].schema;
    initValidFrom.push(formatDateStr(schema.valid_from, '-'));
    initValidUntil.push(
      schema.valid_until ? formatDateStr(schema.valid_until, '-') : ''
    );
  }
  return { validFrom: initValidFrom, validUntil: initValidUntil };
};

const SchemaVersionTable = (props: SchemaVersionTableProps) => {
  const {
    schemaList,
    handleCheckClick,
    handleDownloadClick,
    checkType,
    validFrom,
    validUntil,
    setValidFrom,
    setValidUntil,
  } = props;

  const [checkEdit, setCheckEdit] = useState<boolean>(false);
  const setValidFromSafe = (date: string, index: number) => {
    const tmpValidFrom = cloneDeep(validFrom);
    tmpValidFrom[index] = date;
    setValidFrom(tmpValidFrom);
  };

  const setValidUntilSafe = (date: string | null, index: number) => {
    const tmpValidUntil = cloneDeep(validUntil);
    tmpValidUntil[index] = date ?? '';
    setValidUntil(tmpValidUntil);
  };

  const INPUT_TYPE = {
    VALID: 0,
    UNTIL: 1,
  };
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
    type: number
  ) => {
    event.preventDefault();
    if (type === INPUT_TYPE.VALID) {
      setValidFromSafe(event.currentTarget.value, index);
    } else if (type === INPUT_TYPE.UNTIL) {
      setValidUntilSafe(event.currentTarget.value, index);
    }
  };

  useEffect(() => {
    if (checkEdit) {
      setCheckEdit(false);
    } else {
      const initValids = makeInitValidDate(schemaList);
      setValidFrom(initValids.validFrom);
      setValidUntil(initValids.validUntil);
    }
  }, [schemaList]);

  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {!schemaList ||
      schemaList.length === 0 ||
      schemaList[0].schema.schema_id === 0 ? (
        <span>(なし)</span>
      ) : (
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <table className="sortable-table">
          <thead>
            <tr className="sortable-table-head">
              <th className="sortable-table-cell3">バージョン</th>
              <th className="sortable-table-cell4">開始日</th>
              <th className="sortable-table-cell5"> </th>
              <th className="sortable-table-cell4">終了日</th>
              <th className="sortable-table-cell6">有効</th>
            </tr>
          </thead>
          <tbody className="sortable-table-body">
            {schemaList.map((row, index) => (
              <tr className="version-table-row">
                <td className="sortable-table-cell3">
                  {`${row.schema.version_major}.${row.schema.version_minor}`}
                  <div className="spacer10" />
                  <Button
                    className="version-download"
                    onClick={() =>
                      handleDownloadClick(
                        row.schema,
                        `${row.schema.version_major}.${row.schema.version_minor}`
                      )
                    }
                  >
                    <FaDownload />
                  </Button>
                </td>
                <td className="sortable-table-cell4">
                  <div>
                    <input
                      type="date"
                      size={16}
                      value={validFrom[index]}
                      onChange={(e) =>
                        handleInputChange(e, index, INPUT_TYPE.VALID)
                      }
                    />
                  </div>
                </td>
                <td className="sortable-table-cell5">～</td>
                <td className="sortable-table-cell4">
                  <div>
                    <input
                      type="date"
                      size={16}
                      value={validUntil[index]}
                      onChange={(e) =>
                        handleInputChange(e, index, INPUT_TYPE.UNTIL)
                      }
                    />
                  </div>
                </td>
                <td className="sortable-table-cell6">
                  <Checkbox
                    className="show-flg-checkbox"
                    checked={row.valid}
                    onChange={() => {
                      setCheckEdit(true);
                      handleCheckClick(checkType, -1, index.toString());
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default SchemaVersionTable;
