/* eslint-disable react/require-default-props */
import React from 'react';
import { cloneDeep } from 'lodash';

type CsvTableProps = {
  csv: (string | number)[][];
};

const tableStyle: React.CSSProperties = {
  margin: '2rem',
  minWidth: '20rem',
  borderBottom: '1px solid #c0c0c0',
  display: 'table',
  width: 'auto',
};

const trStyle: React.CSSProperties = {
  display: 'table-row',
  width: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'table-row',
  width: 'auto',
  height: '2rem',
  background: '#dcdcdc',
  textAlign: 'center',
};

const cellStyle: React.CSSProperties = {
  maxWidth: '20rem',
  minWidth: '10rem',
  textAlign: 'center',
  border: '1px solid #c0c0c0',
  borderBottom: 'none',
  padding: '0.5rem',
};

const CsvTable = (props: CsvTableProps) => {
  const { csv } = props;

  let csvHeader: (string | number)[] = [];
  let csvData: (string | number)[][] = [];
  const copyCsv = cloneDeep(csv);
  copyCsv.shift();
  if (copyCsv && csv.length > 1) {
    csvHeader = csv[0];
    csvData = copyCsv;
  }
  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {csvHeader && csvData.length > 0 ? (
        <table style={tableStyle}>
          <tr style={headerStyle}>
            {csvHeader.map((column) => (
              <th style={cellStyle}>{column}</th>
            ))}
          </tr>
          {csvData.map((row) => (
            <tr style={trStyle}>
              {row.map((column) => (
                <td style={cellStyle}>{column}</td>
              ))}
            </tr>
          ))}
        </table>
      ) : (
        <span>(なし)</span>
      )}
    </>
  );
};

export default CsvTable;
