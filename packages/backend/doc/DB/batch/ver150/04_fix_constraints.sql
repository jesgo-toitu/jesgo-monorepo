-- =============================================
-- 制約修正
-- バージョン: 1.5.0
-- 作成日: 2025-10-23
-- 説明: プリセットテーブルの制約を修正
-- =============================================

-- プリセットテーブルのユニーク制約を削除（同名プリセットを許可）
ALTER TABLE jesgo_preset DROP CONSTRAINT IF EXISTS uk_preset_name;

-- コメントを更新
COMMENT ON COLUMN jesgo_preset.preset_name IS 'プリセット名（同名可）';

-- 修正完了のログ（jesgo_system_logテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jesgo_system_log') THEN
        INSERT INTO jesgo_system_log (log_level, log_message, created_at) 
        VALUES ('INFO', 'プリセットテーブルのユニーク制約を削除しました', CURRENT_TIMESTAMP);
    END IF;
END $$;

