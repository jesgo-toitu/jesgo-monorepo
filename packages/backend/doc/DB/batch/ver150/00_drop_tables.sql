-- =============================================
-- プリセット管理テーブル削除
-- バージョン: 1.5.0
-- 作成日: 2025-10-23
-- 説明: プリセット管理関連のテーブル・ビュー・トリガー・関数を削除
-- 注意: このSQLを実行後、01_create_preset_tables.sql, 02_create_fixed_field_tables.sql,
--       03_insert_sample_data.sql, 04_fix_constraints.sql を順番に実行してください
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

-- =============================================
-- 1. ビューの削除（テーブルに依存しているため先に削除）
-- =============================================
DROP VIEW IF EXISTS v_preset_with_fixed_fields CASCADE;
DROP VIEW IF EXISTS v_preset_field_with_schema CASCADE;

-- =============================================
-- 2. トリガーの削除（テーブルに依存しているため先に削除）
-- =============================================
DROP TRIGGER IF EXISTS trigger_update_preset_field_schema_info ON jesgo_document_schema;
DROP TRIGGER IF EXISTS update_fixed_field_updated_at ON jesgo_fixed_field;
DROP TRIGGER IF EXISTS update_preset_field_updated_at ON jesgo_preset_field;
DROP TRIGGER IF EXISTS update_preset_updated_at ON jesgo_preset;

-- =============================================
-- 3. テーブルの削除（外部キー制約を考慮した順序で削除）
-- =============================================
-- 外部キー制約があるテーブルを先に削除
DROP TABLE IF EXISTS jesgo_preset_fixed_field CASCADE;
DROP TABLE IF EXISTS jesgo_preset_field CASCADE;

-- 親テーブルを削除
DROP TABLE IF EXISTS jesgo_preset CASCADE;
DROP TABLE IF EXISTS jesgo_fixed_field CASCADE;

-- =============================================
-- 4. 関数の削除
-- =============================================
-- 注意: update_updated_at_column()関数は他のテーブルでも使用されている可能性があります
-- 他のテーブルで使用されていない場合のみ削除してください
-- 使用されている場合は、この行をコメントアウトしてください
DROP FUNCTION IF EXISTS update_preset_field_schema_info() CASCADE;
DROP FUNCTION IF EXISTS get_jesgo_document(integer[]) CASCADE;
DROP FUNCTION IF EXISTS get_jesgo_filtered_root_document(jsonb) CASCADE;
DROP FUNCTION IF EXISTS search_jesgo_document(integer[], text[], integer[]) CASCADE;
DROP FUNCTION IF EXISTS search_jesgo_document_multiple(jsonb, integer[]) CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 削除完了のログ（jesgo_system_logテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jesgo_system_log') THEN
        INSERT INTO jesgo_system_log (log_level, log_message, created_at) 
        VALUES ('INFO', 'プリセット管理テーブルを削除しました', CURRENT_TIMESTAMP);
    END IF;
END $$;

