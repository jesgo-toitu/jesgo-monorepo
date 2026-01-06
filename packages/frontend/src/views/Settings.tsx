import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navbar,
  Button,
  Nav,
  NavItem,
  Radio,
  Table,
  Checkbox,
  FormControl,
} from 'react-bootstrap';
import './Settings.css';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { UserMenu } from '../components/common/UserMenu';
import { SystemMenu } from '../components/common/SystemMenu';
import { Const } from '../common/Const';
import Loading from '../components/CaseRegistration/Loading';
import { backToPatientsList } from '../common/CommonUtility';
import { JesgoRequiredHighlight } from '../common/CaseRegistrationUtility';

export type settingsFromApi = {
  hisid_alignment: string;
  hisid_digit: string;
  hisid_hyphen_enable: string;
  hisid_alphabet_enable: string;
  jesgo_required_highlight: string;
  facility_name: string;
  jsog_registration_number: string;
  joed_registration_number: string;
  default_page_size: string;
};

type settings = {
  hisid_alignment: boolean;
  hisid_digit: number;
  hisid_digit_string: string;
  hisid_hyphen_enable: boolean;
  hisid_alphabet_enable: boolean;
  jesgo_required_highlight: JesgoRequiredHighlight;
  facility_name: string;
  jsog_registration_number: string;
  joed_registration_number: string;
  default_page_size: number;
};

