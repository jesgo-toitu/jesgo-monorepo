import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Modal,
  Button,
  ControlLabel,
  FormControl,
  FormGroup,
} from 'react-bootstrap';
import ModalDialog from '../common/ModalDialog';
import './PluginModal.css';
import {
  executePlugin,
  executePluginWithTimeout,
  jesgoPluginColumns,
} from '../../common/Plugin';
import { jesgoCaseDefine } from '../../store/formDataReducer';
import { reloadState } from '../../views/Registration';
import {
  IsNotUpdate,
  OpenOutputView,
} from '../../common/CaseRegistrationUtility';
import PluginOverwriteConfirm, {
  OverwriteDialogPlop,
} from '../common/PluginOverwriteConfirm';

const PAGE_TYPE = {
  PATIENT_LIST: 0,
  TARGET_PATIENT: 1,
};

const PluginErrorMessage = {
  PLAGIN_SELECT_ERROR: 'プラグインを選択してください',
} as const;

export const PluginModalDialog = (props: {
  onHide: () => void;
  onOk: () => void;
  onCancel: MouseEventHandler<Button>;
  show: boolean;
  title: string;
  pluginTitle: string;
  pageType: number;
  pluginList: jesgoPluginColumns[];
  getTargetFunction: () => jesgoCaseDefine[];
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  setReload: (value: React.SetStateAction<reloadState>) => void;
}) => {
  const { onHide, onOk, onCancel, show, title, pluginTitle, pageType, pluginList, getTargetFunction, setIsLoading, setReload } = props;
  const [targetPlugins, setTargetPlugins] = useState<jesgoPluginColumns[]>([]);
  const [targetPlugin, setTargetPlugin] = useState<jesgoPluginColumns>();

  const [errShow, setErrShow] = useState(false);
  const [message, setMessage] = useState<string>('');

  const [overwriteDialogPlop, setOverwriteDialogPlop] = useState<
  OverwriteDialogPlop | undefined
  >();

  useEffect(() => {
    switch (pageType) {
      case PAGE_TYPE.PATIENT_LIST: {
        setTargetPlugins(pluginList.filter((p) => p.all_patient));
        break;
      }
      case PAGE_TYPE.TARGET_PATIENT: {
        setTargetPlugins(pluginList.filter((p) => !p.all_patient && !p.target_schema_id && !p.newdata));
        break;
      }
      default:
    }
  }, [pageType, pluginList]);

  useEffect(() => {
    setTargetPlugin(undefined);
  }, [show]);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const errModalHide = useCallback(() => {}, []);

  const errModalOk = useCallback(() => {
    setErrShow(false);
  }, [errShow]);

  const errModalCancel = useCallback(() => {
    setErrShow(false);
  }, [errShow]);

  const onChangePlugin = (event: React.FormEvent<FormControl>) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const eventTarget: EventTarget & HTMLInputElement =
      event.target as EventTarget & HTMLInputElement;

      const plugin_id = parseInt(eventTarget.value);
      if (isNaN(plugin_id)) return;

      setTargetPlugin(pluginList.find((p) => p.plugin_id === plugin_id));
  };

  const onExecute = async () => {
    // プラグインチェック
    if (!targetPlugin){
      setMessage(PluginErrorMessage.PLAGIN_SELECT_ERROR);
      setErrShow(true);
      return;
    }

    // 権限振り分け
    const selectAuth = localStorage.getItem('is_plugin_executable_select');
    const updateAuth = localStorage.getItem('is_plugin_executable_update');
    if (
      (targetPlugin?.update_db && updateAuth !== 'true') ||
      (!targetPlugin?.update_db && selectAuth !== 'true')
    ) {
      // eslint-disable-next-line no-alert
      alert('権限がありません');
      return;
    }

    if (
      pageType === PAGE_TYPE.PATIENT_LIST ||
      IsNotUpdate() ||
      // eslint-disable-next-line no-restricted-globals
      confirm('編集中のデータがありますが、破棄してプラグインを実行しますか？')
    ) {
      await executePluginWithTimeout(
        targetPlugin as jesgoPluginColumns,
        () =>
          executePlugin(
            targetPlugin as jesgoPluginColumns,
            getTargetFunction(),
            undefined,
            setReload,
            setIsLoading,
            setOverwriteDialogPlop
          ),
        setIsLoading
      );
    }

    onOk();
  };

  return (
    <>
      {overwriteDialogPlop && (
        <PluginOverwriteConfirm
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...overwriteDialogPlop}
        />
      )}
      <Modal show={show} onHide={onHide}>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormGroup controlId="pluginSelect">
            <ControlLabel>{pluginTitle}</ControlLabel>
            <FormControl
              required
              name="pluginSelect"
              componentClass="select"
              defaultValue={""}
              onChange={onChangePlugin}
            >
              <option value="" disabled hidden>
                スクリプトファイルを指定して実行
              </option>
              {targetPlugins.map((p) => (
                <option value={p.plugin_id} key={p.plugin_id}>
                  {p.plugin_name}
                </option>
              ))}
            </FormControl>
          </FormGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="default" onClick={onExecute}>
            実行
          </Button>
          <Button bsStyle="default" onClick={onCancel}>
            キャンセル
          </Button>
        </Modal.Footer>
      </Modal>
      <ModalDialog
        show={errShow}
        onHide={() => errModalHide()}
        onOk={() => errModalOk()}
        onCancel={() => errModalCancel()}
        title="JESGO"
        type="Alert"
        message={message}
      />
    </>
  );
};

export default PluginModalDialog;
