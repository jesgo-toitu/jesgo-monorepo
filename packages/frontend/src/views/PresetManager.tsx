/* eslint-disable no-plusplus */
/* eslint-disable no-alert */
import React, { useEffect, useState } from 'react';
import {
  Navbar,
  Button,
  Nav,
  NavItem,
  Table,
  ButtonGroup,
  ButtonToolbar,
  Glyphicon,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import Loading from '../components/CaseRegistration/Loading';
import { Const } from '../common/Const';
import './PresetManager.css';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { settingsFromApi } from './Settings';
import { storeSchemaInfo } from '../components/CaseRegistration/SchemaUtility';
import { backToPatientsList } from '../common/CommonUtility';
import PresetEditModal from '../components/Preset/PresetEditModal';

type settings = {
  facility_name: string;
};

// プリセット管理用の型定義
interface PresetItemField {
  field_id?: number;
  preset_id?: number;
  schema_primary_id?: number;
  schema_id?: number;
  schema_id_string?: string;
  field_name: string;
  display_name: string;
  field_path?: string;
  field_type?: string;
  is_visible: boolean;
  is_csv_export: boolean;
  is_fixed: boolean;
  display_order: number;
  schema_title?: string; // 文書(スキーマ)タイトル
  schema_version?: string; // バージョン
  created_at?: string;
  updated_at?: string;
}

interface PresetItem {
  preset_id: number;
  preset_name: string;
  preset_description: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
  is_active: boolean;
  field_count: number;
  visible_field_count: number;
  csv_export_count: number; // CSV出力数
  fields?: PresetItemField[];
  fixed_fields?: any[]; // 固定項目データ
}

const PresetManager = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userName = localStorage.getItem('display_name');
  const [facilityName, setFacilityName] = useState('');
  const [, setSettingJson] = useState<settings>({
    facility_name: '',
  });
  const [presetList, setPresetList] = useState<PresetItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);

  // 変更チェック（簡略化）
  const editingCheck = (
    message = '編集中のデータがありますが、破棄して画面遷移します。よろしいですか？'
  ) => {
    return true; // API連携では変更チェックは不要
  };

  // プリセット一覧ロード処理
  const loadPresetList = async () => {
    setIsLoading(true);
    
    try {
      const result = await apiAccess(METHOD_TYPE.GET, '/preset-list');
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        setPresetList(result.body as PresetItem[]);
      } else {
        alert(`プリセット一覧の取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      console.error('プリセット一覧取得エラー:', error);
      alert('プリセット一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const f = async () => {
      setIsLoading(true);
      await storeSchemaInfo(dispatch);

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
        navigate('/login');
      }

      await loadPresetList();
      setIsLoading(false);
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // プリセットの削除
  const deletePreset = async (preset: PresetItem): Promise<void> => {
    // eslint-disable-next-line
    const result = confirm(`${preset.preset_name} を削除しても良いですか？`);
    if (result) {
      setIsLoading(true);
      
      try {
        const deleteResult = await apiAccess(METHOD_TYPE.DELETE, `/preset-delete/${preset.preset_id}`);
        
        if (deleteResult.statusNum === RESULT.NORMAL_TERMINATION) {
          alert('削除しました。');
          // 一覧を再読み込み
          await loadPresetList();
        } else {
          alert(`削除に失敗しました: ${deleteResult.body}`);
        }
      } catch (error) {
        console.error('プリセット削除エラー:', error);
        alert('プリセットの削除中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // プリセットの追加
  const addPreset = async () => {
    setIsLoading(true);
    
    try {
      // 固定項目のマスターデータを取得
      const result = await apiAccess(METHOD_TYPE.GET, '/fixed-field-master');
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        const fixedFieldMaster = result.body as any[];
        
        setEditingPreset({
          preset_name: '',
          preset_description: '',
          field_count: 0,
          visible_field_count: 0,
          csv_export_count: 0,
          fields: [],
          fixed_fields: fixedFieldMaster // 固定項目のマスターデータを設定
        });
        setShowEditModal(true);
      } else {
        alert(`固定項目マスターデータの取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      console.error('固定項目マスターデータ取得エラー:', error);
      alert('固定項目マスターデータの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // プリセットの編集
  const editPreset = async (preset: PresetItem) => {
    setIsLoading(true);
    
    try {
      // プリセット詳細を取得
      const result = await apiAccess(METHOD_TYPE.GET, `/preset-detail/${preset.preset_id}`);
      
      if (result.statusNum === RESULT.NORMAL_TERMINATION) {
        const presetDetail = result.body as any;
        
        setEditingPreset({
          preset_id: presetDetail.preset_id,
          preset_name: presetDetail.preset_name,
          preset_description: presetDetail.preset_description,
          created_by: presetDetail.created_by,
          created_at: presetDetail.created_at,
          updated_by: presetDetail.updated_by,
          updated_at: presetDetail.updated_at,
          is_active: presetDetail.is_active,
          field_count: presetDetail.fields?.length || 0,
          visible_field_count: presetDetail.fields?.filter((f: PresetItemField) => f.is_visible).length || 0,
          csv_export_count: presetDetail.fields?.filter((f: PresetItemField) => f.is_csv_export).length || 0,
          fields: presetDetail.fields || [],
          fixed_fields: presetDetail.fixed_fields || []
        });
        setShowEditModal(true);
      } else {
        alert(`プリセット詳細の取得に失敗しました: ${result.body}`);
      }
    } catch (error) {
      console.error('プリセット詳細取得エラー:', error);
      alert('プリセット詳細の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // モーダルの保存成功処理
  const handleModalSaveSuccess = () => {
    // 一覧を再読み込み
    loadPresetList();
  };

  // モーダルの非表示処理
  const handleModalHide = () => {
    setShowEditModal(false);
    setEditingPreset(null);
  };

  return (
    <div className="preset-manager-container">
      <div className="page-area">
        <Navbar collapseOnSelect fixedTop>
          <Navbar.Header>
            <Navbar.Brand>
              <img src="./image/logo.png" alt="JESGO" className="img" />
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <NavItem className="header-text">プリセット管理</NavItem>
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
                  <SystemMenu title="設定" i={0} isConfirm={editingCheck} />
                </div>
              </Navbar.Brand>
            </Nav>
            <Navbar.Text pullRight>{facilityName}&nbsp;&nbsp;</Navbar.Text>
          </Navbar.Collapse>
        </Navbar>
      </div>

      <div className="schema-buttons">
        <div className="schema-inner">
          <Button
            bsStyle="success"
            className="normal-button"
            title="新しいプリセットを追加します"
            onClick={addPreset}
          >
            追加
          </Button>
          <Button
            bsStyle="info"
            className="normal-button"
            title="プリセットとドキュメントの連携テストを実行します"
            onClick={() => navigate('/PresetDocumentTest')}
          >
            連携テスト
          </Button>
          <Button
            onClick={() => {
              if (editingCheck()) {
                backToPatientsList(navigate);
              }
            }}
            bsStyle="primary"
            className="normal-button"
          >
            リストに戻る
          </Button>
        </div>
      </div>

      <div className="preset-list">
        <Table striped className="preset-table">
          <thead>
            <tr>
              <th>プリセット名</th>
              <th>説明</th>
              <th>項目数</th>
              <th>表示項目数</th>
              <th>CSV出力数</th>
              <th>作成者</th>
              <th>作成日時</th>
              <th>更新日時</th>
              <th className="preset-table-short">
                {/* ボタン類(編集/削除) */}
              </th>
            </tr>
          </thead>
          <tbody>
              {presetList.map((preset) => {
                // preset_id = 1 の場合は編集・削除不可
                const isSystemPreset = preset.preset_id === 1;
                
                return (
                  <tr key={preset.preset_id.toString()}>
                    <td>{preset.preset_name}</td>
                    <td>{preset.preset_description}</td>
                    <td>{preset.field_count}</td>
                    <td>{preset.visible_field_count}</td>
                    <td>{preset.csv_export_count}</td>
                    <td>{preset.created_by}</td>
                    <td>{new Date(preset.created_at).toLocaleString('ja-JP')}</td>
                    <td>{new Date(preset.updated_at).toLocaleString('ja-JP')}</td>
                    <td className="preset-table-short">
                      <ButtonToolbar>
                        <ButtonGroup>
                          <Button
                            title={isSystemPreset ? 'システムプリセットは編集できません' : '編集'}
                            onClick={() => editPreset(preset)}
                            disabled={isSystemPreset}
                          >
                            <Glyphicon glyph="edit" />
                          </Button>
                          <Button
                            title={isSystemPreset ? 'システムプリセットは削除できません' : '削除'}
                            onClick={() => deletePreset(preset)}
                            disabled={isSystemPreset}
                          >
                            <Glyphicon glyph="trash" />
                          </Button>
                        </ButtonGroup>
                      </ButtonToolbar>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
      {isLoading && <Loading />}
      
      {/* プリセット編集モーダル */}
      <PresetEditModal
        show={showEditModal}
        onHide={handleModalHide}
        onSaveSuccess={handleModalSaveSuccess}
        presetData={editingPreset ? {
          preset_id: editingPreset.preset_id,
          preset_name: editingPreset.preset_name,
          preset_description: editingPreset.preset_description,
          fields: editingPreset.fields || [],
          fixed_fields: editingPreset.fixed_fields || []
        } : {
          preset_name: '',
          preset_description: '',
          fields: [],
          fixed_fields: [] // 新規作成時は空の配列
        }}
      />
    </div>
  );
};

export default PresetManager;
