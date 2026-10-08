-- =============================================
-- ユーザテーブルへの列追加
-- バージョン: 1.6.0
-- 説明: 利用者ごとの「保存確認ダイアログを表示しない」設定を保持する列を追加する
--       既存の利用者は既定値 FALSE（保存確認を表示する＝従来どおり）になる
--       何度実行しても結果は変わらない（列が既にある場合は何もしない）
-- 切り戻し: ALTER TABLE jesgo_user DROP COLUMN IF EXISTS hide_save_confirm;
--           （切り戻すと各利用者の設定内容は失われる。症例データには影響しない）
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

ALTER TABLE jesgo_user ADD COLUMN IF NOT EXISTS hide_save_confirm boolean NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN jesgo_user.hide_save_confirm IS '症例登録画面の保存確認ダイアログを表示しない（TRUE:表示しない／FALSE:表示する）';
