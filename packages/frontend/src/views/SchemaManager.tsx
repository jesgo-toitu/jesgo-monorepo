/* eslint-disable no-plusplus */
/* eslint-disable no-alert */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Button, Nav, NavItem, Panel, Checkbox } from 'react-bootstrap';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { TreeView } from '@mui/x-tree-view/TreeView';
import Box from '@mui/material/Box';
import lodash from 'lodash';
import { useDispatch } from 'react-redux';
import { saveAs } from 'file-saver';
import CustomTreeItem from '../components/Schemamanager/CustomTreeItem';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { settingsFromApi } from './Settings';
import { responseResult, UploadSchemaFile } from '../common/DBUtility';
import Loading from '../components/CaseRegistration/Loading';
import { Const } from '../common/Const';
import './SchemaManager.css';
import SchemaTree, {
  SCHEMA_TYPE,
  treeSchema,
  treeApiObject,
} from '../components/Schemamanager/SchemaTree';

import { JesgoDocumentSchema } from '../store/schemaDataReducer';
import {
  parentSchemaList,
  GetSchemaInfo,
  GetParentSchemas,
  schemaWithValid,
  storeSchemaInfo,
  GetSchemaVersionedInfo,
} from '../components/CaseRegistration/SchemaUtility';
import DndSortableTable from '../components/Schemamanager/DndSortableTable';
import {
  AddBeforeUnloadEvent,
  backToPatientsList,
  isDate,
  RemoveBeforeUnloadEvent,
} from '../common/CommonUtility';
import SchemaVersionTable, {
  makeInitValidDate,
} from '../components/Schemamanager/SchemaVersionTable';

type settings = {
  facility_name: string;
};

