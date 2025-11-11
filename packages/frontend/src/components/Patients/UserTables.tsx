import React, { useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Glyphicon,
  Table,
} from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiAccess, { METHOD_TYPE, RESULT } from '../../common/ApiAccess';
import { formatDateStr } from '../../common/CommonUtility';
import IconList from './IconList';

export interface userData {
  caseId: number;
  patientId: string;
  patientName: string;
  age: number;
  registedCancerGroup: string;
  since: string | null;
  startDate: string | null;
  lastUpdate: string;
  diagnosis: string;
  diagnosisMajor: string;
  diagnosisMinor: string;
  advancedStage: string;
  pathlogicalDiagnosis: string;
  initialTreatment: string[];
  complications: string[];
  progress: string[];
  postRelapseTreatment: string[];
  registration: string[];
  registrationNumber: string[];
  threeYearPrognosis: string[];
  fiveYearPrognosis: string[];
  status: string[];
}
export interface userDataList {
  data: userData[];
}

const makeTable = (props: {
  userListJson: string;
  search: string;
  noSearch: string;
  setUserListJson: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [userList, setUserList] = useState<userData[]>([]);
  const { userListJson, search, noSearch, setUserListJson, setIsLoading } =
    props;
  let userDataListJson: userDataList;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (userListJson.length > 0) {
      userDataListJson = JSON.parse(userListJson) as userDataList;
      setUserList(userDataListJson.data);
    }
  }, [userListJson]);

  const deletePatient = async (
    caseId: number,
    hisId: string,
    name: string
  ): Promise<void> => {
    // eslint-disable-next-line
    const result = confirm(
      `患者番号:${hisId} 氏名:${name} の患者を削除しても良いですか？`
    );
    if (result) {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      if (token == null) {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n処理に失敗しました。');
        setIsLoading(false);
        return;
      }

      // 削除APIを呼ぶ
      const returnApiObject = await apiAccess(
        METHOD_TYPE.DELETE,
        `deleteCase/${caseId}`
      );

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        // eslint-disable-next-line no-alert
        alert('削除しました。');
        const index = userList.findIndex((user) => user.caseId === caseId);
        const userListCopy = userList.splice(0, userList.length);
        userListCopy.splice(index, 1);
        setUserList(userListCopy);

        // CSV用に削除したデータを上で使ってるJSONからも消す
        const newJson = { data: userListCopy };
        const strJson = JSON.stringify(newJson);
        setUserListJson(strJson);
      } else {
        // eslint-disable-next-line no-alert
        alert('【エラー】\n処理に失敗しました。');
      }

      setIsLoading(false);
    }
  };

  // 編集ボタンクリック
  const clickEdit = (caseId: number) => {
    // 遷移前にstoreを初期化
    dispatch({ type: 'INIT_STORE' });
    // 保存確認ダイアログ表示設定を初期化
    navigate(`/registration?id=${caseId}`);
  };

  return (
    <Table striped className="patients">
      <thead>
        <tr>
          <th>患者ID</th>
          <th>患者名</th>
          <th className={noSearch}>年齢</th>
          <th className={noSearch}>
            初回治療開始日
            <br />
            ／最終更新日
          </th>
          <th>診断</th>
          <th>進行期</th>
          <th className={search}>初回治療</th>
          <th className={search}>登録</th>
          <th className={search}>3年予後</th>
          <th className={search}>5年予後</th>
          <th className={noSearch}>ステータス</th>
          {(localStorage.getItem('is_view_roll') === 'true' ||
            localStorage.getItem('is_edit_roll') === 'true' ||
            localStorage.getItem('is_remove_roll') === 'true') && (
            <th>
              {
                // eslint-disable-next-line no-nested-ternary
                localStorage.getItem('is_view_roll') === 'true' &&
                localStorage.getItem('is_edit_roll') === 'true'
                  ? '編集'
                  : localStorage.getItem('is_view_roll') === 'true'
                  ? '閲覧'
                  : null
              }
              {(localStorage.getItem('is_edit_roll') === 'true' ||
                localStorage.getItem('is_view_roll') === 'true') &&
                localStorage.getItem('is_remove_roll') === 'true' &&
                '/'}
              {localStorage.getItem('is_remove_roll') === 'true' && '削除'}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {userList.map((user) => (
          <tr
            className={user.status.includes('death') ? 'died' : ''}
            key={user.caseId.toString()}
          >
            <td>{user.patientId}</td>
            <td>{user.patientName}</td>
            <td className={noSearch}>{user.age}</td>
            <td className={noSearch}>
              {formatDateStr(user.startDate ?? '', '/')}
              {user.startDate && <br />}
              {formatDateStr(user.lastUpdate, '/')}
            </td>
            <td>
              {user.diagnosis === '未' ? (
                <img src="./image/icon_not_completed.svg" alt="未" />
              ) : (
                user.diagnosis
              )}
            </td>
            <td>
              {user.advancedStage === '未' ? (
                <img src="./image/icon_not_completed.svg" alt="未" />
              ) : (
                user.advancedStage
              )}
            </td>
            <td className={search}>
              <IconList iconList={user.initialTreatment} displayCaption='' displayText='' />
            </td>
            <td className={search}>
              <IconList iconList={user.registration} displayCaption='completed' displayText={user.registrationNumber.join('・')} />
            </td>
            <td className={search}>
              <IconList iconList={user.threeYearPrognosis} displayCaption='' displayText='' />
            </td>
            <td className={search}>
              <IconList iconList={user.fiveYearPrognosis} displayCaption='' displayText='' />
            </td>
            <td className={noSearch}>
              <IconList iconList={user.status} displayCaption='' displayText='' />
            </td>
            {(localStorage.getItem('is_edit_roll') === 'true' ||
              localStorage.getItem('is_view_roll') === 'true' ||
              localStorage.getItem('is_remove_roll') === 'true') && (
              <td>
                <ButtonToolbar>
                  <ButtonGroup>
                    {(localStorage.getItem('is_edit_roll') === 'true' ||
                      localStorage.getItem('is_view_roll') === 'true') && (
                      <Button title="編集" onClick={() => clickEdit(user.caseId)}>
                        <Glyphicon glyph="edit" />
                      </Button>
                    )}
                    {localStorage.getItem('is_remove_roll') === 'true' && (
                      <Button
                        title="削除"
                        onClick={() =>
                          deletePatient(
                            user.caseId,
                            user.patientId,
                            user.patientName
                          )
                        }
                      >
                        <Glyphicon glyph="trash" />
                      </Button>
                    )}
                  </ButtonGroup>
                </ButtonToolbar>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default makeTable;
