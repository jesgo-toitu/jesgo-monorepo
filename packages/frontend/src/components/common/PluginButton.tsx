import React, { useCallback, useEffect, useState } from 'react';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DropdownButton from 'react-bootstrap/lib/DropdownButton';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import {
  IsNotUpdate,
  OpenOutputView,
} from '../../common/CaseRegistrationUtility';
import {
  executePlugin,
  executePluginWithTimeout,
  jesgoPluginColumns,
} from '../../common/Plugin';
import { jesgoCaseDefine } from '../../store/formDataReducer';
import PluginOverwriteConfirm, {
  OverwriteDialogPlop,
} from './PluginOverwriteConfirm';
import { reloadState } from '../../views/Registration';
import { PluginModalDialog } from '../Plugin/PluginModal';

const PAGE_TYPE = {
  PATIENT_LIST: 0,
  TARGET_PATIENT: 1,
};

const PluginButton = (props: {
  pageType: number;
  pluginList: jesgoPluginColumns[];
  getTargetFunction: () => jesgoCaseDefine[];
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  setReload: (value: React.SetStateAction<reloadState>) => void;
}) => {
  const { pageType, pluginList, getTargetFunction, setIsLoading, setReload } =
    props;
  const [targetPlugins, setTargetPlugins] = useState<jesgoPluginColumns[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [overwriteDialogPlop, setOverwriteDialogPlop] = useState<
    OverwriteDialogPlop | undefined
  >();

  const [childPlugins, setChildPlugins] = useState<jesgoPluginColumns[]>([]);
  const [show, setShow] = useState(false);
  const [update, setUpdate] = useState(false);
  const [pluginTitle, setPluginTitle] = useState("");

  useEffect(() => {
    const plugins = pluginList.filter((p) => !p.plugin_id || (p.plugin_id && !p.plugin_group_id));
    switch (pageType) {
      case PAGE_TYPE.PATIENT_LIST: {
        setTargetPlugins(plugins.filter((p) => p.all_patient));
        break;
      }
      case PAGE_TYPE.TARGET_PATIENT: {
        setTargetPlugins(plugins.filter((p) => !p.all_patient && !p.target_schema_id && !p.newdata));
        break;
      }
      default:
    }
  }, [pluginList]);

  const handlePluginSelect = async (plugin: jesgoPluginColumns) => {
    // 権限振り分け
    const selectAuth = localStorage.getItem('is_plugin_executable_select');
    const updateAuth = localStorage.getItem('is_plugin_executable_update');
    if (
      (plugin.update_db && updateAuth !== 'true') ||
      (!plugin.update_db && selectAuth !== 'true')
    ) {
      // eslint-disable-next-line no-alert
      alert('権限がありません');
      return;
    }

    // プラグイングループ項目：モーダルダイアログ表示
    if (!plugin.plugin_id) {
      setChildPlugins(pluginList.filter((p) => p.plugin_id && p.plugin_group_id === plugin.plugin_group_id));
      setPluginTitle(plugin.plugin_name);
      setShow(true);
      return;
    }

    if (
      pageType === PAGE_TYPE.PATIENT_LIST ||
      IsNotUpdate() ||
      // eslint-disable-next-line no-restricted-globals
      confirm('編集中のデータがありますが、破棄してプラグインを実行しますか？')
    ) {
      await executePluginWithTimeout(
        plugin,
        () =>
          executePlugin(
            plugin,
            getTargetFunction(),
            undefined,
            setReload,
            setIsLoading,
            setOverwriteDialogPlop
          ),
        setIsLoading
      );
    }
  };

  const modalHide = useCallback(() => {
    // setShow(false);
  }, [setShow]);

  const modalOk = () => {
    setUpdate((prevState) => !prevState);
    setShow(false);
    setChildPlugins([]);
  };

  const modalCancel = useCallback(() => {
    setUpdate((prevState) => !prevState);
    setShow(false);
    setChildPlugins([]);
  }, [setShow]);

  return (
    <>
      {overwriteDialogPlop && (
        <PluginOverwriteConfirm
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...overwriteDialogPlop}
        />
      )}
      <ButtonToolbar style={{ margin: '1rem' }}>
        <DropdownButton
          aria-hidden="true"
          bsSize="small"
          title="プラグイン選択"
          key="plugin-select"
          id="dropdown-basic-plugin-select"
        >
          {targetPlugins.map((p) => (
            <MenuItem onSelect={() => handlePluginSelect(p)}>
              {p.plugin_name}
            </MenuItem>
          ))}
        </DropdownButton>
      </ButtonToolbar>
      <PluginModalDialog
        show={show}
        onHide={() => modalHide()}
        onOk={modalOk}
        onCancel={() => modalCancel()}
        title="JESGO プラグイン"
        pluginTitle={pluginTitle}
        pageType={pageType}
        pluginList={childPlugins}
        getTargetFunction={getTargetFunction}
        setIsLoading={setIsLoading}
        setReload={setReload}
      />
    </>
  );
};

export const PatientListPluginButton = (props: {
  pluginList: jesgoPluginColumns[];
  getTargetFunction: () => jesgoCaseDefine[];
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  setReload: (value: React.SetStateAction<reloadState>) => void;
}) => {
  const { pluginList, getTargetFunction, setIsLoading, setReload } = props;
  return PluginButton({
    pageType: PAGE_TYPE.PATIENT_LIST,
    pluginList,
    getTargetFunction,
    setIsLoading,
    setReload,
  });
};

export const TargetPatientPluginButton = (props: {
  pluginList: jesgoPluginColumns[];
  getTargetFunction: () => jesgoCaseDefine[];
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  setReload: (value: React.SetStateAction<reloadState>) => void;
}) => {
  const { pluginList, getTargetFunction, setIsLoading, setReload } = props;
  return PluginButton({
    pageType: PAGE_TYPE.TARGET_PATIENT,
    pluginList,
    getTargetFunction,
    setIsLoading,
    setReload,
  });
};
