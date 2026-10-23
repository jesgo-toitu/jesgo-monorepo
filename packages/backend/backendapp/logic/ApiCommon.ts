/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// 共通パッケージから型定義と定数をインポート
export { ApiReturnObject, RESULT } from '@jesgo/common';

/**
 * リクエストからトークンを取り出す
 * token ヘッダ(無ければリクエスト本文の headers.token)を返す。
 * どちらにも無い場合は例外にせず undefined を返す(呼び出し側の権限確認で未認証として拒否する)
 * @param req リクエスト
 * @returns トークン。付いていない場合は undefined
 */
export const getToken = (req: any): string | undefined => {
  const headerToken: unknown = req.header('token');
  if (headerToken !== undefined) {
    return headerToken as string;
  }
  const bodyToken: unknown = req.body?.headers?.token;
  return typeof bodyToken === 'string' ? bodyToken : undefined;
};
