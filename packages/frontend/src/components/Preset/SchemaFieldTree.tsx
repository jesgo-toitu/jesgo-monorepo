/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TreeView } from '@mui/x-tree-view/TreeView';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { JSONSchema7 } from 'json-schema';
import { getPropItemsAndNames, GetSchemaInfo, GetSchemaIdFromString, CustomSchema } from '../CaseRegistration/SchemaUtility';
import { extractEditableFields, FieldInfo } from '../../common/FieldValueToString';
import CustomTreeItem from '../Schemamanager/CustomTreeItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { Button } from '@mui/material';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import store from '../../store';
import { JesgoDocumentSchema } from '../../store/schemaDataReducer';

/**
 * ツリーアイテムの型定義
 */
export interface SchemaFieldTreeItem {
  /** アイテムID */
  id: string;
  /** 表示名 */
  label: string;
  /** フィールドパス */
  path: string;
  /** 選択可能かどうか（終端項目のみ） */
  selectable: boolean;
  /** 子アイテム */
  children?: SchemaFieldTreeItem[];
  /** フィールド情報 */
  fieldInfo?: FieldInfo;
  /** jesgo:subschemaかどうか */
  isSubSchema?: boolean;
  /** child_schemaかどうか */
  isChildSchema?: boolean;
  /** サブスキーマのパス */
  subSchemaPath?: string;
}

/**
 * スキーマフィールドツリーのProps
 */
interface SchemaFieldTreeProps {
  /** スキーマデータ */
  schema: JSONSchema7;
  /** フィールド選択時のコールバック */
  onFieldSelect: (fieldPath: string, fieldInfo: FieldInfo) => void;
  /** 選択されたフィールドパス */
  selectedFieldPath?: string;
  /** スキーマ情報（child_schemaを取得するため） */
  schemaInfo?: JesgoDocumentSchema | null;
  /** 選択可能な全項目が準備できたときに呼ばれるコールバック */
  onSelectableFieldsReady?: (fields: Array<{ path: string; fieldInfo: FieldInfo }>) => void;
}

/**
 * child_schemaからレコードを取得して子階層を生成する
 */
const generateChildSchemaItems = async (
  childSchemaIds: number[],
  parentPath = ''
): Promise<SchemaFieldTreeItem[]> => {
  const items: SchemaFieldTreeItem[] = [];

  for (const childSchemaId of childSchemaIds) {
    try {
      const schemaInfo = GetSchemaInfo(childSchemaId);
      
      if (schemaInfo && schemaInfo.document_schema) {
        // child_schemaのschema_id_stringからスキーマID部分を抽出（例: /schema/record/flavor -> flavor）
        const schemaIdString = schemaInfo.schema_id_string;
        const pathParts = schemaIdString.split('/').filter(part => part !== '' && part !== 'schema');
        const childSchemaIdName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : schemaIdString;
        
        // 親パスがある場合は結合、ない場合はchild_schema ID名のみ
        const targetParentPath = parentPath 
          ? `${parentPath}.${childSchemaIdName}` 
          : childSchemaIdName;
        
        const childSchemaItems = generateTreeItems(
          schemaInfo.document_schema,
          targetParentPath,
          schemaInfo.document_schema.required,
          undefined,
          schemaInfo.document_schema
        );

        // child_schemaのルートアイテムを作成
        // IDに接頭辞と親パスを含めて一意性を保証
        const childSchemaRootItem: SchemaFieldTreeItem = {
          id: `child:${parentPath ? `${parentPath}.` : ''}${schemaIdString}`,
          label: schemaInfo.title || childSchemaIdName,
          path: targetParentPath,
          selectable: false,
          children: childSchemaItems,
          isSubSchema: false, // child_schemaはサブスキーマではない
          isChildSchema: true, // child_schemaであることを示す
          subSchemaPath: schemaIdString,
        };

        // child_schema内にサブスキーマやchild_schemaがあるかチェック
        const nestedSubSchemaPaths = schemaInfo.subschema;
        const nestedChildSchemaIds = schemaInfo.child_schema || [];
        
        if (nestedSubSchemaPaths && Array.isArray(nestedSubSchemaPaths) && nestedSubSchemaPaths.length > 0) {
          // schemaInfo.subschemaにはスキーマIDの配列が入っている
          // ネストされたサブスキーマのパスを取得
          const nestedPaths: string[] = [];
          for (const nestedSchemaId of nestedSubSchemaPaths) {
            const nestedSchemaInfo = GetSchemaInfo(nestedSchemaId);
            if (nestedSchemaInfo && nestedSchemaInfo.document_schema) {
              const id = nestedSchemaInfo.document_schema.$id;
              if (id && typeof id === 'string') {
                nestedPaths.push(id);
              }
            }
          }
          
          if (nestedPaths.length > 0) {
            const nestedSubSchemaItems = await generateSubSchemaItems(nestedPaths, targetParentPath);
            
            // ネストされたサブスキーマアイテムを追加
            childSchemaRootItem.children = [...childSchemaItems, ...nestedSubSchemaItems];
          }
        }
        
        // child_schema内にchild_schemaがある場合も処理
        if (nestedChildSchemaIds.length > 0) {
          const nestedChildSchemaItems = await generateChildSchemaItems(nestedChildSchemaIds, targetParentPath);
          
          // ネストされたchild_schemaアイテムを追加
          childSchemaRootItem.children = [...(childSchemaRootItem.children || []), ...nestedChildSchemaItems];
        }

        items.push(childSchemaRootItem);
      }
    } catch (error) {
      console.error(`child_schema ${childSchemaId} の取得に失敗しました:`, error);
    }
  }

  return items;
};

