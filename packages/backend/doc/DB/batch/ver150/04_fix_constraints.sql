-- =============================================
-- 制約修正
-- バージョン: 1.5.0
-- 作成日: 2025-10-23
-- 説明: プリセットテーブルの制約を修正
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

-- NOTICEメッセージを抑制（WARNING以上のみ表示）
SET client_min_messages = WARNING;

-- プリセットテーブルのユニーク制約を削除（同名プリセットを許可）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'jesgo_preset' 
        AND constraint_name = 'uk_preset_name'
    ) THEN
        ALTER TABLE jesgo_preset DROP CONSTRAINT uk_preset_name;
    END IF;
END $$;

-- コメントを更新
COMMENT ON COLUMN jesgo_preset.preset_name IS 'プリセット名（同名可）';

-- jesgo_preset_fieldテーブルにis_csv_header_display_nameカラムを追加（既存テーブルへのマイグレーション）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jesgo_preset_field' 
        AND column_name = 'is_csv_header_display_name'
    ) THEN
        ALTER TABLE jesgo_preset_field 
        ADD COLUMN is_csv_header_display_name BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN jesgo_preset_field.is_csv_header_display_name IS 'CSVヘッダを表示名にするフラグ（TRUEの場合、CSVヘッダにdisplay_nameを使用）';
    END IF;
END $$;

-- 修正完了のログ（jesgo_system_logテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jesgo_system_log') THEN
        INSERT INTO jesgo_system_log (log_level, log_message, created_at) 
        VALUES ('INFO', 'プリセットテーブルのユニーク制約を削除しました', CURRENT_TIMESTAMP);
    END IF;
END $$;

