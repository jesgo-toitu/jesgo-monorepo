-- =============================================
-- プリセット管理テーブル作成
-- バージョン: 1.5.0
-- 作成日: 2025-10-22
-- 説明: プリセット管理の基本テーブルを作成
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

-- プリセットマスタテーブル
CREATE TABLE jesgo_preset (
    preset_id SERIAL PRIMARY KEY,                    -- プリセットID（主キー）
    preset_name VARCHAR(100) NOT NULL,               -- プリセット名（最大100文字）
    preset_description TEXT,                         -- プリセット説明（自由記述）
    created_by VARCHAR(50) NOT NULL,                 -- 作成者（ユーザー名）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 作成日時
    updated_by VARCHAR(50),                          -- 更新者（ユーザー名）
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新日時
    is_active BOOLEAN DEFAULT TRUE                   -- 有効フラグ（削除時はFALSE）
);

-- プリセット項目テーブル（jesgo_document_schema連携版）
-- プリセットに含まれる項目の詳細情報を管理するテーブル
CREATE TABLE jesgo_preset_field (
    field_id SERIAL PRIMARY KEY,                     -- 項目ID（主キー）
    preset_id INTEGER NOT NULL,                      -- プリセットID（外部キー）
    
    -- スキーマ関連の情報（jesgo_document_schemaとの紐づけ）
    schema_primary_id INTEGER,                       -- スキーマプライマリID（外部キー）
    schema_id INTEGER,                               -- スキーマID（参照用）
    schema_id_string VARCHAR(200),                   -- スキーマID文字列（参照用）
    
    -- 項目情報
    field_name VARCHAR(200) NOT NULL,                -- 項目名（スキーマパス）
    display_name VARCHAR(100) NOT NULL,              -- 表示名（画面表示用）
    field_path VARCHAR(500),                         -- フィールドパス（例：/schema/CC/staging.治療施行状況）
    field_type VARCHAR(50),                         -- 項目タイプ（例：patient_id, patient_name）
    
    -- 表示制御
    is_visible BOOLEAN DEFAULT TRUE,                 -- 表示フラグ（一覧表示するか）
    is_csv_export BOOLEAN DEFAULT TRUE,              -- CSV出力フラグ（CSVに含めるか）
    is_csv_header_display_name BOOLEAN DEFAULT FALSE, -- CSVヘッダを表示名にするフラグ
    is_fixed BOOLEAN DEFAULT FALSE,                  -- 固定項目フラグ（編集不可か）
    display_order INTEGER DEFAULT 0,                -- 表示順序（一覧表示の順番）
    
    -- スキーマ情報（キャッシュ用）
    schema_title VARCHAR(200),                       -- 文書(スキーマ)タイトル
    schema_subtitle VARCHAR(200),                    -- スキーマサブタイトル
    schema_version VARCHAR(20),                      -- スキーマバージョン
    
    -- 監査情報
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 作成日時
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新日時
    
    -- 外部キー制約
    CONSTRAINT fk_preset_field_preset_id FOREIGN KEY (preset_id) REFERENCES jesgo_preset(preset_id) ON DELETE CASCADE,
    CONSTRAINT fk_preset_field_schema_primary_id FOREIGN KEY (schema_primary_id) REFERENCES jesgo_document_schema(schema_primary_id) ON DELETE SET NULL
);

-- インデックス作成
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_preset_created_by ON jesgo_preset(created_by);
CREATE INDEX idx_preset_created_at ON jesgo_preset(created_at);
CREATE INDEX idx_preset_is_active ON jesgo_preset(is_active);

-- プリセット項目テーブルのインデックス
CREATE INDEX idx_preset_field_preset_id ON jesgo_preset_field(preset_id);
CREATE INDEX idx_preset_field_display_order ON jesgo_preset_field(preset_id, display_order);
CREATE INDEX idx_preset_field_schema_primary_id ON jesgo_preset_field(schema_primary_id);
CREATE INDEX idx_preset_field_schema_id ON jesgo_preset_field(schema_id);
CREATE INDEX idx_preset_field_is_fixed ON jesgo_preset_field(is_fixed);

-- コメント追加
COMMENT ON TABLE jesgo_preset IS 'プリセットマスタテーブル - プリセットの基本情報を管理';
COMMENT ON COLUMN jesgo_preset.preset_id IS 'プリセットID（主キー）';
COMMENT ON COLUMN jesgo_preset.preset_name IS 'プリセット名（同名可）';
COMMENT ON COLUMN jesgo_preset.preset_description IS 'プリセットの説明文';
COMMENT ON COLUMN jesgo_preset.created_by IS '作成者のユーザー名';
COMMENT ON COLUMN jesgo_preset.created_at IS '作成日時';
COMMENT ON COLUMN jesgo_preset.updated_by IS '最終更新者のユーザー名';
COMMENT ON COLUMN jesgo_preset.updated_at IS '最終更新日時';
COMMENT ON COLUMN jesgo_preset.is_active IS '有効フラグ（論理削除用）';