/**
 * jesgo:subschemaからレコードを取得して子階層を生成する
 */
const generateSubSchemaItems = async (
  subSchemaPaths: string[],
  parentPath = ''
): Promise<SchemaFieldTreeItem[]> => {
  const items: SchemaFieldTreeItem[] = [];

  for (const subSchemaPath of subSchemaPaths) {
    try {
      // サブスキーマの情報を取得（パスからschema_id_stringを抽出）
      const pathParts = subSchemaPath.split('/').filter(part => part !== '');
      
      // パス形式: /schema/CC/staging -> schema_id_string: /schema/CC/staging
      // 実際のデータベースでは先頭に/schema/が付いている
      let schemaIdString = '';
      if (pathParts.length >= 3) {
        // /schema/CC/staging -> /schema/CC/staging
        schemaIdString = '/' + pathParts.join('/');
      } else if (pathParts.length >= 2) {
        // /schema/CC -> /schema/CC
        schemaIdString = '/' + pathParts.join('/');
      }
      
      if (!schemaIdString) {
        console.warn(`サブスキーマパス ${subSchemaPath} からschema_id_stringを抽出できませんでした`);
        continue;
      }
      
      // schema_id_stringからスキーマIDを取得
      const schemaId = GetSchemaIdFromString(schemaIdString);
      
      if (schemaId === -1) {
        console.warn(`schema_id_string ${schemaIdString} に対応するスキーマIDが見つかりませんでした`);
        continue;
      }
      
      const schemaInfo = GetSchemaInfo(schemaId);
      
      if (schemaInfo && schemaInfo.document_schema) {
        // サブスキーマパスのスキーマID部分を抽出（例: /schema/treatment/radiotherapy -> radiotherapy）
        const subSchemaId = subSchemaPath.split('/').pop() || subSchemaPath;
        
        // 親パスがある場合は結合、ない場合はサブスキーマIDのみ
        const targetParentPath = parentPath 
          ? `${parentPath}.${subSchemaId}` 
          : subSchemaId;
        
        const subSchemaItems = generateTreeItems(
          schemaInfo.document_schema,
          targetParentPath,
          schemaInfo.document_schema.required,
          undefined,
          schemaInfo.document_schema
        );

        // サブスキーマのルートアイテムを作成
        // IDに接頭辞と親パスを含めて一意性を保証
        const subSchemaRootItem: SchemaFieldTreeItem = {
          id: `subschema:${parentPath ? `${parentPath}.` : ''}${subSchemaPath}`,
          label: schemaInfo.title || subSchemaId,
          path: targetParentPath,
          selectable: false,
          children: subSchemaItems,
          isSubSchema: true,
          subSchemaPath: subSchemaPath,
        };

        // サブスキーマ内にサブスキーマやchild_schemaがあるかチェック
        const nestedSubSchemaPaths = schemaInfo.subschema;
        const nestedChildSchemaIds = schemaInfo.child_schema || [];
        
        if (nestedSubSchemaPaths && Array.isArray(nestedSubSchemaPaths) && nestedSubSchemaPaths.length > 0) {
          // schemaInfo.subschemaにはスキーマIDの配列が入っている
          // ネストされたサブスキーマのパスを取得（各スキーマIDからdocument_schemaを取得してidから取得）
          const nestedPaths: string[] = [];
          for (const nestedSchemaId of nestedSubSchemaPaths) {
            const nestedSchemaInfo = GetSchemaInfo(nestedSchemaId);
            if (nestedSchemaInfo && nestedSchemaInfo.document_schema) {
              const id = nestedSchemaInfo.document_schema.$id;
              if (id && typeof id === 'string') {
                nestedPaths.push(id);
              }
            }
          }
          
          if (nestedPaths.length > 0) {
            const nestedSubSchemaItems = await generateSubSchemaItems(nestedPaths, targetParentPath);
            
            // ネストされたサブスキーマアイテムを追加
            subSchemaRootItem.children = [...subSchemaItems, ...nestedSubSchemaItems];
          }
        }
        
        // サブスキーマ内にchild_schemaがある場合も処理
        if (nestedChildSchemaIds.length > 0) {
          const nestedChildSchemaItems = await generateChildSchemaItems(nestedChildSchemaIds, targetParentPath);
          
          // ネストされたchild_schemaアイテムを追加
          subSchemaRootItem.children = [...(subSchemaRootItem.children || []), ...nestedChildSchemaItems];
        }

        items.push(subSchemaRootItem);
      }
    } catch (error) {
      console.error(`サブスキーマ ${subSchemaPath} の取得に失敗しました:`, error);
    }
  }

  return items;
};

