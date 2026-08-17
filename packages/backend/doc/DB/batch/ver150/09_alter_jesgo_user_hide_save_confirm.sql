-- 症例保存確認ダイアログのユーザー単位の表示設定
-- FALSE: 表示する（初期値）、TRUE: 表示しない
ALTER TABLE jesgo_user ADD COLUMN IF NOT EXISTS hide_save_confirm boolean DEFAULT FALSE;