COMMENT ON TABLE jesgo_preset_field IS 'プリセット項目テーブル - プリセットに含まれる項目の詳細情報（jesgo_document_schema連携版）';
COMMENT ON COLUMN jesgo_preset_field.field_id IS '項目ID（主キー）';
COMMENT ON COLUMN jesgo_preset_field.preset_id IS '所属するプリセットID（外部キー）';
COMMENT ON COLUMN jesgo_preset_field.schema_primary_id IS 'スキーマプライマリID（jesgo_document_schemaとの紐づけ）';
COMMENT ON COLUMN jesgo_preset_field.schema_id IS 'スキーマID（参照用）';
COMMENT ON COLUMN jesgo_preset_field.schema_id_string IS 'スキーマID文字列（参照用）';
COMMENT ON COLUMN jesgo_preset_field.field_name IS '項目名（スキーマパス、例：治療施行状況）';
COMMENT ON COLUMN jesgo_preset_field.display_name IS '表示名（画面表示用の項目名）';
COMMENT ON COLUMN jesgo_preset_field.field_path IS 'フィールドパス（例：/schema/CC/staging.治療施行状況）';
COMMENT ON COLUMN jesgo_preset_field.field_type IS '項目タイプ（例：patient_id, patient_name）';
COMMENT ON COLUMN jesgo_preset_field.is_visible IS '表示フラグ（一覧画面で表示するか）';
COMMENT ON COLUMN jesgo_preset_field.is_csv_export IS 'CSV出力フラグ（CSVエクスポートに含めるか）';
COMMENT ON COLUMN jesgo_preset_field.is_csv_header_display_name IS 'CSVヘッダを表示名にするフラグ（TRUEの場合、CSVヘッダにdisplay_nameを使用）';
COMMENT ON COLUMN jesgo_preset_field.is_fixed IS '固定項目フラグ（編集不可の固定項目か）';
COMMENT ON COLUMN jesgo_preset_field.display_order IS '表示順序（一覧表示の順番）';
COMMENT ON COLUMN jesgo_preset_field.schema_title IS '文書(スキーマ)タイトル（例：患者台帳 子宮頸がん）';
COMMENT ON COLUMN jesgo_preset_field.schema_subtitle IS 'スキーマサブタイトル';
COMMENT ON COLUMN jesgo_preset_field.schema_version IS 'スキーマバージョン（例：1.2）';

-- 更新日時の自動更新トリガー作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- プリセットテーブルの更新日時自動更新トリガー
CREATE TRIGGER update_preset_updated_at 
    BEFORE UPDATE ON jesgo_preset 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- プリセット項目テーブルの更新日時自動更新トリガー
CREATE TRIGGER update_preset_field_updated_at 
    BEFORE UPDATE ON jesgo_preset_field 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- スキーマ情報更新用の関数
-- スキーマが更新された際にプリセット項目のスキーマ情報を更新する
CREATE OR REPLACE FUNCTION update_preset_field_schema_info()
RETURNS TRIGGER AS $func$
BEGIN
    -- スキーマが更新された際に、関連するプリセット項目のスキーマ情報を更新
    UPDATE jesgo_preset_field 
    SET 
        schema_title = NEW.title,
        schema_subtitle = NEW.subtitle,
        schema_version = NEW.version_major || '.' || NEW.version_minor,
        updated_at = CURRENT_TIMESTAMP
    WHERE schema_primary_id = NEW.schema_primary_id;
    
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- スキーマ更新時のトリガー
CREATE TRIGGER trigger_update_preset_field_schema_info
    AFTER UPDATE ON jesgo_document_schema
    FOR EACH ROW
    EXECUTE FUNCTION update_preset_field_schema_info();

-- プリセット項目とスキーマの関連を取得するビュー
CREATE VIEW v_preset_field_with_schema AS
SELECT 
    pf.field_id,
    pf.preset_id,
    p.preset_name,
    p.preset_description,
    
    -- スキーマ情報
    pf.schema_primary_id,
    pf.schema_id,
    pf.schema_id_string,
    pf.schema_title,
    pf.schema_subtitle,
    pf.schema_version,
    
    -- 項目情報
    pf.field_name,
    pf.display_name,
    pf.field_path,
    pf.field_type,
    
    -- 表示制御
    pf.is_visible,
    pf.is_csv_export,
    pf.is_csv_header_display_name,
    pf.is_fixed,
    pf.display_order,
    
    -- 監査情報
    pf.created_at,
    pf.updated_at,
    
    -- スキーマの有効性
    CASE 
        WHEN pf.schema_primary_id IS NULL THEN '固定項目'
        WHEN ds.schema_primary_id IS NULL THEN 'スキーマ削除済み'
        WHEN ds.hidden = TRUE THEN 'スキーマ非表示'
        WHEN ds.valid_until IS NOT NULL AND ds.valid_until < CURRENT_DATE THEN 'スキーマ期限切れ'
        ELSE '有効'
    END AS schema_status
    
FROM jesgo_preset_field pf
LEFT JOIN jesgo_preset p ON pf.preset_id = p.preset_id
LEFT JOIN jesgo_document_schema ds ON pf.schema_primary_id = ds.schema_primary_id
WHERE p.is_active = TRUE
ORDER BY pf.preset_id, pf.display_order;

COMMENT ON VIEW v_preset_field_with_schema IS 'プリセット項目とスキーマ情報を統合したビュー（スキーマの有効性も含む）';