/**
 * if-then構造を展開してプロパティを抽出する
 * プリセット管理では条件に関係なく全ての可能性を表示する必要がある
 */
const expandIfThenProperties = (schema: JSONSchema7, originalSchema: JSONSchema7): JSONSchema7 => {
  const expandedProperties: { [key: string]: JSONSchema7 } = {};
  
    // if-then構造を処理
    if (schema.if && schema.then) {
      const thenSchema = schema.then as JSONSchema7;
      if (thenSchema.properties) {
        Object.entries(thenSchema.properties).forEach(([key, propSchema]: [string, any]) => {
          expandedProperties[key] = propSchema;
        });
      }
    }
  
  // if-else構造も処理（通常のスキーマには使用されていない可能性が高い）
  if (schema.if && schema.else) {
    const elseSchema = schema.else as JSONSchema7;
    if (elseSchema.properties) {
      Object.entries(elseSchema.properties).forEach(([key, propSchema]: [string, any]) => {
        if (!expandedProperties[key]) {
          expandedProperties[key] = propSchema;
        }
      });
    }
  }
  
  if (Object.keys(expandedProperties).length > 0) {
    // 元のpropertiesとマージ
    const mergedProperties = { ...schema.properties, ...expandedProperties };
    return {
      ...schema,
      properties: mergedProperties
    } as JSONSchema7;
  }
  
  return schema;
};

/**
 * allOfの全てのthen節からプロパティを抽出して展開する
 * プリセット管理ではformDataが空のため、条件に関係なく全ての可能性を表示する必要がある
 */
const expandAllOfProperties = (schema: JSONSchema7, originalSchema: JSONSchema7): JSONSchema7 => {
  if (!schema.allOf || !Array.isArray(schema.allOf)) {
    return schema;
  }

  const expandedProperties: { [key: string]: JSONSchema7 } = {};
  
  schema.allOf.forEach((allOfItem: any) => {
    // if/then構造の場合
    if (allOfItem.then && allOfItem.then.properties) {
      Object.entries(allOfItem.then.properties).forEach(([key, propSchema]: [string, any]) => {
        // 空のプロパティ（{}）はスキップ
        if (!propSchema || typeof propSchema !== 'object' || Object.keys(propSchema).length === 0) {
          return;
        }
        
        // $refを解決
        if (propSchema.$ref) {
          const resolved = resolveRef(propSchema.$ref, originalSchema);
          if (resolved) {
            expandedProperties[key] = resolved;
          } else {
            expandedProperties[key] = propSchema;
          }
        } else {
          expandedProperties[key] = propSchema;
        }
      });
    }
    
    // thenがpropertiesを持たない場合（直接allOf内にpropertiesがある場合）
    if (allOfItem.properties && Object.keys(allOfItem.properties).length > 0) {
      Object.entries(allOfItem.properties).forEach(([key, propSchema]: [string, any]) => {
        if (!propSchema || typeof propSchema !== 'object' || Object.keys(propSchema).length === 0) {
          return;
        }
        
        if (propSchema.$ref) {
          const resolved = resolveRef(propSchema.$ref, originalSchema);
          if (resolved) {
            expandedProperties[key] = resolved;
          } else {
            expandedProperties[key] = propSchema;
          }
        } else {
          expandedProperties[key] = propSchema;
        }
      });
    }
  });
  
  // 元のpropertiesとマージ
  const mergedProperties = { ...schema.properties, ...expandedProperties };
  
  // 拡張されたpropertiesを含むスキーマを返す
  const result = {
    ...schema,
    properties: mergedProperties
  } as JSONSchema7;
  
  // allOfを残さないように削除
  delete result.allOf;
  
  return result;
};

