import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navbar,
  Nav,
  NavItem,
  Button,
  Table,
  ButtonToolbar,
  ButtonGroup,
  Glyphicon,
} from 'react-bootstrap';
import { Const } from '../common/Const';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import { settingsFromApi } from './Settings';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import Loading from '../components/CaseRegistration/Loading';
import { backToPatientsList } from '../common/CommonUtility';
import './SchemaManager.css';
import './PluginManager.css';

// プリセット管理用の型定義（PresetManagerと同じ）
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
  csv_export_count: number;
}

const PatientListPresetManager = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('display_name');
  const [facilityName, setFacilityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [presetList, setPresetList] = useState<PresetItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

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
    const initializeData = async () => {
      setIsLoading(true);
      
      try {
        // 設定情報取得APIを呼ぶ
        const returnSettingApiObject = await apiAccess(
          METHOD_TYPE.GET,
          'getSettings'
        );

        // 正常に取得できた場合施設名を設定
        if (returnSettingApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
          const returned = returnSettingApiObject.body as settingsFromApi;
          setFacilityName(returned.facility_name);
        }

        // プリセット一覧を取得
        await loadPresetList();
        
        // 選択中のプリセットIDを取得
        const savedPresetId = localStorage.getItem('selected_preset_id');
        setSelectedPresetId(savedPresetId);
      } catch (error) {
        console.error('データの初期化に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initializeData();
  }, []);


  const handleBackToPatients = () => {
    backToPatientsList(navigate);
  };

  const handleViewPatientList = (preset: PresetItem) => {
    // プリセットIDをパラメータとして患者リスト画面に渡す
    const params = new URLSearchParams();
    params.append('presetId', preset.preset_id.toString());
    
    navigate(`/Patients?${params.toString()}`);
  };

  return (
    <>
      <div className="page-area">
        <Navbar collapseOnSelect fixedTop>
          <Navbar.Header>
            <Navbar.Brand>
              <img src="./image/logo.png" alt="JESGO" className="img" />
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <NavItem className="header-text">患者リストプリセット選択</NavItem>
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
              bsStyle="primary"
              className="normal-button"
              title="リストに戻る"
              onClick={handleBackToPatients}
            >
              リストに戻る
            </Button>
          </div>
        </div>

        <div className="plugin-list" style={{ marginTop: '8rem' }}>

          <Table striped className="plugin-table">
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {presetList.map((preset) => {
                const isSelected = selectedPresetId === preset.preset_id.toString();
                
                return (
                  <tr key={preset.preset_id.toString()} style={{ 
                    backgroundColor: isSelected ? '#d4edda' : 'transparent' 
                  }}>
                    <td>
                      {isSelected && <Glyphicon glyph="check" style={{ color: '#28a745', marginRight: '8px' }} />}
                      {preset.preset_name}
                    </td>
                    <td>{preset.preset_description}</td>
                    <td>{preset.field_count}</td>
                    <td>{preset.visible_field_count}</td>
                    <td>{preset.csv_export_count}</td>
                    <td>{preset.created_by}</td>
                    <td>{new Date(preset.created_at).toLocaleString('ja-JP')}</td>
                    <td>{new Date(preset.updated_at).toLocaleString('ja-JP')}</td>
                    <td>
                      <ButtonToolbar>
                        <ButtonGroup>
                          <Button
                            bsSize="xsmall"
                            bsStyle={isSelected ? 'info' : 'success'}
                            onClick={() => handleViewPatientList(preset)}
                          >
                            <Glyphicon glyph="list" />
                            {isSelected ? '選択中' : '選択'}
                          </Button>
                        </ButtonGroup>
                      </ButtonToolbar>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {presetList.length === 0 && (
            <div className="text-center" style={{ padding: '40px' }}>
              <p>プリセットが登録されていません。</p>
            </div>
          )}
        </div>

        {isLoading && <Loading />}
      </div>
    </>
  );
};

export default PatientListPresetManager;