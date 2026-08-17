import React from 'react';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DropdownButton from 'react-bootstrap/lib/DropdownButton';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import { useNavigate } from 'react-router-dom';
import { RemoveBeforeUnloadEvent } from '../../common/CommonUtility';
import { PRESET_MANAGER_ROLL_IDS } from '../../common/StaffMaster';

export const SystemMenu = (props: {
  title: string;
  i: number;
  isConfirm: (() => boolean) | null;
  isTransitionOk?: () => boolean; // eslint-disable-line react/require-default-props
}) => {
  const { title, i, isConfirm = null, isTransitionOk } = props;
  const navigate = useNavigate();

  const checkAuth = (authName: string, navigateURL: string) => {
    const auth = localStorage.getItem(authName);
    if (auth !== 'true') {
      // eslint-disable-next-line no-alert
      alert('権限がありません');
      return;
    }

    // 権限管理から他の画面に遷移する場合は権限管理の変更チェックをする
    // 権限管理→利用者管理の場合は画面遷移がないので、スキップする
    if (
      isTransitionOk &&
      !navigateURL.includes('Stafflist') &&
      !isTransitionOk()
    ) {
      return;
    }

    RemoveBeforeUnloadEvent();
    navigate(navigateURL);
  };

  // 複数の権限のいずれかがあればアクセス可能
  const checkAuthOr = (authNames: string[], navigateURL: string) => {
    const hasAuth = authNames.some(authName => localStorage.getItem(authName) === 'true');
    if (!hasAuth) {
      // eslint-disable-next-line no-alert
      alert('権限がありません');
      return;
    }

    // 権限管理から他の画面に遷移する場合は権限管理の変更チェックをする
    // 権限管理→利用者管理の場合は画面遷移がないので、スキップする
    if (
      isTransitionOk &&
      !navigateURL.includes('Stafflist') &&
      !isTransitionOk()
    ) {
      return;
    }

    RemoveBeforeUnloadEvent();
    navigate(navigateURL);
  };

  const handlUserMaintenance = () => {
    if (isConfirm === null || isConfirm()) {
      checkAuth('is_system_manage_roll', '/Stafflist');
    }
  };

  const handlSystemSettings = () => {
    if (isConfirm === null || isConfirm()) {
      checkAuth('is_system_manage_roll', '/Settings');
    }
  };

  const handlSchemaManager = () => {
    if (isConfirm === null || isConfirm()) {
      checkAuth('is_system_manage_roll', '/SchemaManager');
    }
  };

  const handlPluginManager = () => {
    if (isConfirm === null || isConfirm()) {
      checkAuth('is_plugin_registerable', '/PluginManager');
    }
  };

  const canAccessPresetManager = PRESET_MANAGER_ROLL_IDS.includes(
    Number(localStorage.getItem('roll_id'))
  );

  const handlPresetManager = () => {
    if (isConfirm === null || isConfirm()) {
      // プラグイン登録権限ではなく、システム管理者・上級ユーザのみ遷移を許可する
      if (!canAccessPresetManager) {
        // eslint-disable-next-line no-alert
        alert('権限がありません');
        return;
      }

      if (
        isTransitionOk &&
        !isTransitionOk()
      ) {
        return;
      }

      RemoveBeforeUnloadEvent();
      navigate('/PresetManager');
    }
  };

  return (
    <ButtonToolbar>
      <DropdownButton
        aria-hidden="true"
        bsSize="small"
        title={title}
        key={i}
        id={`dropdown-basic-${i}`}
      >
        <MenuItem onSelect={handlUserMaintenance}>利用者管理</MenuItem>
        <MenuItem onSelect={handlSchemaManager}>スキーマ管理</MenuItem>
        <MenuItem onSelect={handlPluginManager}>プラグイン管理</MenuItem>
        <MenuItem onSelect={handlPresetManager}>プリセット管理</MenuItem>
        <MenuItem onSelect={handlSystemSettings}>システム設定</MenuItem>
      </DropdownButton>
    </ButtonToolbar>
  );
};

export default SystemMenu;
