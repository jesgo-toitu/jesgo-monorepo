import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Button,
  Checkbox,
  FormControl,
  Glyphicon,
  Table,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { AddBeforeUnloadEvent } from '../../common/CommonUtility';
import { ReadStaffList } from '../../common/DBUtility';
import staffData from './StaffData';

type JesgoUserRoll = {
  roll_id: number;
  title: string;
  isNew?: boolean; // trueは新規作成したレコード

  login: boolean;
  view: boolean;
  add: boolean;
  edit: boolean;
  remove: boolean;
  data_manage: boolean;
  system_manage: boolean;
  plugin_registerable: boolean;
  plugin_executable_select: boolean;
  plugin_executable_update: boolean;

  deleted: boolean;
};

const initJesgoUserRoll: JesgoUserRoll = {
  roll_id: -1,
  title: '',
  isNew: false,
  login: false,
  view: false,
  add: false,
  edit: false,
  remove: false,
  data_manage: false,
  system_manage: false,
  plugin_registerable: false,
  plugin_executable_select: false,
  plugin_executable_update: false,
  deleted: false,
};

/**
 * 1行分のコンポーネント
 * @param props
 * @returns
 */
const UserRollRow = React.memo(
  (props: {
    targetRoll: JesgoUserRoll;
    setChangedUserRoll: React.Dispatch<React.SetStateAction<JesgoUserRoll>>;
    staffList: staffData[];
    rawRollList: JesgoUserRoll[];
  }): JSX.Element => {
    const { targetRoll, setChangedUserRoll, staffList, rawRollList } = props;
    const [roll, setRoll] = useState<JesgoUserRoll>(targetRoll);

    const onChangeValue = (e: React.FormEvent<FormControl>) => {
      const element = e.target as HTMLInputElement;
      const targetId = element.id;

      if (targetId.includes('txtTitle')) {
        setRoll({ ...roll, title: element.value });
      } else if (targetId.includes('chkLogin')) {
        setRoll({ ...roll, login: element.checked });
      } else if (targetId.includes('chkView')) {
        setRoll({ ...roll, view: element.checked });
      } else if (targetId.includes('chkAdd')) {
        setRoll({ ...roll, add: element.checked });
      } else if (targetId.includes('chkEdit')) {
        setRoll({ ...roll, edit: element.checked });
      } else if (targetId.includes('chkRemove')) {
        setRoll({ ...roll, remove: element.checked });
      } else if (targetId.includes('chkDataManage')) {
        setRoll({ ...roll, data_manage: element.checked });
      } else if (targetId.includes('chkSystemManage')) {
        setRoll({ ...roll, system_manage: element.checked });
      } else if (targetId.includes('chkPluginRegisterble')) {
        setRoll({ ...roll, plugin_registerable: element.checked });
      } else if (targetId.includes('chkPluginSelect')) {
        setRoll({ ...roll, plugin_executable_select: element.checked });
      } else if (targetId.includes('chkPluginUpdate')) {
        setRoll({ ...roll, plugin_executable_update: element.checked });
      }
    };

    useEffect(() => {
      setChangedUserRoll(roll);
    }, [roll]);

    // 権限削除
    const deleteRoll = () => {
      let hasError = false;

      if (staffList.find((p) => p.roll_id === roll.roll_id)) {
        hasError = true;
        // 1人でも権限使用中の利用者がいれば削除不可とする
        // eslint-disable-next-line no-alert
        alert(
          `【エラー】\n権限「${roll.title}」は使用中のため、削除できません`
        );
      } else if (!roll.isNew && (roll.title == null || roll.title === '')) {
        hasError = true;
        alert(`【エラー】\n権限名称が未入力の状態では削除できません`);
      }

      if (!hasError) {
        if (
          // eslint-disable-next-line no-restricted-globals, no-alert
          confirm(`権限「${roll.title}」を削除します。よろしいですか？`)
        ) {
          roll.deleted = true;
          setRoll({ ...roll });
        }
      }
    };

    return (
      <tr key={roll.roll_id}>
        <td style={{ width: '13rem' }}>
          <FormControl
            id={`txtTitle_${roll.roll_id}`}
            type="text"
            value={roll.title}
            autoComplete="off"
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkLogin_${roll.roll_id}`}
            checked={roll.login}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkView_${roll.roll_id}`}
            checked={roll.view}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkAdd_${roll.roll_id}`}
            checked={roll.add}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkEdit_${roll.roll_id}`}
            checked={roll.edit}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkRemove_${roll.roll_id}`}
            checked={roll.remove}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkDataManage_${roll.roll_id}`}
            checked={roll.data_manage}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkSystemManage_${roll.roll_id}`}
            checked={roll.system_manage}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkPluginRegisterble_${roll.roll_id}`}
            checked={roll.plugin_registerable}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkPluginSelect_${roll.roll_id}`}
            checked={roll.plugin_executable_select}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Checkbox
            id={`chkPluginUpdate_${roll.roll_id}`}
            checked={roll.plugin_executable_update}
            onChange={onChangeValue}
          />
        </td>
        <td className="text-center">
          <Button title="削除" onClick={deleteRoll}>
            <Glyphicon glyph="trash" />
          </Button>
        </td>
      </tr>
    );
  }
);

// eslint-disable-next-line arrow-body-style
const UserRollSetting = forwardRef(
  (
    props: {
      setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    },
    ref
  ): JSX.Element => {
    const { setIsLoading } = props;
    const navigate = useNavigate();

    const [rollList, setRollList] = useState<JesgoUserRoll[]>([]);
    const [loadedRollList, setLoadedRollList] = useState<JesgoUserRoll[]>([]);
    const [staffList, setStaffList] = useState<staffData[]>([]);

    const [changedRoll, setChangedRoll] =
      useState<JesgoUserRoll>(initJesgoUserRoll);

    // 親画面から実行するチェック関数定義
    useImperativeHandle(ref, () => ({
      isTransitionOk() {
        if (JSON.stringify(loadedRollList) !== JSON.stringify(rollList)) {
          // eslint-disable-next-line no-restricted-globals, no-alert
          return confirm(
            `編集中のデータがありますが、破棄して画面遷移します。よろしいですか？`
          );
        }
        return true;
      },
    }));

    // 利用者一覧取得
    const LoadStaffData = () => {
      // eslint-disable-next-line no-void
      void ReadStaffList(setIsLoading).then((returnObj) => {
        if (returnObj.statusNum === RESULT.NORMAL_TERMINATION) {
          setStaffList([...returnObj.data]);
        } else {
          navigate('/login');
        }
      });
    };

    // マスタからユーザ権限読み込み
    const LoadUserRoll = (isReload: boolean) => {
      const f = async () => {
        setIsLoading(true);
        // jesgo_user list
        const returnApiObject = await apiAccess(
          METHOD_TYPE.GET,
          `getUserRollList`
        );
        if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const readData = (returnApiObject.body as any)
            ?.data as JesgoUserRoll[];
          setRollList([...readData]);
          setLoadedRollList([...readData]);

          const rollInfo = readData.find(
            (p) => p.roll_id.toString() === localStorage.getItem('roll_id')
          );
          // リロード時はlocalStrageの権限を更新する
          if (isReload && rollInfo) {
            localStorage.setItem('is_view_roll', rollInfo.view.toString());
            localStorage.setItem('is_add_roll', rollInfo.add.toString());
            localStorage.setItem('is_edit_roll', rollInfo.edit.toString());
            localStorage.setItem('is_remove_roll', rollInfo.remove.toString());
            localStorage.setItem(
              'is_plugin_registerable',
              rollInfo.plugin_registerable.toString()
            );
            localStorage.setItem(
              'is_plugin_executable_select',
              rollInfo.plugin_executable_select.toString()
            );
            localStorage.setItem(
              'is_plugin_executable_update',
              rollInfo.plugin_executable_update.toString()
            );
            localStorage.setItem(
              'is_data_manage_roll',
              rollInfo.data_manage.toString()
            );
            localStorage.setItem(
              'is_system_manage_roll',
              rollInfo.system_manage.toString()
            );
          }
        } else {
          navigate('/login');
        }
        setIsLoading(false);
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      f();
    };

    useEffect(() => {
      // ブラウザの戻る・更新の防止
      AddBeforeUnloadEvent();

      LoadStaffData();
      LoadUserRoll(false);
    }, []);

    // 各行から変更通知が上がってきたら対象のレコードを更新する
    useEffect(() => {
      if (changedRoll && changedRoll.roll_id !== -1) {
        const idx = rollList.findIndex(
          (p) => p.roll_id === changedRoll.roll_id
        );
        if (idx > -1) {
          rollList[idx] = changedRoll;
          setRollList([...rollList]);
        }
      }
    }, [changedRoll]);

    // 新規作成
    const createNewRecord = () => {
      const newRecord: JesgoUserRoll = { ...initJesgoUserRoll };
      newRecord.isNew = true;
      // 表示中のroll_idと被らないroll_idを付与する
      if (rollList.length === 0) {
        newRecord.roll_id = 10000;
      } else {
        newRecord.roll_id =
          rollList.map((p) => p.roll_id).reduce((a, b) => Math.max(a, b)) + 1;
      }

      rollList.push(newRecord);
      setRollList([...rollList]);
    };

    /**
     * エラーチェック
     * @returns
     */
    const hasUserRollError = () => {
      let hasError = false;
      // 新規で削除済みレコードはチェック対象外
      const validRollList = rollList.filter((p) => !(p.isNew && p.deleted));

      // 名称未入力チェック
      if (validRollList.find((p) => p.title == null || p.title === '')) {
        hasError = true;
        alert(`【エラー】\n権限名称が未入力の項目があります`);
      }

      return hasError;
    };

    /**
     * 保存
     */
    const saveUserRoll = () => {
      // 入力チェック
      if (hasUserRollError()) return;

      setIsLoading(true);

      // eslint-disable-next-line no-void
      void apiAccess(METHOD_TYPE.POST, `saveUserRoll`, rollList).then(
        (returnApiObject) => {
          if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
            alert('保存しました');
            // 読み直し
            LoadUserRoll(true);
          } else {
            // navigate('/login');
            alert('【エラー】\n保存に失敗しました');
          }
          setIsLoading(false);
        }
      );
    };

    return (
      <>
        <div className="page-menu">
          <div className="search-form-closed flex">
            <Button
              bsStyle="success"
              className="normal-button"
              onClick={saveUserRoll}
            >
              保存
            </Button>
            <Button
              bsStyle="primary"
              className="normal-button"
              onClick={createNewRecord}
            >
              新規作成
            </Button>
          </div>
        </div>
        <Table className="staff-table2">
          <thead style={{ position: 'sticky' }}>
            <tr>
              <th style={{ width: '13rem' }}>権限名称</th>
              <th className="text-center">ログイン権限</th>
              <th className="text-center">参照権限</th>
              <th className="text-center">追加権限</th>
              <th className="text-center">編集権限</th>
              <th className="text-center">削除権限</th>
              <th className="text-center">データ管理権限</th>
              <th className="text-center">システム管理権限</th>
              <th className="text-center">
                プラグイン
                <br />
                登録権限
              </th>
              <th className="text-center">
                プラグイン
                <br />
                データ出力権限
              </th>
              <th className="text-center">
                プラグイン
                <br />
                データ更新権限
              </th>
              <th className="text-center">削除</th>
            </tr>
          </thead>
          <tbody>
            {rollList
              .filter((p) => !p.deleted)
              .map((roll) => (
                <UserRollRow
                  key={`row_${roll.roll_id}`}
                  targetRoll={roll}
                  staffList={staffList}
                  setChangedUserRoll={setChangedRoll}
                  rawRollList={rollList}
                />
              ))}
          </tbody>
        </Table>
      </>
    );
  }
);

export default UserRollSetting;
