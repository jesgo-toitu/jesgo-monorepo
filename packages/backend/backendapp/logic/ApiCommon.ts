/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// 共通パッケージから型定義と定数をインポート
export { ApiReturnObject, RESULT } from '@jesgo/common';

export const getToken = (req: any): string => {
  let returnString = '';
  if (req.header('token') !== undefined) {
    returnString = req.header('token') as string;
  } else {
    returnString = req.body.headers.token as string;
  }
  return returnString;
};