const SchemaManager = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('display_name');
  const [facilityName, setFacilityName] = useState('');
  const [, setSettingJson] = useState<settings>({
    facility_name: '',
  });
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const [schemaUploadResponse, setSchemaUploadResponse] =
    useState<responseResult>({ message: '', resCode: undefined });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedSchemaInfo, setSelectedSchemaInfo] =
    useState<JesgoDocumentSchema>();
  const [selectedSchemaParentInfo, setSelectedSchemaParentInfo] =
    useState<parentSchemaList>();
  const [childSchemaList, setChildSchemaList] = useState<schemaWithValid[]>([]);
  const [subSchemaList, setSubSchemaList] = useState<schemaWithValid[]>([]);

  const [inheritSchemaList, setInheritSchemaList] = useState<schemaWithValid[]>(
    []
  );

  const [versionedSchemaList, setVersionedSchemaList] = useState<
    schemaWithValid[]
  >([]);
  const [validFrom, setValidFrom] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState<string[]>([]);

  const [selectedBaseSchemaInfo, setSelectedBaseSchemaInfo] =
    useState<JesgoDocumentSchema>();

  const [tree, setTree] = useState<treeSchema[]>([]);
  const dispatch = useDispatch();

  // 選択中のスキーマと関係性のあるスキーマを更新する
  const upDateSchemaRelation = () => {
    const schema = GetSchemaInfo(Number(selectedSchema), null, false, true);
    if (schema !== undefined) {
      setSelectedSchemaInfo(schema);

      // サブスキーマ、子スキーマも更新する
      // subschema
      // 現在のサブスキーマリストは全て有効なので、後ろに初期サブスキーマを合体させ重複を削除する
      const tempSubSchemaList = lodash.union(
        schema.subschema,
        schema.subschema_default
      );
      const currentSubSchemaList: schemaWithValid[] = [];
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < tempSubSchemaList.length; i++) {
        // 元々の現在のサブスキーマリストに含まれていた部分は有効扱いにする
        const tempSchema = GetSchemaInfo(
          tempSubSchemaList[i],
          null,
          false,
          true
        );
        if (tempSchema) {
          currentSubSchemaList.push({
            valid: i <= schema.subschema.length,
            schema: tempSchema,
          });
        }
      }
      setSubSchemaList(currentSubSchemaList);

      // childschema
      // 現在の子スキーマリストは全て有効なので、後ろに初期子スキーマを合体させ重複を削除する
      const tempChildSchemaList = lodash.union(
        schema.child_schema,
        schema.child_schema_default
      );
      const currentChildSchemaList: schemaWithValid[] = [];
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < tempChildSchemaList.length; i++) {
        // 元々の現在のサブスキーマリストに含まれていた部分は有効扱いにする
        const tempSchema = GetSchemaInfo(
          tempChildSchemaList[i],
          null,
          false,
          true
        );
        if (tempSchema) {
          currentChildSchemaList.push({
            valid: i + 1 <= schema.child_schema.length,
            schema: tempSchema,
          });
        }
      }
      setChildSchemaList(currentChildSchemaList);

      // 継承スキーマ
      // TODO: 本来は継承/回帰関係にあるスキーマをすべて表示する
      const unionInheritSchemaList = lodash.union(
        schema.inherit_schema,
        schema.inherit_schema_default
      );

      const tmpInheritSchemaList = unionInheritSchemaList.map((inhId, i) => ({
        valid: i + 1 <= schema.inherit_schema.length,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        schema: GetSchemaInfo(inhId, null, false, true)!,
        validCheckDisabled: false,
      }));
      // 継承スキーマがある場合、自身のスキーマも加える
      if (tmpInheritSchemaList.length > 0) {
        tmpInheritSchemaList.unshift({
          valid: true,
          schema,
          validCheckDisabled: true,
        });
      }
      setInheritSchemaList(tmpInheritSchemaList);

      // バージョン一覧
      const tmpSchemaVersionList = GetSchemaVersionedInfo(
        Number(selectedSchema)
      );
      const currentSchemaVersion: schemaWithValid[] = [];
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < tmpSchemaVersionList.length; i++) {
        const tempSchema = tmpSchemaVersionList[i];
        if (tempSchema) {
          currentSchemaVersion.push({
            valid: !tempSchema.hidden,
            schema: tempSchema,
          });
        }
      }
      setVersionedSchemaList(currentSchemaVersion);
    }

    setSelectedSchemaParentInfo(GetParentSchemas(Number(selectedSchema)));
  };

  // 表示に関係するスキーマの再取得を行う
  const schemaReload = async () => {
    // スキーマツリーを取得する
    const treeApiReturnObject = await apiAccess(METHOD_TYPE.GET, `gettree`);

    if (treeApiReturnObject.statusNum === RESULT.NORMAL_TERMINATION) {
      const returned = treeApiReturnObject.body as treeApiObject;
      setTree(returned.treeSchema);
      const newErrorMessages = lodash.cloneDeep(errorMessages);
      for (let i = 0; i < returned.errorMessages.length; i++) {
        newErrorMessages.push(returned.errorMessages[i]);
      }
      setErrorMessages(newErrorMessages);
    } else {
      RemoveBeforeUnloadEvent();
      navigate('/login');
    }

    // スキーマ取得処理
    await storeSchemaInfo(dispatch);
    setSelectedSchemaInfo(
      GetSchemaInfo(Number(selectedSchema), null, false, true)
    );
    upDateSchemaRelation();
  };

  useEffect(() => {
    // ブラウザの戻る・更新の防止
    AddBeforeUnloadEvent();

    const f = async () => {
      // 設定情報取得APIを呼ぶ
      const returnApiObject = await apiAccess(METHOD_TYPE.GET, `getSettings`);

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = returnApiObject.body as settingsFromApi;
        const setting: settings = {
          facility_name: returned.facility_name,
        };
        setFacilityName(returned.facility_name);
        setSettingJson(setting);
      } else {
        RemoveBeforeUnloadEvent();
        navigate('/login');
        return;
      }

      // スキーマツリーを取得する
      const treeApiReturnObject = await apiAccess(METHOD_TYPE.GET, `gettree`);

      if (treeApiReturnObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = treeApiReturnObject.body as treeApiObject;
        setTree(returned.treeSchema);
        const newErrorMessages = lodash.cloneDeep(errorMessages);
        for (let i = 0; i < returned.errorMessages.length; i++) {
          newErrorMessages.push(returned.errorMessages[i]);
        }
        setErrorMessages(newErrorMessages);
      } else {
        // 権限エラーの場合は適切なメッセージを表示
        if (treeApiReturnObject.statusNum === RESULT.ABNORMAL_TERMINATION) {
          alert('スキーマ管理機能へのアクセス権限がありません。システム管理者にお問い合わせください。');
          RemoveBeforeUnloadEvent();
          navigate('/Patients'); // 患者リスト画面に戻る
          return;
        }
        // その他のエラー（トークン期限切れ等）の場合はログイン画面へ
        RemoveBeforeUnloadEvent();
        navigate('/login');
        return;
      }

      // スキーマ取得処理
      await schemaReload();
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // 選択中のスキーマが変更されたとき
  useEffect(() => {
    upDateSchemaRelation();
  }, [selectedSchema]);

  // 親スキーマからみた表示、非表示がDBに保存されている状態から変更されているかを見る
  // 変更された親スキーマのリストを返す
  const getNeedUpdateParents = (
    isCheckOnly: boolean // trueの場合チェックのみ行う
  ): JesgoDocumentSchema[] => {
    // 更新用スキーマリスト
    const updateSchemaList: JesgoDocumentSchema[] = [];

    // 親スキーマ情報をチェック
    if (selectedSchemaParentInfo !== undefined) {
      // (親から見た)サブスキーマは保留

      // (親から見た)子スキーマ整合性チェック
      const parentFromChildSchema =
        selectedSchemaParentInfo.fromChildSchema ?? [];
      for (let i = 0; i < parentFromChildSchema.length; i++) {
        const parentSchema = parentFromChildSchema[i].schema;
        // 編集後のスキーマに親子関係があり、編集前スキーマに親子関係がない場合
        if (
          parentFromChildSchema[i].valid &&
          !parentSchema.child_schema.includes(Number(selectedSchema))
        ) {
          if (!isCheckOnly) {
            parentSchema.child_schema.push(Number(selectedSchema));
          }
          updateSchemaList.push(parentSchema);
        }

        // 編集後のスキーマに親子関係がなく、編集前スキーマに親子関係がある場合
        else if (
          !parentFromChildSchema[i].valid &&
          parentSchema.child_schema.includes(Number(selectedSchema))
        ) {
          const targetIndex = parentSchema.child_schema.indexOf(
            Number(selectedSchema)
          );
          if (!isCheckOnly) {
            parentSchema.child_schema.splice(targetIndex, 1);
          }
          updateSchemaList.push(parentSchema);
        }

        // 編集後、編集前の親子関係が同じなら更新しない
      }
    }

    return updateSchemaList;
  };

  const isNeedUpdateSchema = (): boolean => {
    let isChange = false;
    // 表示中のスキーマの子関係
    const baseSchemaInfo = lodash.cloneDeep(selectedSchemaInfo);
    if (baseSchemaInfo !== undefined) {
      // サブスキーマ
      // 編集中のサブスキーマのうち有効であるもののみのリストを作る
      const tempSubSchemaList: number[] = [];
      for (let i = 0; i < subSchemaList.length; i++) {
        if (subSchemaList[i].valid) {
          tempSubSchemaList.push(subSchemaList[i].schema.schema_id);
        }
      }
      // 有効サブスキーマリストと編集前のスキーマリストが異なれば更新をかける
      if (!lodash.isEqual(tempSubSchemaList, baseSchemaInfo.subschema)) {
        baseSchemaInfo.subschema = tempSubSchemaList;
        isChange = true;
      }

      // 子スキーマ
      // 編集中の子スキーマのうち有効であるもののみのリストを作る
      const tempChildSchemaList: number[] = [];
      for (let i = 0; i < childSchemaList.length; i++) {
        if (childSchemaList[i].valid) {
          tempChildSchemaList.push(childSchemaList[i].schema.schema_id);
        }
      }
      // 有効子スキーマリストと編集前のスキーマリストが異なれば更新をかける
      if (!lodash.isEqual(tempChildSchemaList, baseSchemaInfo.child_schema)) {
        baseSchemaInfo.child_schema = tempChildSchemaList;
        isChange = true;
      }

      // 継承スキーマ
      const tempInheritSchemaList: number[] = [];
      for (let i = 0; i < inheritSchemaList.length; i++) {
        if (inheritSchemaList[i].valid) {
          tempInheritSchemaList.push(inheritSchemaList[i].schema.schema_id);
        }
      }

      // 継承スキーマがある場合、自身のスキーマをデフォルトスキーマとして追加
      if (inheritSchemaList.length > 0) {
        baseSchemaInfo.inherit_schema.unshift(baseSchemaInfo.schema_id);
      }

      if (
        !lodash.isEqual(tempInheritSchemaList, baseSchemaInfo.inherit_schema)
      ) {
        isChange = true;
      }
    }
    return isChange;
  };

  const isNeedUpdateValidDate = (): boolean => {
    let isChange = false;
    const tmpSchemaVersionList = GetSchemaVersionedInfo(Number(selectedSchema));
    const defaultSchemaVersion: schemaWithValid[] = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < tmpSchemaVersionList.length; i++) {
      const tempSchema = tmpSchemaVersionList[i];
      if (tempSchema) {
        defaultSchemaVersion.push({
          valid: !tempSchema.hidden,
          schema: tempSchema,
        });
      }
    }
    const valids = makeInitValidDate(defaultSchemaVersion);
    // 有効無効の一致確認
    if (!lodash.isEqual(defaultSchemaVersion, versionedSchemaList)) {
      isChange = true;
    }

    // 開始日の一致確認
    if (!lodash.isEqual(valids.validFrom, validFrom)) {
      isChange = true;
    }

    // 終了日の一致確認
    if (!lodash.isEqual(valids.validUntil, validUntil)) {
      isChange = true;
    }

    return isChange;
  };

  /**
   * 有効期限にエラーがあるかを確認する
   * @returns エラーが1個以上あれば警告を出してtrueを返す
   */
  const isValidDateError = (alertable = false): boolean => {
    type enableSchemas = {
      schema: JesgoDocumentSchema;
      validFrom: string;
      validUntil: string;
    };
    const enabledSchemas: enableSchemas[] = [];
    const tmpErrorMessages = [];
    let firstEnableChecked = false;

    const VALID_TYPE = { FROM: 0, UNTIL: 1 };

    const getVersionText = (schema: JesgoDocumentSchema) =>
      `${schema.version_major}.${schema.version_minor}`;

    const makeErrorMessage = (
      schema: JesgoDocumentSchema,
      validType: number,
      subMessage: string
    ): string => {
      const validMessage = validType === VALID_TYPE.FROM ? '開始日' : '終了日';
      return `バージョン「${getVersionText(
        schema
      )}」の${validMessage}に誤りがあります。${subMessage}`;
    };

    // 各行について処理を行う、indexが若いものが一番最新のバージョン
    for (let index = 0; index < versionedSchemaList.length; index++) {
      const target = versionedSchemaList[index];
      const targetValidFrom = validFrom[index];
      const targetValidUntil = validUntil[index];

      // 有効、無効問わず開始日は空文字不可
      if (!isDate(targetValidFrom)) {
        tmpErrorMessages.push(
          makeErrorMessage(
            target.schema,
            VALID_TYPE.FROM,
            '開始日を入力してください。'
          )
        );
      }

      // 有効無効振り分け
      if (target.valid) {
        // 有効スキーマに追加
        enabledSchemas.push({
          schema: target.schema,
          validFrom: targetValidFrom,
          validUntil: targetValidUntil,
        });

        // 終了日は最新のみ空文字可能
        if (!firstEnableChecked) {
          firstEnableChecked = true;
          // 一番新しい有効スキーマの場合は終了日にも空文字を許可する
          if (targetValidUntil !== '' && !isDate(targetValidUntil)) {
            tmpErrorMessages.push(
              makeErrorMessage(
                target.schema,
                VALID_TYPE.UNTIL,
                '終了日を入力してください。'
              )
            );
          }
        } else {
          // それ以外の場合は必ず日付であることを確認する
          // eslint-disable-next-line no-lonely-if
          if (!isDate(targetValidUntil)) {
            tmpErrorMessages.push(
              makeErrorMessage(
                target.schema,
                VALID_TYPE.UNTIL,
                '終了日を入力してください。'
              )
            );
          }
        }
      } else {
        // 無効の場合、常に終了日は空文字も許可する
        // eslint-disable-next-line no-lonely-if
        if (targetValidUntil !== '' && !isDate(targetValidUntil)) {
          // 日付形式以外の入力は不可なので、通常このルートは通らない
          tmpErrorMessages.push(
            makeErrorMessage(
              target.schema,
              VALID_TYPE.UNTIL,
              '終了日を正しい日付形式で入力してください。'
            )
          );
        }
      }
    }

    // この時点でエラーが出ている場合比較が出来ないのでエラーを表示して終了する
    if (tmpErrorMessages.length > 0) {
      if (alertable) {
        tmpErrorMessages.unshift('【エラー】保存に失敗しました。');
        alert(tmpErrorMessages.join('\n'));
      }
      return true;
    }

    // 有効なものが一つもない場合はエラーとする
    if (enabledSchemas.length === 0) {
      tmpErrorMessages.push(
        '最低でも一つ以上のバージョンを有効にする必要があります。'
      );
    }

    // 有効な物に関して、期限が繋がっているか、開始日と終了日が矛盾していないかを確認する
    for (let index = enabledSchemas.length - 1; index >= 0; index--) {
      const target = enabledSchemas[index];
      // 自身の中で開始日と終了日が矛盾していないかを確認、ただし最新スキーマで終了日が空文字の場合のみは比較しない
      if (
        !(index === 0 && target.validUntil === '') &&
        new Date(target.validUntil).getTime() <
          new Date(target.validFrom).getTime()
      ) {
        tmpErrorMessages.push(
          `バージョン「${getVersionText(
            target.schema
          )}」の開始日と終了日に矛盾があります。`
        );
      }

      // 自身が最新でない場合、自身の終了日と自身より新しいバージョンの開始日が1日違いかを確認する
      if (!(index === 0)) {
        const targetValidUntil = new Date(target.validUntil);
        // 自身の終了日の翌日
        targetValidUntil.setDate(targetValidUntil.getDate() + 1);
        // 新しいバージョンの開始日
        const nextVersionValidFrom = new Date(
          enabledSchemas[index - 1].validFrom
        );

        if (targetValidUntil.getTime() !== nextVersionValidFrom.getTime()) {
          tmpErrorMessages.push(
            `バージョン「${getVersionText(
              enabledSchemas[index - 1].schema
            )}」の開始日はバージョン「${getVersionText(
              target.schema
            )}」の終了日の翌日にしてください。`
          );
        }
      }
    }
    if (tmpErrorMessages.length > 0 && alertable) {
      tmpErrorMessages.unshift('【エラー】保存に失敗しました。');
      alert(tmpErrorMessages.join('\n'));
    }

    return tmpErrorMessages.length > 0;
  };

  const leaveAlart = (): boolean => {
    const tempSchemaList = getNeedUpdateParents(true);
    const isChildEdited = isNeedUpdateSchema();
    if (tempSchemaList.length > 0 || isChildEdited || isNeedUpdateValidDate()) {
      // eslint-disable-next-line no-restricted-globals
      return confirm(
        'スキーマが編集中です。編集を破棄して移動してもよろしいですか？'
      );
    }
    return true;
  };

  const clickCancel = () => {
    if (leaveAlart()) {
      RemoveBeforeUnloadEvent();
      backToPatientsList(navigate);
    }
  };

  // 実際のアップロードボタンへの参照
  const refBtnUpload = useRef<HTMLInputElement>(null);

  // スキーマアップロードボタン押下
  const schemaUpload = () => {
    if (leaveAlart()) {
      const button = refBtnUpload.current;
      button?.click();
    }
  };

  // ファイル選択
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const file = fileList[0];
      if (file.size > 1048576) { // 1024×1024
        alert(
          '一度にアップロードするファイルのサイズは1MBまでにしてください'
        );
        return;
      }
      const fileName: string = file.name.toLocaleLowerCase();
      if (!fileName.endsWith('.zip') && !fileName.endsWith('.json')) {
        alert('ZIPファイルもしくはJSONファイルを選択してください');
        return;
      }

      setIsLoading(true);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      UploadSchemaFile(file, setSchemaUploadResponse, setErrorMessages);
    }
  };

  const submitUpdateSchema = async (schemas: JesgoDocumentSchema[]) => {
    const token = localStorage.getItem('token');
    if (token == null) {
      RemoveBeforeUnloadEvent();
      navigate('/login');
      return;
    }

    setIsLoading(true);
    // スキーマ更新APIを呼ぶ
    const returnApiObject = await apiAccess(
      METHOD_TYPE.POST,
      `updateSchemas`,
      schemas
    );
    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      // スキーマ再取得処理
      await schemaReload();

      // eslint-disable-next-line no-alert
      alert('スキーマを更新しました');
    } else {
      // eslint-disable-next-line no-alert
      alert('【エラー】\n設定に失敗しました');
    }
    setIsLoading(false);
  };

  // 基底スキーマ情報更新
  useEffect(() => {
    if (selectedSchemaInfo && selectedSchemaInfo.base_schema) {
      const baseInfo = GetSchemaInfo(
        selectedSchemaInfo.base_schema,
        null,
        false,
        true
      );
      setSelectedBaseSchemaInfo(baseInfo);
    } else {
      setSelectedBaseSchemaInfo(undefined);
    }
  }, [selectedSchemaInfo]);

  const updateSchema = async () => {
    // 更新用スキーマリストの初期値として変更済親スキーマのリストを取得(変更がない場合は空配列)
    const updateSchemaList = getNeedUpdateParents(false);

    const baseSchemaInfo = lodash.cloneDeep(selectedSchemaInfo);
    // 有効期限に変更がある場合、エラーがなければ更新を行う
    if (isNeedUpdateValidDate() && !isValidDateError(true)) {
      // 一番最新のスキーマのみ、baseSchemaInfoに更新する
      if (baseSchemaInfo !== undefined) {
        baseSchemaInfo.hidden = !versionedSchemaList[0].valid;
        baseSchemaInfo.valid_from = validFrom[0];
        baseSchemaInfo.valid_until = validUntil[0];
      }
      // それ以降は別で処理して更新リストに追加
      for (let index = 1; index < versionedSchemaList.length; index++) {
        const target = versionedSchemaList[index];
        target.schema.hidden = !target.valid;
        target.schema.valid_from = validFrom[index];
        target.schema.valid_until = validUntil[index];
        updateSchemaList.push(target.schema);
      }
    } else if (isNeedUpdateValidDate()) {
      // エラーがある場合は処理を中断する
      return;
    }

    // 自スキーマのサブスキーマ、子スキーマに更新があれば変更リストに追加する
    if (isNeedUpdateSchema()) {
      if (baseSchemaInfo !== undefined) {
        // サブスキーマ
        // 編集中のサブスキーマのうち有効であるもののみのリストを作る
        const tempSubSchemaList: number[] = [];
        for (let i = 0; i < subSchemaList.length; i++) {
          if (subSchemaList[i].valid) {
            tempSubSchemaList.push(subSchemaList[i].schema.schema_id);
          }
        }
        baseSchemaInfo.subschema = tempSubSchemaList;

        // 子スキーマ
        // 編集中の子スキーマのうち有効であるもののみのリストを作る
        const tempChildSchemaList: number[] = [];
        for (let i = 0; i < childSchemaList.length; i++) {
          if (childSchemaList[i].valid) {
            tempChildSchemaList.push(childSchemaList[i].schema.schema_id);
          }
        }
        baseSchemaInfo.child_schema = tempChildSchemaList;

        // 継承スキーマ
        const tempInheritSchemaList: number[] = [];
        if (
          inheritSchemaList.length > 0 &&
          inheritSchemaList[0].schema.schema_id !== baseSchemaInfo.schema_id
        ) {
          // #region [ 並び替えでデフォルトスキーマが変更されたケース ]
          const newDefaultSchema = lodash.cloneDeep(inheritSchemaList[0]);
          const oldDefaultSchema = lodash.cloneDeep(baseSchemaInfo);
          // 新しいデフォルトスキーマの依存関係更新
          newDefaultSchema.schema.base_schema = null;
          newDefaultSchema.schema.inherit_schema = inheritSchemaList
            .filter(
              (p) =>
                p.valid &&
                p.schema.schema_id !== newDefaultSchema.schema.schema_id
            )
            .map((p) => p.schema.schema_id);
          // デフォルト値も更新
          newDefaultSchema.schema.inherit_schema_default = lodash.union(
            newDefaultSchema.schema.inherit_schema,
            // 非表示となった項目は残す
            inheritSchemaList
              .filter((p) => !p.valid)
              .map((p) => p.schema.schema_id)
          );
          updateSchemaList.push(newDefaultSchema.schema);

          // 依存関係更新処理関数化
          const updateInheritDependency = (
            targetSchema: JesgoDocumentSchema,
            srcSchema?: schemaWithValid
          ) => {
            // 継承元は新デフォルトスキーマ
            targetSchema.base_schema = newDefaultSchema.schema.schema_id;
            // 継承先は現在の継承先から継承元が当該スキーマだったものを除いたものとする
            targetSchema.inherit_schema = lodash.difference(
              srcSchema?.schema.inherit_schema ?? targetSchema.inherit_schema,
              inheritSchemaList
                .filter(
                  (p) =>
                    p.schema.base_schema ===
                    (srcSchema?.schema.schema_id ?? targetSchema.schema_id)
                )
                .map((p) => p.schema.schema_id)
            );
            // デフォルト値も更新
            targetSchema.inherit_schema_default = targetSchema.inherit_schema;
          };

          // 継承先スキーマの依存関係更新
          for (let i = 1; i < inheritSchemaList.length; i++) {
            // 現在編集中のスキーマだった場合はbaseSchemaInfoの方を更新する
            if (
              inheritSchemaList[i].schema.schema_id === baseSchemaInfo.schema_id
            ) {
              updateInheritDependency(baseSchemaInfo);
              // ※baseSchemaInfoはあとでupdateSchemaListに追加されるのでここではしない
            } else {
              // 編集中スキーマ以外の継承先更新
              const tmpInheritSchema = lodash.cloneDeep(inheritSchemaList[i]);
              updateInheritDependency(
                tmpInheritSchema.schema,
                inheritSchemaList[i]
              );

              updateSchemaList.push(tmpInheritSchema.schema);
            }
          }

          // 上位スキーマの依存関係更新
          if (selectedSchemaParentInfo) {
            // サブスキーマ
            if (selectedSchemaParentInfo.fromSubSchema.length > 0) {
              selectedSchemaParentInfo.fromSubSchema.forEach((item) => {
                const copyItem = lodash.cloneDeep(item);
                const idx = copyItem.schema.subschema.findIndex(
                  (id) => id === oldDefaultSchema.schema_id
                );
                if (idx > -1) {
                  copyItem.schema.subschema[idx] =
                    newDefaultSchema.schema.schema_id;
                  // デフォルト値も更新
                  copyItem.schema.subschema_default = copyItem.schema.subschema;
                  updateSchemaList.push(copyItem.schema);
                }
              });
            }

            // 子スキーマ
            if (selectedSchemaParentInfo.fromChildSchema.length > 0) {
              selectedSchemaParentInfo.fromChildSchema.forEach((item) => {
                const copyItem = lodash.cloneDeep(item);
                let idx = copyItem.schema.child_schema.findIndex(
                  (id) => id === oldDefaultSchema.schema_id
                );
                if (idx > -1) {
                  copyItem.schema.child_schema[idx] =
                    newDefaultSchema.schema.schema_id;
                  // デフォルト値も更新
                  copyItem.schema.child_schema_default =
                    copyItem.schema.child_schema;
                  updateSchemaList.push(copyItem.schema);
                } else {
                  // 子スキーマの非表示も行われていた場合、child_schemaからは見つからないのでデフォルト値の方を書き換える
                  idx = copyItem.schema.child_schema_default.findIndex(
                    (id) => id === oldDefaultSchema.schema_id
                  );
                  if (idx > -1) {
                    copyItem.schema.child_schema_default[idx] =
                      newDefaultSchema.schema.schema_id;
                    updateSchemaList.push(copyItem.schema);
                  }
                }
              });
            }
          }
          // #endregion
        } else {
          // #region [ デフォルトスキーマ未変更時の処理 ]
          for (let i = 1; i < inheritSchemaList.length; i++) {
            if (inheritSchemaList[i].valid) {
              tempInheritSchemaList.push(inheritSchemaList[i].schema.schema_id);
            }
          }
          baseSchemaInfo.inherit_schema = tempInheritSchemaList;
          // #endregion
        }
      }
    }

    // 有効期限かサブスキーマ、子スキーマ、継承スキーマに変更があれば更新対象とする
    if (
      (isNeedUpdateValidDate() || isNeedUpdateSchema()) &&
      baseSchemaInfo !== undefined
    ) {
      updateSchemaList.push(baseSchemaInfo);
    }

    // POST処理
    await submitUpdateSchema(updateSchemaList);
  };

  // 初期設定の読込
  const loadDefault = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('下位スキーマと継承スキーマの初期設定を読み込みますか？')) {
      const tempSubSchemaList: schemaWithValid[] = [];
      const tempChildSchemaList: schemaWithValid[] = [];
      const tempInheritSchemaList: schemaWithValid[] = [];
      if (selectedSchemaInfo !== undefined) {
        // サブスキーマを初期に戻す
        // eslint-disable-next-line no-restricted-syntax
        for (const schemaId of selectedSchemaInfo.subschema_default) {
          tempSubSchemaList.push({
            valid: true,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: GetSchemaInfo(schemaId, null, false, true)!,
          });
        }

        // 子スキーマを初期に戻す
        // eslint-disable-next-line no-restricted-syntax
        for (const schemaId of selectedSchemaInfo.child_schema_default) {
          tempChildSchemaList.push({
            valid: true,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: GetSchemaInfo(schemaId, null, false, true)!,
          });
        }

        // 継承スキーマを初期に戻す
        // eslint-disable-next-line no-restricted-syntax
        for (const schemaId of selectedSchemaInfo.inherit_schema_default) {
          tempInheritSchemaList.push({
            valid: true,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: GetSchemaInfo(schemaId, null, false, true)!,
          });
        }
        // 継承スキーマがある場合、自身のスキーマを先頭に追加
        if (tempInheritSchemaList.length > 0) {
          tempInheritSchemaList.unshift({
            valid: true,
            schema: GetSchemaInfo(Number(selectedSchema), null, false, true)!,
            validCheckDisabled: true,
          });
        }

        setSubSchemaList(tempSubSchemaList);
        setChildSchemaList(tempChildSchemaList);
        setInheritSchemaList(tempInheritSchemaList);
      }
    }
    // いいえであれば何もしない
  };

  // ツリーアイテムクリック
  const handleTreeItemClick = (
    event:
      | React.MouseEvent<HTMLLIElement, MouseEvent>
      | React.MouseEvent<HTMLDivElement, MouseEvent>,
    v = ''
  ): void => {
    if (selectedSchema === v || leaveAlart()) {
      setSelectedSchema(v);
    }
  };

  // チェックボックス分岐用定数
  const CHECK_TYPE = {
    SUBSCHEMA: 0,
    CHILDSCHEMA: 1,
    INHERITSCHEMA: 2,
  };

  const RELATION_TYPE = {
    PARENT: 0,
    CHILD: 1,
    INHERIT: 2,
    VERSION: 3,
  };
  // チェックボックス状態変更
  const handleCheckClick = (relation: number, type: number, v = ''): void => {
    // 親スキーマ、子スキーマ、継承スキーマ、バージョン一覧で処理を分ける
    if (relation === RELATION_TYPE.PARENT) {
      const copyParentInfo = lodash.cloneDeep(selectedSchemaParentInfo);
      // undefinedチェック
      if (copyParentInfo) {
        // サブスキーマの場合
        if (type === CHECK_TYPE.SUBSCHEMA && copyParentInfo.fromSubSchema) {
          // eslint-disable-next-line
          for (let i = 0; i < copyParentInfo.fromSubSchema.length; i++) {
            const obj = copyParentInfo.fromSubSchema[i];
            if (obj.schema.schema_id === Number(v)) {
              obj.valid = !obj.valid;
            }
          }
        }
        // 子スキーマの場合
        else if (
          type === CHECK_TYPE.CHILDSCHEMA &&
          copyParentInfo.fromChildSchema
        ) {
          // eslint-disable-next-line
          for (let i = 0; i < copyParentInfo.fromChildSchema.length; i++) {
            const obj = copyParentInfo.fromChildSchema[i];
            if (obj.schema.schema_id === Number(v)) {
              obj.valid = !obj.valid;
            }
          }
        }
        setSelectedSchemaParentInfo(copyParentInfo);
      }
    } else if (relation === RELATION_TYPE.CHILD) {
      // サブスキーマの場合
      if (type === CHECK_TYPE.SUBSCHEMA) {
        const copySchemaList = lodash.cloneDeep(subSchemaList);
        // eslint-disable-next-line
        for (let i = 0; i < copySchemaList.length; i++) {
          const obj = copySchemaList[i];
          if (obj.schema.schema_id === Number(v)) {
            obj.valid = !obj.valid;
          }
        }
        setSubSchemaList(copySchemaList);
      }
      // 子スキーマの場合
      else if (type === CHECK_TYPE.CHILDSCHEMA) {
        const copySchemaList = lodash.cloneDeep(childSchemaList);
        // eslint-disable-next-line
        for (let i = 0; i < copySchemaList.length; i++) {
          const obj = copySchemaList[i];
          if (obj.schema.schema_id === Number(v)) {
            obj.valid = !obj.valid;
          }
        }
        setChildSchemaList(copySchemaList);
      }
    } else if (relation === RELATION_TYPE.INHERIT) {
      // 継承スキーマの場合
      const copySchemaList = lodash.cloneDeep(inheritSchemaList);
      // eslint-disable-next-line
      for (let i = 0; i < copySchemaList.length; i++) {
        const obj = copySchemaList[i];
        if (obj.schema.schema_id === Number(v)) {
          obj.valid = !obj.valid;
        }
      }
      setInheritSchemaList(copySchemaList);
    } else if (relation === RELATION_TYPE.VERSION) {
      // バージョン一覧の場合
      const copySchemaList = lodash.cloneDeep(versionedSchemaList);
      copySchemaList[Number(v)].valid = !copySchemaList[Number(v)].valid;
      setVersionedSchemaList(copySchemaList);
    }
  };

  useEffect(() => {
    if (schemaUploadResponse.resCode !== undefined) {
      alert(schemaUploadResponse.message);
      setSchemaUploadResponse({ message: '', resCode: undefined });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      schemaReload();
      setIsLoading(false);

      // アップロード対象ファイルクリア
      if (refBtnUpload.current) {
        refBtnUpload.current.value = '';
      }
    }
  }, [schemaUploadResponse]);

  const downloadSchema = (
    targetSchema: JesgoDocumentSchema | null,
    version = ''
  ) => {
    if (targetSchema) {
      const jsonStr = JSON.stringify(targetSchema.document_schema, null, 2);
      const blob = new Blob([jsonStr], {
        type: 'application/json',
      });
      let fileName = '';
      if (targetSchema.schema_id_string) {
        // ファイル名はスキーマIDの先頭と末尾から"/"を除き、残りの"/"は"_"へ変換する
        fileName = targetSchema.schema_id_string
          .replace(/^\/+|\/+$/g, '')
          .replace(/\//g, '_');
      }
      if (fileName) {
        if (version && version !== '') {
          saveAs(blob, `${fileName}_${version}.json`);
        } else {
          saveAs(blob, `${fileName}.json`);
        }

        return;
      }
    }
    alert('ダウンロード不可なスキーマです。');
  };

  return (
    <div className="page-area">
      <Navbar collapseOnSelect fixedTop>
        <Navbar.Header>
          <Navbar.Brand>
            <img src="./image/logo.png" alt="JESGO" className="img" />
          </Navbar.Brand>
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav>
            <NavItem className="header-text">スキーマ管理</NavItem>
          </Nav>
          <Navbar.Text pullRight>Ver.{Const.VERSION}</Navbar.Text>
          <Nav pullRight>
            <Navbar.Brand>
              <div>
                <UserMenu title={userName} i={0} isConfirm={null} />
              </div>
            </Navbar.Brand>
            <Navbar.Brand>
              <div>
                <SystemMenu title="設定" i={0} isConfirm={null} />
              </div>
            </Navbar.Brand>
          </Nav>
          <Navbar.Text pullRight>{facilityName}&nbsp;&nbsp;</Navbar.Text>
        </Navbar.Collapse>
      </Navbar>

      <div className="schema-buttons">
        <div className="schema-inner">
          <Button
            bsStyle="success"
            className="normal-button"
            title="スキーマのZIPファイルをアップロードします"
            onClick={schemaUpload}
          >
            スキーマアップロード
          </Button>
          {/* 実際のアップロードボタンは非表示 */}
          <input
            accept=".zip,.json"
            ref={refBtnUpload}
            type="file"
            onChange={onFileSelected}
            style={{ display: 'none' }}
          />
          <Button
            onClick={clickCancel}
            bsStyle="primary"
            className="normal-button"
          >
            リストに戻る
          </Button>
        </div>
      </div>
      <div className="schema-main">
        {errorMessages.length > 0 && (
          <Panel className="error-msg-panel-sm">
            {errorMessages.map((error: string) => (
              <p key={error}>{error}</p>
            ))}
          </Panel>
        )}
        <div className="flex">
          {/* 文書構造ビュー */}
          <fieldset className="schema-manager-legend schema-tree">
            <legend>文書構造ビュー</legend>
            <div className="schema-tree">
              <TreeView
                defaultExpandedItems={['root']}
                selectedItems={selectedSchema}
                slots={{
                  collapseIcon: ExpandMore,
                  expandIcon: ChevronRight,
                }}
              >
                <CustomTreeItem
                  itemId="root"
                  label={
                    <Box
                      onClick={(
                        e:
                          | React.MouseEvent<HTMLLIElement, MouseEvent>
                          | React.MouseEvent<HTMLDivElement, MouseEvent>
                      ) => handleTreeItemClick(e, '0')}
                    >
                      JESGOシステム
                    </Box>
                  }
                >
                  <SchemaTree
                    schemas={tree}
                    handleTreeItemClick={handleTreeItemClick}
                    schemaType={SCHEMA_TYPE.SUBSCHEMA}
                  />
                </CustomTreeItem>
              </TreeView>
            </div>
          </fieldset>
          {/* スキーマ設定ビュー */}
          <div className="schema-detail">
            <fieldset className="schema-manager-legend schema-detail">
              <legend>スキーマ選択ビュー</legend>
              <div className="schema-detail">
                {selectedSchemaInfo && (
                  <>
                    <fieldset className="schema-manager-legend">
                      <legend>スキーマ情報</legend>
                      <div className="caption-and-block-long">
                        <span>文書(スキーマ)タイトル ： </span>
                        <span>
                          {selectedSchemaInfo.title +
                            (selectedSchemaInfo.subtitle.length > 0
                              ? ` ${selectedSchemaInfo.subtitle}`
                              : '')}
                        </span>
                      </div>
                      <div className="caption-and-block-long">
                        <span>スキーマID ： </span>
                        <span>{selectedSchemaInfo.schema_id_string}</span>
                      </div>
                      <div className="caption-and-block-long">
                        <span>バージョン ： </span>
                        <span>{`${selectedSchemaInfo.version_major}.${selectedSchemaInfo.version_minor}`}</span>
                      </div>
                      <div className="caption-and-block-long">
                        <span>継承スキーマ ： </span>
                        <Checkbox
                          className="show-flg-checkbox"
                          checked={!!selectedSchemaInfo.base_schema}
                          readOnly
                        />
                      </div>
                      <div className="caption-and-block-long">
                        <span>基底スキーマ ： </span>
                        <span>
                          {selectedBaseSchemaInfo &&
                            selectedBaseSchemaInfo.title +
                              (selectedBaseSchemaInfo.subtitle.length > 0
                                ? ` ${selectedBaseSchemaInfo.subtitle}`
                                : '')}
                          {!selectedBaseSchemaInfo && '(なし)'}
                        </span>
                      </div>
                      <div>
                        <Button
                          bsStyle="success"
                          className="normal-button nomargin"
                          title="スキーマファイルをダウンロードします"
                          onClick={() => downloadSchema(selectedSchemaInfo)}
                        >
                          {' '}
                          スキーマダウンロード
                        </Button>
                      </div>
                    </fieldset>
                    <fieldset className="schema-manager-legend">
                      <legend>上位スキーマ</legend>
                      <div>
                        <div className="caption-and-block">
                          <span>必須スキーマ ： </span>
                          <DndSortableTable
                            checkType={[
                              RELATION_TYPE.PARENT,
                              CHECK_TYPE.SUBSCHEMA,
                            ]}
                            schemaList={selectedSchemaParentInfo?.fromSubSchema}
                            handleCheckClick={handleCheckClick}
                            isDragDisabled
                            isShowCheckDisabled
                          />
                        </div>
                        <div className="caption-and-block">
                          <span>任意スキーマ ： </span>
                          <DndSortableTable
                            checkType={[
                              RELATION_TYPE.PARENT,
                              CHECK_TYPE.CHILDSCHEMA,
                            ]}
                            schemaList={
                              selectedSchemaParentInfo?.fromChildSchema
                            }
                            handleCheckClick={handleCheckClick}
                            isDragDisabled
                          />
                        </div>
                      </div>
                    </fieldset>
                    <fieldset className="schema-manager-legend">
                      <legend>下位スキーマ</legend>
                      <div className="caption-and-block">
                        <span>必須スキーマ ： </span>
                        <DndSortableTable
                          checkType={[
                            RELATION_TYPE.CHILD,
                            CHECK_TYPE.SUBSCHEMA,
                          ]}
                          schemaList={subSchemaList}
                          setSchemaList={setSubSchemaList}
                          handleCheckClick={handleCheckClick}
                          isShowCheckDisabled
                        />
                      </div>
                      <div className="caption-and-block">
                        <span>任意スキーマ ： </span>
                        <DndSortableTable
                          checkType={[
                            RELATION_TYPE.CHILD,
                            CHECK_TYPE.CHILDSCHEMA,
                          ]}
                          schemaList={childSchemaList}
                          setSchemaList={setChildSchemaList}
                          handleCheckClick={handleCheckClick}
                        />
                      </div>
                    </fieldset>
                    <fieldset className="schema-manager-legend">
                      <legend>継承スキーマ</legend>
                      <div>
                        <div className="caption-and-block">
                          <span />
                          <div
                            style={{ display: 'flex', flexDirection: 'column' }}
                          >
                            {inheritSchemaList.length > 0 && (
                              <div>
                                ※デフォルトで使用するスキーマを最上位にしてください
                              </div>
                            )}
                            <div>
                              <DndSortableTable
                                checkType={[
                                  RELATION_TYPE.INHERIT,
                                  CHECK_TYPE.INHERITSCHEMA,
                                ]}
                                schemaList={inheritSchemaList}
                                setSchemaList={setInheritSchemaList}
                                handleCheckClick={handleCheckClick}
                                isDragDisabled={false}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                    <fieldset className="schema-manager-legend">
                      <legend>スキーマバージョン</legend>
                      <div>
                        <div className="caption-and-block">
                          <span />
                          <SchemaVersionTable
                            checkType={RELATION_TYPE.VERSION}
                            schemaList={versionedSchemaList}
                            handleDownloadClick={downloadSchema}
                            handleCheckClick={handleCheckClick}
                            validFrom={validFrom}
                            setValidFrom={setValidFrom}
                            validUntil={validUntil}
                            setValidUntil={setValidUntil}
                          />
                        </div>
                      </div>
                    </fieldset>
                    <div className="SchemaManagerSaveButtonGroup">
                      <Button
                        bsStyle="default"
                        className="normal-button"
                        onClick={() => loadDefault()}
                      >
                        初期設定を反映
                      </Button>
                      <Button
                        bsStyle="success"
                        className="normal-button"
                        onClick={() => updateSchema()}
                      >
                        設定を保存
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </fieldset>
          </div>
        </div>
      </div>
      {isLoading && <Loading />}
    </div>
  );
};

export default SchemaManager;
