import React from 'react';

export interface Jwt {
  token: string;
}

export const Logout = () => {
  localStorage.removeItem('token');

  return (
    <div className="w-full flex justify-center items-center flex-col">
      <div className="text-2xl">ログアウトしました。</div>
      <div className="mt-2 ml-4 w-64" />
    </div>
  );
};

export default Logout;
