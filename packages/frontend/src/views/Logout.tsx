import React from 'react';
import { clearPatientListViewState } from '../common/PatientListViewState';

export interface Jwt {
  token: string;
}

export const Logout = () => {
  localStorage.removeItem('token');
  // 患者リストの検索・絞り込みの状態を削除（次にログインする利用者へ引き継がない）
  clearPatientListViewState();

  return (
    <div className="w-full flex justify-center items-center flex-col">
      <div className="text-2xl">ログアウトしました。</div>
      <div className="mt-2 ml-4 w-64" />
    </div>
  );
};

export default Logout;
