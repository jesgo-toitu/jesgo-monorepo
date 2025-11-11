import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Nav, Navbar, NavItem } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import apiAccess, { METHOD_TYPE, RESULT } from '../common/ApiAccess';
import { Const } from '../common/Const';
import Loading from '../components/CaseRegistration/Loading';
import { SystemMenu } from '../components/common/SystemMenu';
import { UserMenu } from '../components/common/UserMenu';
import StaffTables from '../components/Staff/StaffTables';
import UserRollSetting from '../components/Staff/UserRollSetting';
import { settingsFromApi } from './Settings';
import './Stafflist.css';
import { backToPatientsList } from '../common/CommonUtility';

export const Stafflist = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('display_name') ?? '';
  const [facilityName, setFacilityName] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [selectedTab, setSelectedTab] = useState(1);
  const [selectTabClassList, setSelectTabClassList] = useState<string[]>([
    'blue',
    '',
  ]);

  const refUserRollSetting = useRef();

  useEffect(() => {
    const f = async () => {
      setIsLoading(true);
      // 設定情報取得APIを呼ぶ
      const returnSettingApiObject = await apiAccess(
        METHOD_TYPE.GET,
        `getSettings`
      );

      // 正常に取得できた場合施設名を設定
      if (returnSettingApiObject.statusNum === RESULT.NORMAL_TERMINATION) {
        const returned = returnSettingApiObject.body as settingsFromApi;
        setFacilityName(returned.facility_name);
      }

      setIsLoading(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    f();
  }, []);

  // 画面遷移前のチェック(権限設定画面用)
  const isTransitionOkWrapper = (): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const func = (refUserRollSetting.current as any)
      ?.isTransitionOk as () => boolean;
    if (func) {
      return func();
    }
    return true;
  };

  // 選択中画面のタイトル色設定
  useEffect(() => {
    const classList: string[] = [];
    for (let i = 1; i <= selectTabClassList.length; i += 1) {
      classList.push(selectedTab === i ? 'blue' : '');
    }
    setSelectTabClassList(classList);
  }, [selectedTab]);

  const clickCancel = useCallback(() => {
    if (selectedTab === 1) {
      //
      backToPatientsList(navigate);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    } else if (isTransitionOkWrapper()) {
      // 権限管理の場合、確認ダイアログを表示する
      backToPatientsList(navigate);
    }
  }, [selectedTab]);

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
            <Nav
              onSelect={(eventKey: any) => {
                if (selectedTab === 2) {
                  // 権限管理→利用者管理への切り替え時は変更チェックする
                  if (!isTransitionOkWrapper()) {
                    return;
                  }
                }
                setSelectedTab(eventKey as unknown as number);
              }}
            >
              <NavItem
                className={`header-text ${selectTabClassList[0]}`}
                eventKey={1}
              >
                利用者管理
              </NavItem>
              <NavItem
                className={`header-text ${selectTabClassList[1]}`}
                eventKey={2}
              >
                権限管理
              </NavItem>
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
                  <SystemMenu
                    title="設定"
                    i={0}
                    isConfirm={null}
                    isTransitionOk={isTransitionOkWrapper}
                  />
                </div>
              </Navbar.Brand>
              <NavItem>
                <Button onClick={clickCancel} bsStyle="primary" className="">
                  リストに戻る
                </Button>
              </NavItem>
            </Nav>
            <Navbar.Text pullRight>{facilityName}&nbsp;&nbsp;</Navbar.Text>
          </Navbar.Collapse>
        </Navbar>
        <div className="search-result-staff">
          {selectedTab === 1 && <StaffTables setIsLoading={setIsLoading} />}
          {selectedTab === 2 && (
            <UserRollSetting
              ref={refUserRollSetting}
              setIsLoading={setIsLoading}
            />
          )}
        </div>
      </div>
      {isLoading && <Loading />}
    </>
  );
};

export default Stafflist;
