/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiReturnObject, getToken, RESULT } from '../logic/ApiCommon';
import { logging, LOGTYPE } from '../logic/Logger';
import { getUsernameFromRequest, checkAuth } from '../services/Users';

export const routing = async (
  path: string,
  func: any,
  req: any,
  res: any,
  next: any,
  auth: string | string[],
  arg: any | undefined = undefined
) => {
  logging(
    LOGTYPE.DEBUG,
    '呼び出し',
    'router',
    path,
    getUsernameFromRequest(req)
  );
  // 権限の確認
  const authResult: ApiReturnObject = await checkAuth(getToken(req), auth);
  if (authResult.statusNum !== RESULT.NORMAL_TERMINATION) {
    res.status(200).send(authResult);
  } else {
    if (authResult.body) {
      if (arg) {
        func(arg)
          .then((result: any) => res.status(200).send(result))
          .catch(next);
      } else {
        func()
          .then((result: any) => res.status(200).send(result))
          .catch(next);
      }
    }
    // 権限が無い場合
    else {
      logging(
        LOGTYPE.ERROR,
        '権限エラー',
        'router',
        path,
        getUsernameFromRequest(req)
      );
    }
  }
};

export default routing;
