import React, { useEffect, useState, useMemo } from 'react';
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
import { formatDateStr, compareValues } from '../../common/CommonUtility';
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

type SortColumn = 
  | 'patientId'
  | 'patientName'
  | 'age'
  | 'startDate'
  | 'lastUpdate'
  | 'diagnosis'
  | 'advancedStage'
  | null;

type SortDirection = 'asc' | 'desc' | null;

const makeTable = (props: {
  userListJson: string;
  search: string;
  noSearch: string;
  setUserListJson: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentPage?: number;
  pageSize?: number;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSortChange?: (column: SortColumn, direction: SortDirection) => void;
}) => {
  const [userList, setUserList] = useState<userData[]>([]);
  const { userListJson, search, noSearch, setUserListJson, setIsLoading, currentPage = 1, pageSize = 50, sortColumn: propSortColumn, sortDirection: propSortDirection, onSortChange } =
    props;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // バックエンドでソート・ページング処理が行われるため、データをそのまま表示
  useEffect(() => {
    if (userListJson.length === 0) {
      setUserList([]);
      return;
    }
    
    try {
      const parsedData = JSON.parse(userListJson) as userDataList;
      // バックエンドで既にソート・ページング処理が行われているため、そのまま使用
      setUserList(parsedData.data || []);
    } catch (error) {
      console.error('データの解析エラー:', error);
      setUserList([]);
    }
  }, [userListJson]);

  // ヘッダークリック時のソート切り替え
  const handleSort = (column: SortColumn) => {
    if (!onSortChange) return;
    
    if (propSortColumn === column) {
      // 同じカラムをクリックした場合は昇順→降順→ソートなしの順で切り替え
      if (propSortDirection === 'asc') {
        onSortChange(column, 'desc');
      } else if (propSortDirection === 'desc') {
        onSortChange(null, null);
      } else {
        onSortChange(column, 'asc');
      }
    } else {
      // 新しいカラムをクリックした場合は昇順でソート
      onSortChange(column, 'asc');
    }
  };

  // ソートアイコンの取得
  const getSortIcon = (column: SortColumn) => {
    if (propSortColumn !== column || propSortDirection === null) {
      return (
        <span style={{ marginLeft: '5px', opacity: 0.5 }}>
          <Glyphicon glyph="sort" />
        </span>
      );
    }
    return propSortDirection === 'asc' 
      ? (
        <span style={{ marginLeft: '5px' }}>
          <Glyphicon glyph="chevron-up" />
        </span>
      )
      : (
        <span style={{ marginLeft: '5px' }}>
          <Glyphicon glyph="chevron-down" />
        </span>
      );
  };

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
          <th 
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleSort('patientId')}
          >
            患者ID{getSortIcon('patientId')}
          </th>
          <th 
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleSort('patientName')}
          >
            患者名{getSortIcon('patientName')}
          </th>
          <th 
            className={noSearch}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleSort('age')}
          >
            年齢{getSortIcon('age')}
          </th>
          <th className={noSearch}>
            初回治療開始日
            <br />
            ／最終更新日
          </th>
          <th 
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleSort('diagnosis')}
          >
            診断{getSortIcon('diagnosis')}
          </th>
          <th 
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => handleSort('advancedStage')}
          >
            進行期{getSortIcon('advancedStage')}
          </th>
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
export type { userData };
