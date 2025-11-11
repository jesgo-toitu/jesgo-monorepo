/**
 * スタッフ関連のバリデーション定義
 */

/**
 * スタッフ登録・編集のエラーメッセージ
 */
export const StaffErrorMessage = {
  /** ログインIDが未入力 */
  LOGINID_NOT_ENTERED: 'ログインIDを入力してください',
  /** ログインIDがポリシーに違反 */
  LOGINID_POLICY_ERROR:
    'ログインIDは6文字以上8文字以内の半角英数字で入力してください',
  /** 表示名の長さエラー */
  DISPLAYNAME_LENGTH_ERROR: '表示名は20文字以内で入力してください',
  /** 表示名が未入力 */
  DISPLAYNAME_NOT_ENTERED: '表示名を入力してください',
  /** パスワードが未入力 */
  PASSWORD_NOT_ENTERED: 'パスワードを入力してください',
  /** パスワードがポリシーに違反 */
  PASSWORD_POLICY_ERROR:
    'パスワードは半角英数字をそれぞれ1種類以上含む8文字以上20文字以内で入力してください',
  /** パスワード確認エラー（フロントエンドのみ） */
  PASSWORD_COMPARE_ERROR: '確認用のパスワードが一致しません。',
  /** 権限エラー */
  ROLL_ERROR: '権限を選択してください。',
} as const;

/**
 * ログインID検証用の正規表現
 * 6文字以上8文字以内の半角英数字
 */
export const LOGINID_PATTERN = /^([a-zA-Z0-9]{6,8})$/;

/**
 * パスワード検証用の正規表現
 * 半角英数字をそれぞれ1種類以上含む8文字以上20文字以内
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

