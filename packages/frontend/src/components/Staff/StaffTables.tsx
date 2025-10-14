import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Glyphicon,
  Table,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { ReadStaffList } from '../../common/DBUtility';
import { staffData } from './StaffData';
import { StaffEditModalDialog } from './StaffEditModal';

let insert = false;
let srcData: staffData | undefined;

const makeTable = (props: {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { setIsLoading } = props;

  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [staffList, setStaffList] = useState<staffData[]>([]);
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    // 利用者一覧読み込み
    // eslint-disable-next-line no-void
    void ReadStaffList(setIsLoading).then((returnObj) => {
      if (returnObj.statusNum === RESULT.NORMAL_TERMINATION) {
        setStaffList([...returnObj.data]);
      } else {
        navigate('/login');
      }
    });
  }, [update]);

  const addStaff = () => {
    insert = true;
    srcData = undefined;
    setShow(true);
  };
  const editStaff = (data: staffData) => {
    insert = false;
    srcData = data;
    setShow(true);
  };

  const deleteStaff = async (
    userId: number,
    displayName: string,
    name: string
  ): Promise<void> => {
    // eslint-disable-next-line
    const result = confirm(`${name}:${displayName} を削除しても良いですか？`);
    if (result) {
      const token = localStorage.getItem('token');
      if (token == null) {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n処理に失敗しました。');
        return;
      }

      setIsLoading(true);

      // 削除APIを呼ぶ
      const returnApiObject = await apiAccess(METHOD_TYPE.POST, `deleteUser/`, {
        user_id: userId,
      });
      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        // eslint-disable-next-line no-alert
        alert('削除しました。');
        setUpdate((prevState) => !prevState);
      } else {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n削除に失敗しました。');
      }

      setIsLoading(false);
    }
  };

  const modalHide = useCallback(() => {
    // nsetShow(false);
  }, [setShow]);

  const modalOk = () => {
    setUpdate((prevState) => !prevState);
    setShow(false);
  };

  const modalCancel = useCallback(() => {
    setUpdate((prevState) => !prevState);
    setShow(false);
  }, [setShow]);

  return (
    <>
      <div className="page-menu">
        <div className="search-form-closed flex">
          <Button
            bsStyle="primary"
            className="normal-button"
            onClick={() => addStaff()}
          >
            新規作成
          </Button>
        </div>
      </div>
      <Table className="staff-table">
        <thead style={{ position: 'sticky' }}>
          <tr>
            <th>ログイン名</th>
            <th>表示名称</th>
            <th>権限</th>
            <th>編集/削除</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => (
            <tr key={staff.user_id.toString()}>
              <td>{staff.name}</td>
              <td>{staff.display_name}</td>
              <td>{staff.rolltitle}</td>
              <td>
                <ButtonToolbar>
                  <ButtonGroup>
                    <Button title="編集" onClick={() => editStaff(staff)}>
                      <Glyphicon glyph="edit" />
                    </Button>
                    <Button
                      title="削除"
                      onClick={() =>
                        deleteStaff(
                          staff.user_id,
                          staff.name,
                          staff.display_name
                        )
                      }
                    >
                      <Glyphicon glyph="trash" />
                    </Button>
                  </ButtonGroup>
                </ButtonToolbar>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <StaffEditModalDialog
        show={show}
        onHide={() => modalHide()}
        onOk={modalOk}
        onCancel={() => modalCancel()}
        title="JESGO ユーザー登録・編集"
        insert={insert}
        data={srcData}
      />
    </>
  );
};

export default makeTable;
