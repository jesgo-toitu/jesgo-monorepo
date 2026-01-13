/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import CustomTreeItem from './CustomTreeItem';

export type treeSchema = {
  schema_id: number;
  schema_title: string;
  subschema: treeSchema[];
  childschema: treeSchema[];
  inheritschema: treeSchema[];
};

export type treeApiObject = {
  treeSchema: treeSchema[];
  commonTreeSchema: treeSchema[];
  errorMessages: string[];
};

export const SCHEMA_TYPE = {
  SUBSCHEMA: 0,
  CHILDSCHEMA: 1,
  INHERITSCHEMA: 2,
};

const collapseIcon = [<ExpandMore />, <ExpandMore />, <ExpandMore />];
const expandIcon = [<ChevronRight />, <ChevronRight />, <ChevronRight />];

const titleGenerator = (schemaType: number, title: string) => {
  let prefix = '';
  if (schemaType === SCHEMA_TYPE.SUBSCHEMA) prefix = '*';
  else if (schemaType === SCHEMA_TYPE.INHERITSCHEMA) prefix = '[継承]';
  return `${prefix}${title}`;
};

export const makeTree = (props: {
  schemas: treeSchema[];
  handleTreeItemClick: (
    event:
      | React.MouseEvent<HTMLLIElement, MouseEvent>
      | React.MouseEvent<HTMLDivElement, MouseEvent>,
    v: string
  ) => void;
  schemaType: number;
  parentPath?: string;
}) => {
  const { schemas, handleTreeItemClick, schemaType, parentPath = 'root' } = props;

  return (
    <>
      {schemas.map((item: treeSchema) => {
        // 一意のitemIdを生成: 親のパス + スキーマタイプ + スキーマID
        const uniqueItemId = `${parentPath}_${schemaType}_${item.schema_id}`;
        
        return (
          <CustomTreeItem
            itemId={uniqueItemId}
            key={uniqueItemId}
            label={titleGenerator(schemaType, item.schema_title)}
            onClick={(e) => {
              handleTreeItemClick(e, item.schema_id.toString());
            }}
          >
            {makeTree({
              schemas: item.subschema,
              handleTreeItemClick,
              schemaType: SCHEMA_TYPE.SUBSCHEMA,
              parentPath: uniqueItemId,
            })}
            {makeTree({
              schemas: item.childschema,
              handleTreeItemClick,
              schemaType: SCHEMA_TYPE.CHILDSCHEMA,
              parentPath: uniqueItemId,
            })}
            {makeTree({
              schemas: item.inheritschema,
              handleTreeItemClick,
              schemaType: SCHEMA_TYPE.INHERITSCHEMA,
              parentPath: uniqueItemId,
            })}
          </CustomTreeItem>
        );
      })}
    </>
  );
};

export default makeTree;