/**
 * $refを解決してスキーマを取得する
 */
const resolveRef = (ref: string, rootSchema: JSONSchema7): JSONSchema7 | null => {
  if (!ref || !ref.startsWith('#')) return null;
  
  const path = ref.substring(1); // #を除去
  try {
    // JSONPointerを使用して$defsから取得
        const defsSchema = rootSchema.$defs as { [key: string]: JSONSchema7 };
    if (!defsSchema) return null;
    
    const parts = path.split('/').filter(p => p !== ''); // 空文字列を除去
    
    // pathは /$defs/cTNM の形式
    // parts[0] = $defs, parts[1] = cTNM
    if (parts.length === 0) return null;
    
    // $defsから直接アクセス
    if (parts[0] === '$defs' && parts.length >= 2) {
      const defKey = parts[1];
      return defsSchema[defKey] as JSONSchema7;
    }
    
    // $defs以外の場合
    let current: any = defsSchema;
    for (const part of parts) {
      if (part === '$defs') continue; // $defsは既に取得済み
      if (current && typeof current === 'object' && current[part]) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current as JSONSchema7;
  } catch (error) {
    console.error('[resolveRef] エラー:', error);
    return null;
  }
};

/**
 * JSONスキーマからツリーアイテムを生成する（document_schema専用）
 * Registrationのロジックを参考に、小階層を再帰的に表示するように改善
 * オブジェクト内のオブジェクト（小階層）も再帰的に処理される
 * react-jsonschema-formと同様に、propertiesがあれば再帰的に処理する
 */
const generateTreeItems = (
  schema: JSONSchema7,
  parentPath = '',
  parentRequired?: string[],
  rootSchema?: JSONSchema7,
  originalSchema?: JSONSchema7 // 元のスキーマ（$defsを含む）
): SchemaFieldTreeItem[] => {
  // ルートスキーマが指定されていない場合は、自身をルートとする
  if (!rootSchema) {
    rootSchema = schema;
  }
  // originalSchemaも同様に初期化
  if (!originalSchema) {
    originalSchema = schema;
  }
  const items: SchemaFieldTreeItem[] = [];

  if (!schema) {
    return items;
  }

  // Registrationのrjsfが行っているように、propertiesがあれば再帰的に処理
  if (!schema.properties) {
    // propertiesがない場合は終端項目
    return items;
  }

  // まず、スキーマ全体にif-thenがあるかチェック
  if (schema.if && schema.then) {
    const expandedSchema = expandIfThenProperties(schema, originalSchema);
    schema = expandedSchema;
  }
  
  // 次に、スキーマ全体にallOfがあるかチェック
  if (schema.allOf && Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const expandedSchema = expandAllOfProperties(schema, originalSchema);
    
    // 拡張されたスキーマで再帰的に処理
    if (expandedSchema.properties && Object.keys(expandedSchema.properties).length > 0) {
      // 拡張されたpropertiesで処理を続行
      schema = expandedSchema;
    }
  }
  
  // スキーマのpropertiesを取得
  const schemaProps = getPropItemsAndNames(schema);

  // スキーマの各プロパティを処理（Registrationのprops.properties.map((prop) => prop.content)と同じロジック）
  for (const [key, fieldSchema] of Object.entries(schemaProps.pItems)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    let typedFieldSchema = fieldSchema as JSONSchema7;
    
    // 各プロパティにもif-thenがある場合は展開する
    if (typedFieldSchema.if && typedFieldSchema.then) {
      typedFieldSchema = expandIfThenProperties(typedFieldSchema, originalSchema);
    }
    
    // 各プロパティにもallOfがある場合は展開する
    if (typedFieldSchema.allOf && Array.isArray(typedFieldSchema.allOf)) {
      typedFieldSchema = expandAllOfProperties(typedFieldSchema, originalSchema);
    }
    const fieldInfo: FieldInfo = {
      name: key,
      value: null, // プリセット選択では値は不要
      type: Array.isArray(typedFieldSchema.type) ? typedFieldSchema.type[0] : typedFieldSchema.type,
      path: currentPath,
      schema: typedFieldSchema,
      isEditable: true, // プリセット選択では編集可能なもののみ表示
      isRequired: parentRequired?.includes(key) || false,
    };

    // jesgo:requiredが設定されている場合は必須扱い
    const jesgoRequired = (typedFieldSchema as any)['jesgo:required'];
    if (jesgoRequired && Array.isArray(jesgoRequired) && jesgoRequired.length > 0) {
      fieldInfo.isRequired = true;
    }

    // Registrationのrjsfと同様に、propertiesがあれば再帰的に処理
  // typeがobject、またはpropertiesを持つオブジェクトはすべて再帰的に処理
  // allOfやoneOfなど、スキーマが複雑に展開されている可能性もある
  const hasProperties = typedFieldSchema.properties !== undefined && 
                       typedFieldSchema.properties !== null && 
                       Object.keys(typedFieldSchema.properties).length > 0;
  
  // if-thenがある場合は、全ての条件付きフィールドを展開
  if (typedFieldSchema.if && typedFieldSchema.then) {
    const expandedSchema = expandIfThenProperties(typedFieldSchema, originalSchema);
    
    if (expandedSchema.properties && Object.keys(expandedSchema.properties).length > 0) {
      const childItems = generateTreeItems(
        expandedSchema,
        currentPath,
        expandedSchema.required,
        rootSchema,
        originalSchema
      );
      
      if (childItems.length > 0) {
        items.push({
          id: currentPath,
          label: key,
          path: currentPath,
          selectable: false,
          children: childItems,
          fieldInfo,
        });
        continue;
      }
    }
  }
  
  // allOfがある場合は、全ての条件付きフィールドを展開
  if (typedFieldSchema.allOf && Array.isArray(typedFieldSchema.allOf)) {
    const expandedSchema = expandAllOfProperties(typedFieldSchema, originalSchema);
    
    if (expandedSchema.properties && Object.keys(expandedSchema.properties).length > 0) {
      const childItems = generateTreeItems(
        expandedSchema,
        currentPath,
        expandedSchema.required,
        rootSchema,
        originalSchema
      );
      
      if (childItems.length > 0) {
        items.push({
          id: currentPath,
          label: key,
          path: currentPath,
          selectable: false,
          children: childItems,
          fieldInfo,
        });
        continue;
      }
    }
  }
  
  // CustomSchemaで処理済みなので、$refが直接残っている場合は再解決する必要がある
  // ただし、通常はCustomSchemaが既に解決済みなので、以下をチェック
  const refValue = (typedFieldSchema as any).$ref;
  let resolvedSchema = typedFieldSchema;
    
    // $refが残っている場合は原初スキーマから解決を試みる
  if (refValue && typeof refValue === 'string') {
    const resolved = resolveRef(refValue, originalSchema);
    
    if (resolved) {
      resolvedSchema = resolved;
      
      // 解決されたスキーマからプロパティを再取得
      const resolvedHasProperties = resolvedSchema.properties !== undefined && 
                                   resolvedSchema.properties !== null && 
                                   Object.keys(resolvedSchema.properties).length > 0;
      
      if (resolvedHasProperties) {
        const childItems = generateTreeItems(
          resolvedSchema,
          currentPath,
          resolvedSchema.required,
          rootSchema,
          originalSchema
        );

        items.push({
          id: currentPath,
          label: key,
          path: currentPath,
          selectable: false,
          children: childItems,
          fieldInfo,
        });
        continue; // 次のプロパティへ
      }
    }
  }
  
  // oneOfがある場合は処理
  if (resolvedSchema.oneOf && Array.isArray(resolvedSchema.oneOf)) {
    // oneOfの場合、すべての選択肢を展開する
    const childItems: SchemaFieldTreeItem[] = [];
    resolvedSchema.oneOf.forEach((oneOfItem: any) => {
      if (oneOfItem.properties) {
        const oneOfChildren = generateTreeItems(
          oneOfItem,
          currentPath,
          oneOfItem.required,
          rootSchema,
          originalSchema
        );
        childItems.push(...oneOfChildren);
      }
    });
    
    if (childItems.length > 0) {
      items.push({
        id: currentPath,
        label: key,
        path: currentPath,
        selectable: false,
        children: childItems,
        fieldInfo,
      });
      continue;
    }
  }
    
    if (hasProperties) {
      // オブジェクトの場合は再帰的に処理（小階層も含む）
      const childItems = generateTreeItems(
        typedFieldSchema,
        currentPath,
        typedFieldSchema.required,
        rootSchema,
        originalSchema
      );

      // 子要素がある場合は親は選択不可、葉ノード（子のないもの）のみ選択可能
      items.push({
        id: currentPath,
        label: key,
        path: currentPath,
        selectable: false, // オブジェクトは選択不可
        children: childItems,
        fieldInfo,
      });
    } else if (typedFieldSchema.type === 'array' && typedFieldSchema.items) {
      // 配列の場合は各要素を処理
      const arrayItemSchema = typedFieldSchema.items as JSONSchema7;
      
      // 配列の要素にpropertiesがあるかチェック
      const arrayItemHasProperties = arrayItemSchema.properties !== undefined && 
                                     arrayItemSchema.properties !== null && 
                                     Object.keys(arrayItemSchema.properties).length > 0;
      
      if (arrayItemHasProperties) {
        // 配列の要素がオブジェクトの場合（小階層を含む）
        const childItems = generateTreeItems(
          arrayItemSchema,
          `${currentPath}[0]`,
          arrayItemSchema.required,
          rootSchema,
          originalSchema
        );

        items.push({
          id: currentPath,
          label: key,
          path: currentPath,
          selectable: false, // 配列は選択不可
          children: childItems,
          fieldInfo,
        });
      } else {
        // 配列の要素がプリミティブ型の場合
        items.push({
          id: currentPath,
          label: key,
          path: currentPath,
          selectable: true, // プリミティブ配列は選択可能
          fieldInfo,
        });
      }
    } else {
      // 通常のフィールド（終端項目）
      items.push({
        id: currentPath,
        label: key,
        path: currentPath,
        selectable: true, // 終端項目は選択可能
        fieldInfo,
      });
    }
  }

  return items;
};

/**
 * ツリーアイテムをレンダリングする（Material-UI TreeView用）
 */
const renderTreeItem = (
  item: SchemaFieldTreeItem,
  onFieldSelect: (fieldPath: string, fieldInfo: FieldInfo) => void,
  selectedFieldPath?: string
): React.ReactNode => {
  const isSelected = selectedFieldPath === item.path;
  
  const labelContent = (
    <Box
      onClick={(e) => {
        if (item.selectable && item.fieldInfo) {
          e.stopPropagation();
          onFieldSelect(item.path, item.fieldInfo);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '4px 8px',
        cursor: item.selectable ? 'pointer' : 'default',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        borderRadius: '4px',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent',
      }}
    >
      <Box style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <Typography
          variant="body2"
          style={{
            color: item.selectable ? '#333' : '#666',
            fontWeight: item.selectable ? '500' : 'normal',
          }}
        >
          {item.label}
        </Typography>
        {item.fieldInfo?.type && (() => {
          // type=string かつ format=date の場合は date と表示
          const displayType = item.fieldInfo.type === 'string' && 
                              item.fieldInfo.schema?.format === 'date' 
                            ? 'date' 
                            : item.fieldInfo.type;
          return (
            <Chip
              label={displayType}
              size="small"
              style={{
                marginLeft: '8px',
                fontSize: '10px',
                height: '20px',
                backgroundColor: item.selectable ? '#e3f2fd' : '#f5f5f5',
                color: item.selectable ? '#1976d2' : '#666',
              }}
            />
          );
        })()}
        {item.isSubSchema === true && (
          <Chip
            label="サブスキーマ"
            size="small"
            style={{
              marginLeft: '4px',
              fontSize: '10px',
              height: '20px',
              backgroundColor: '#e8f5e8',
              color: '#2e7d32',
            }}
          />
        )}
        {item.isChildSchema === true && (
          <Chip
            label="子スキーマ"
            size="small"
            style={{
              marginLeft: '4px',
              fontSize: '10px',
              height: '20px',
              backgroundColor: '#fff3e0',
              color: '#e65100',
            }}
          />
        )}
        {item.fieldInfo?.isRequired && (
          <Chip
            label="必須"
            size="small"
            style={{
              marginLeft: '4px',
              fontSize: '10px',
              height: '20px',
              backgroundColor: '#ffebee',
              color: '#d32f2f',
            }}
          />
        )}
      </Box>
      {item.selectable && (
        <Typography
          variant="caption"
          style={{
            fontSize: '10px',
            color: '#666',
            fontStyle: 'italic',
          }}
        >
          選択可能
        </Typography>
      )}
    </Box>
  );

  return (
    <CustomTreeItem
      key={item.id}
      itemId={item.id}
      label={labelContent}
    >
      {item.children && item.children.length > 0 && (
        <>
          {item.children.map(child => 
            renderTreeItem(child, onFieldSelect, selectedFieldPath)
          )}
        </>
      )}
    </CustomTreeItem>
  );
};

/**
 * スキーマフィールドツリーコンポーネント
 */
const SchemaFieldTree: React.FC<SchemaFieldTreeProps> = ({
  schema,
  onFieldSelect,
  selectedFieldPath,
  schemaInfo,
  onSelectableFieldsReady,
}) => {
  const [treeItems, setTreeItems] = useState<SchemaFieldTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['root']));
  // コールバックをrefで保持して、依存配列から除外する
  const onSelectableFieldsReadyRef = useRef(onSelectableFieldsReady);
  
  // コールバックが変更されたらrefを更新
  useEffect(() => {
    onSelectableFieldsReadyRef.current = onSelectableFieldsReady;
  }, [onSelectableFieldsReady]);

  // すべてのアイテムを展開状態にするためのID配列を生成（フックは常にトップレベルで定義）
  const getAllItemIds = useCallback((items: SchemaFieldTreeItem[]): string[] => {
    // 再帰的に関数を定義
    const collectIds = (items: SchemaFieldTreeItem[]): string[] => {
      const ids: string[] = [];
      items.forEach(item => {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          ids.push(...collectIds(item.children));
        }
      });
      return ids;
    };
    
    const ids = ['root', ...collectIds(items)];
    return ids;
  }, []);

  // すべて開く処理
  const handleExpandAll = useCallback(() => {
    if (treeItems.length > 0) {
      const allIds = getAllItemIds(treeItems);
      setExpandedItems(new Set(allIds));
    }
  }, [treeItems, getAllItemIds]);

  // すべて閉じる処理
  const handleCollapseAll = useCallback(() => {
    setExpandedItems(new Set(['root']));
  }, []);

  useEffect(() => {
    const loadTreeItems = async () => {
      if (schema) {
        setIsLoading(true);
        try {
          // プリセット選択では条件に関係なく全てのフィールドを表示する必要があるため、
          // CustomSchemaで処理する前にallOfとif-thenを無条件で展開する
          // これにより、条件に関係なく全ての可能性のあるフィールドが表示される
          
          // まずif-then構造を展開
          let expandedSchema = expandIfThenProperties(schema, schema);
          
          // allOf構造を展開
          expandedSchema = expandAllOfProperties(expandedSchema, schema);
          
          // ネストされたallOfとif-thenも展開する（各プロパティレベル）
          if (expandedSchema.properties) {
            const nestedExpandedProperties: { [key: string]: JSONSchema7 } = {};
            Object.entries(expandedSchema.properties).forEach(([key, propSchema]) => {
              let nestedSchema = propSchema as JSONSchema7;
              
              // if-then構造を展開
              if ((propSchema as JSONSchema7).if && (propSchema as JSONSchema7).then) {
                nestedSchema = expandIfThenProperties(nestedSchema, schema);
              }
              
              // allOf構造を展開
              if (nestedSchema.allOf && Array.isArray(nestedSchema.allOf)) {
                nestedSchema = expandAllOfProperties(nestedSchema, schema);
              }
              
              nestedExpandedProperties[key] = nestedSchema;
            });
            expandedSchema.properties = nestedExpandedProperties;
          }
          
          // Registrationと同様にCustomSchemaでスキーマを処理
          // これにより$defsやrefが置き換えられ、cTNMのような複雑なオブジェクトも処理できる
          let processedSchema = CustomSchema({ orgSchema: expandedSchema, formData: {} });
          
          // 処理済みスキーマからツリーアイテムを生成（ルートスキーマも渡す）
          // originalSchema（元のスキーマ）も渡して、$defs参照を可能にする
          const regularItems = generateTreeItems(processedSchema, '', undefined, processedSchema, schema);
          
          // jesgo:subschemaをチェック
          const subSchemaPaths = (processedSchema as any)['jesgo:subschema'];
          let allItems: SchemaFieldTreeItem[] = [...regularItems];
          
          if (subSchemaPaths && Array.isArray(subSchemaPaths)) {
            // サブスキーマアイテムを生成
            const subSchemaItems = await generateSubSchemaItems(subSchemaPaths);
            allItems = [...regularItems, ...subSchemaItems];
          }
          
          // child_schemaをチェック（schemaInfoから取得）
          if (schemaInfo && schemaInfo.child_schema && Array.isArray(schemaInfo.child_schema) && schemaInfo.child_schema.length > 0) {
            // child_schemaアイテムを生成
            const childSchemaItems = await generateChildSchemaItems(schemaInfo.child_schema);
            allItems = [...allItems, ...childSchemaItems];
          }
          
          setTreeItems(allItems);
        } catch (error) {
          console.error('ツリーアイテムの生成に失敗しました:', error);
          // エラーが発生した場合は通常のアイテムのみ表示
          const regularItems = generateTreeItems(schema);
          setTreeItems(regularItems);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTreeItems();
  }, [schema, schemaInfo]);

  // 選択可能な全項目を取得する関数
  const getSelectableFields = useCallback((items: SchemaFieldTreeItem[]): Array<{ path: string; fieldInfo: FieldInfo }> => {
    const selectableFields: Array<{ path: string; fieldInfo: FieldInfo }> = [];
    
    const collectSelectable = (items: SchemaFieldTreeItem[]) => {
      items.forEach(item => {
        if (item.selectable && item.fieldInfo) {
          selectableFields.push({
            path: item.path,
            fieldInfo: item.fieldInfo,
          });
        }
        if (item.children && item.children.length > 0) {
          collectSelectable(item.children);
        }
      });
    };
    
    collectSelectable(items);
    return selectableFields;
  }, []);

  // ツリーアイテムが変更されたら、すべて展開状態にする
  useEffect(() => {
    if (treeItems.length > 0) {
      const allIds = getAllItemIds(treeItems);
      setExpandedItems(new Set(allIds));
      
      // 選択可能な全項目を取得してコールバックを呼び出す
      // refを使用することで、依存配列から除外して無限ループを防ぐ
      if (onSelectableFieldsReadyRef.current) {
        const selectableFields = getSelectableFields(treeItems);
        onSelectableFieldsReadyRef.current(selectableFields);
      }
    }
  }, [treeItems, getAllItemIds, getSelectableFields]);

  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        スキーマフィールドを読み込み中...
      </div>
    );
  }

  if (treeItems.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        スキーマデータがありません
      </div>
    );
  }

  return (
    <div>
      {/* すべて開く/閉じるボタン */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '8px',
        justifyContent: 'flex-end'
      }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleExpandAll}
          disabled={treeItems.length === 0}
          style={{ 
            fontSize: '12px',
            padding: '4px 12px',
            minWidth: 'auto'
          }}
        >
          展開
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleCollapseAll}
          disabled={treeItems.length === 0}
          style={{ 
            fontSize: '12px',
            padding: '4px 12px',
            minWidth: 'auto'
          }}
        >
          折りたたみ
        </Button>
      </div>
      
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff'
      }}>
        <TreeView
          expandedItems={Array.from(expandedItems)}
          onExpandedItemsChange={(event, itemIds) => setExpandedItems(new Set(itemIds as string[]))}
          slots={{
            collapseIcon: ExpandMore,
            expandIcon: ChevronRight,
          }}
        >
          <CustomTreeItem
            itemId="root"
            label={
              <Box style={{ padding: '8px', fontWeight: 'bold', color: '#333' }}>
                スキーマフィールド
              </Box>
            }
          >
            {treeItems.map(item => 
              renderTreeItem(item, onFieldSelect, selectedFieldPath)
            )}
          </CustomTreeItem>
        </TreeView>
      </div>
    </div>
  );
};

export default SchemaFieldTree;