const Settings = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('display_name');
  const [facilityName, setFacilityName] = useState('');
  const [settingJson, setSettingJson] = useState<settings>({
    hisid_alignment: true,
    hisid_digit: 8,
    hisid_digit_string: '8',
    hisid_hyphen_enable: true,
    hisid_alphabet_enable: true,
    jesgo_required_highlight: {
      jsog: false,
      jsgoe: false,
      others: false,
    },
    facility_name: '',
    jsog_registration_number: '',
    joed_registration_number: '',
    default_page_size: 100,
  });
  const [loadedSettingJson, setLoadedSettingJson] =
    useState<settings>(settingJson);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const f = async () => {
      setIsLoading(true);

      // 設定情報取得APIを呼ぶ
      const returnApiObject = await apiAccess(METHOD_TYPE.GET, `getSettings`);

      if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = returnApiObject.body as settingsFromApi;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const highlightSetting =
          returned.jesgo_required_highlight != null
            ? (JSON.parse(
                returned.jesgo_required_highlight
              ) as JesgoRequiredHighlight)
            : { jsog: false, jsgoe: false, others: false };
        // hisid_digitの数値変換（無効な値の場合はデフォルト値8を使用）
        const hisidDigit = Number(returned.hisid_digit);
        const validHisidDigit = isNaN(hisidDigit) || hisidDigit < 6 || hisidDigit > 12 ? 8 : hisidDigit;
        
        // default_page_sizeの数値変換（無効な値の場合はデフォルト値25を使用）
        const pageSize = Number(returned.default_page_size);
        const validPageSize = isNaN(pageSize) || ![10, 25, 50, 100].includes(pageSize) ? 100 : pageSize;
        
        const setting: settings = {
          hisid_alignment: returned.hisid_alignment === 'true',
          hisid_digit: validHisidDigit,
          hisid_digit_string: returned.hisid_digit,
          hisid_hyphen_enable: returned.hisid_hyphen_enable === 'true',
          hisid_alphabet_enable: returned.hisid_alphabet_enable === 'true',
          jesgo_required_highlight: highlightSetting,
          facility_name: returned.facility_name,
          jsog_registration_number: returned.jsog_registration_number,
          joed_registration_number: returned.joed_registration_number,
          default_page_size: validPageSize,
        };
        setFacilityName(returned.facility_name);
        setSettingJson(setting);
        setLoadedSettingJson(setting);
      } else {
        navigate('/login');
      }

      setIsLoading(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSettingInputs = (event: any) => {
    const eventTarget: EventTarget & HTMLInputElement =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      event.target as EventTarget & HTMLInputElement;
    const highlight = { ...settingJson.jesgo_required_highlight };

    switch (eventTarget.name) {
      case 'alignment':
        setSettingJson({
          ...settingJson,
          hisid_alignment: eventTarget.value === 'true',
        });
        break;

      case 'digit':
        setSettingJson({
          ...settingJson,
          hisid_digit: Number(eventTarget.value),
          hisid_digit_string: eventTarget.value,
        });
        break;

      case 'hyphen_enable':
        // ハイフン許容がtrueの場合、桁揃えをfalseにする
        if (eventTarget.value === 'true') {
          setSettingJson({
            ...settingJson,
            hisid_hyphen_enable: true,
            hisid_alignment: false,
          });
        } else {
          setSettingJson({
            ...settingJson,
            hisid_hyphen_enable: false,
          });
        }
        break;

      case 'alphabet_enable':
        // アルファベット許容がtrueの場合、桁揃えをfalseにする
        if (eventTarget.value === 'true') {
          setSettingJson({
            ...settingJson,
            hisid_alphabet_enable: true,
            hisid_alignment: false,
          });
        } else {
          setSettingJson({
            ...settingJson,
            hisid_alphabet_enable: false,
          });
        }
        break;

      case 'facility_name':
        setSettingJson({
          ...settingJson,
          facility_name: eventTarget.value,
        });
        break;

      case 'jesgo_required_highlight_jsog':
        highlight.jsog = eventTarget.checked;
        setSettingJson({
          ...settingJson,
          jesgo_required_highlight: highlight,
        });
        break;

      case 'jesgo_required_highlight_jsgoe':
        highlight.jsgoe = eventTarget.checked;
        setSettingJson({
          ...settingJson,
          jesgo_required_highlight: highlight,
        });
        break;

      case 'jesgo_required_highlight_others':
        highlight.others = eventTarget.checked;
        setSettingJson({
          ...settingJson,
          jesgo_required_highlight: highlight,
        });
        break;

      case 'jsog_registration_number':
        setSettingJson({
          ...settingJson,
          jsog_registration_number: eventTarget.value,
        });
        break;

      case 'joed_registration_number':
        setSettingJson({
          ...settingJson,
          joed_registration_number: eventTarget.value,
        });
        break;

      case 'default_page_size':
        setSettingJson({
          ...settingJson,
          default_page_size: Number(eventTarget.value),
        });
        break;

      default:
    }
  };
  const errorCheck = (): string[] => {
    const errorMessages: string[] = [];

    // 患者ID桁数のバリデーション（アルファベット/ハイフン許容時は自動修正）
    if (
      settingJson.hisid_digit < 6 ||
      settingJson.hisid_digit > 12 ||
      !Number.isInteger(settingJson.hisid_digit)
    ) {
      // 桁数指定が無効の場合、エラーだったら値を無警告で直す
      if (
        settingJson.hisid_alphabet_enable ||
        settingJson.hisid_hyphen_enable
      ) {
        // 自動修正：値を8に設定し、エラーメッセージは表示しない
        settingJson.hisid_digit = 8;
        settingJson.hisid_digit_string = '8';
      } else {
        // アルファベット/ハイフン許容が無効な場合のみエラーメッセージを表示
        errorMessages.push('患者ID桁数は6-12の整数を入力してください');
      }
    }
    if (
      settingJson.jsog_registration_number !== '' &&
      !settingJson.jsog_registration_number.match(/^[0-9]{6}$/)
    ) {
      errorMessages.push(
        '日産婦腫瘍登録施設番号は空欄にするか数字6桁で入力してください'
      );
    }
    if (
      settingJson.joed_registration_number !== '' &&
      !settingJson.joed_registration_number.match(
        /^(0[1-9]|[1-3]\d|4[0-7])\d{3}$/
      )
    ) {
      errorMessages.push(
        '日本産科婦人科内視鏡学会施設番号は空欄にするか正しい形式で入力してください'
      );
    }

    if (errorMessages.length > 0) {
      errorMessages.unshift('【設定値エラー】');
    }

    return errorMessages;
  };

  // 編集中チェック
  const editingCheck = () => {
    if (JSON.stringify(loadedSettingJson) !== JSON.stringify(settingJson)) {
      // eslint-disable-next-line no-restricted-globals
      return confirm(
        `編集中のデータがありますが、破棄して画面遷移します。よろしいですか？`
      );
    }
    return true;
  };

  const clickCancel = () => {
    if (editingCheck()) {
      backToPatientsList(navigate);
    }
  };

  const submit = async () => {
    const errorMessages = errorCheck();
    if (errorMessages.length > 0) {
      // eslint-disable-next-line no-alert
      alert(errorMessages.join('\n'));
      return;
    }

    const token = localStorage.getItem('token');
    if (token == null) {
      navigate('/login');
      return;
    }

    setIsLoading(true);

    // 設定情報更新APIを呼ぶ
    const returnApiObject = await apiAccess(
      METHOD_TYPE.POST,
      `updateSettings`,
      settingJson
    );

    if (returnApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
      localStorage.setItem('alignment', settingJson.hisid_alignment.toString());
      localStorage.setItem('digit', settingJson.hisid_digit.toString());
      localStorage.setItem(
        'alphabet_enable',
        settingJson.hisid_alphabet_enable.toString()
      );
      localStorage.setItem(
        'hyphen_enable',
        settingJson.hisid_hyphen_enable.toString()
      );
      localStorage.setItem(
        'jesgo_required_highlight',
        JSON.stringify(settingJson.jesgo_required_highlight)
      );
      localStorage.setItem(
        'default_page_size',
        settingJson.default_page_size.toString()
      );
      // カスタムイベントを発火して、Patients画面に設定変更を通知
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: { default_page_size: settingJson.default_page_size }
      }));
      // eslint-disable-next-line no-alert
      alert('設定が完了しました');
      backToPatientsList(navigate);
    } else {
      // eslint-disable-next-line no-alert
      alert('【エラー】\n設定に失敗しました');
      // navigate('/patients');
    }

    setIsLoading(false);
  };

  return (
    <>
      <div className="relative">
        <Navbar collapseOnSelect fixedTop>
          <Navbar.Header>
            <Navbar.Brand>
              <img src="./image/logo.png" alt="JESGO" className="img" />
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <NavItem className="header-text">設定</NavItem>
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

        <div className="page-menu">
          <div className="search-form-closed flex">
            <Button
              bsStyle="primary"
              onClick={submit}
              className="normal-button"
            >
              保存
            </Button>
            <div className="spacer10" />
            <Button
              onClick={clickCancel}
              bsStyle="primary"
              className="normal-button"
            >
              リストに戻る
            </Button>
          </div>
        </div>
        <div className="setting-list">
          <Table striped className="setting-table">
            <thead>
              <tr>
                <th>項目名</th>
                <th>設定値</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  患者ID 桁揃え
                  ※ハイフン/アルファベットを許容すると桁揃え設定は無効になります
                </td>
                <td>
                  <Radio
                    name="alignment"
                    onChange={handleSettingInputs}
                    value="true"
                    inline
                    checked={settingJson.hisid_alignment}
                    disabled={
                      settingJson.hisid_hyphen_enable ||
                      settingJson.hisid_alphabet_enable
                    }
                  >
                    あり
                  </Radio>
                  <Radio
                    name="alignment"
                    onChange={handleSettingInputs}
                    value="false"
                    inline
                    checked={!settingJson.hisid_alignment}
                    disabled={
                      settingJson.hisid_hyphen_enable ||
                      settingJson.hisid_alphabet_enable
                    }
                  >
                    なし
                  </Radio>
                </td>
              </tr>
              <tr>
                <td>
                  患者ID 桁数
                  ※ハイフン/アルファベットを許容すると桁数指定は無効になります
                </td>
                <td>
                  <input
                    type="text"
                    name="digit"
                    value={settingJson.hisid_digit_string}
                    onChange={handleSettingInputs}
                    disabled={
                      settingJson.hisid_hyphen_enable ||
                      settingJson.hisid_alphabet_enable
                    }
                  />
                  桁
                </td>
              </tr>
              <tr>
                <td>患者ID ハイフン許容</td>
                <td>
                  <Radio
                    name="hyphen_enable"
                    onChange={handleSettingInputs}
                    value="true"
                    inline
                    checked={settingJson.hisid_hyphen_enable}
                  >
                    あり
                  </Radio>
                  <Radio
                    name="hyphen_enable"
                    onChange={handleSettingInputs}
                    value="false"
                    inline
                    checked={!settingJson.hisid_hyphen_enable}
                  >
                    なし
                  </Radio>
                </td>
              </tr>
              <tr>
                <td>患者ID アルファベット許容</td>
                <td>
                  <Radio
                    name="alphabet_enable"
                    onChange={handleSettingInputs}
                    value="true"
                    inline
                    checked={settingJson.hisid_alphabet_enable}
                  >
                    あり
                  </Radio>
                  <Radio
                    name="alphabet_enable"
                    onChange={handleSettingInputs}
                    value="false"
                    inline
                    checked={!settingJson.hisid_alphabet_enable}
                  >
                    なし
                  </Radio>
                </td>
              </tr>
              <tr>
                <td>JSOG/JSGOE必須項目 未入力時ハイライト</td>
                <td>
                  <Checkbox
                    name="jesgo_required_highlight_jsog"
                    onChange={handleSettingInputs}
                    checked={settingJson.jesgo_required_highlight.jsog}
                  >
                    JSOG
                  </Checkbox>
                  <Checkbox
                    name="jesgo_required_highlight_jsgoe"
                    onChange={handleSettingInputs}
                    checked={settingJson.jesgo_required_highlight.jsgoe}
                  >
                    JSGOE
                  </Checkbox>
                  <Checkbox
                    name="jesgo_required_highlight_others"
                    onChange={handleSettingInputs}
                    checked={settingJson.jesgo_required_highlight.others}
                  >
                    JSOG/JSGOE以外
                  </Checkbox>
                </td>
              </tr>
              <tr>
                <td>施設名称</td>
                <td>
                  <input
                    type="text"
                    name="facility_name"
                    onChange={handleSettingInputs}
                    value={settingJson.facility_name}
                  />
                </td>
              </tr>
              <tr>
                <td>日産婦腫瘍登録施設番号</td>
                <td>
                  <input
                    type="text"
                    name="jsog_registration_number"
                    onChange={handleSettingInputs}
                    value={settingJson.jsog_registration_number}
                  />
                </td>
              </tr>
              <tr>
                <td>日本産科婦人科内視鏡学会施設番号</td>
                <td>
                  <input
                    type="text"
                    name="joed_registration_number"
                    onChange={handleSettingInputs}
                    value={settingJson.joed_registration_number}
                  />
                </td>
              </tr>
              <tr>
                <td>デフォルト表示件数</td>
                <td>
                  <FormControl
                    componentClass="select"
                    name="default_page_size"
                    value={settingJson.default_page_size}
                    onChange={handleSettingInputs}
                    style={{ width: '100px' }}
                  >
                    <option value="10">10件</option>
                    <option value="25">25件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                  </FormControl>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
      {isLoading && <Loading />}
    </>
  );
};

export default Settings;
