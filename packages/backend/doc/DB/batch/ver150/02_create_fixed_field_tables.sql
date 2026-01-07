-- =============================================
-- 固定項目管理テーブル作成
-- バージョン: 1.5.0
-- 作成日: 2025-10-22
-- 説明: 固定項目を効率的に管理するためのテーブル構成
-- =============================================

-- 固定項目マスタテーブル
-- システム全体で共通の固定項目を管理
CREATE TABLE jesgo_fixed_field (
    fixed_field_id SERIAL PRIMARY KEY,              -- 固定項目ID（主キー）
    field_name VARCHAR(100) NOT NULL,               -- 項目名（例：患者ID）
    display_name VARCHAR(100) NOT NULL,             -- 表示名（画面表示用）
    field_type VARCHAR(50) NOT NULL,                -- 項目タイプ（例：patient_id, patient_name）
    is_visible BOOLEAN DEFAULT TRUE,                -- 表示フラグ
    is_csv_export BOOLEAN DEFAULT TRUE,             -- CSV出力フラグ
    display_order INTEGER NOT NULL,                 -- 表示順序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 作成日時
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 更新日時
    CONSTRAINT uk_fixed_field_name UNIQUE (field_name)
);

-- プリセット固定項目関連テーブル
-- プリセットと固定項目の関連を管理
CREATE TABLE jesgo_preset_fixed_field (
    preset_id INTEGER NOT NULL,                     -- プリセットID（外部キー）
    fixed_field_id INTEGER NOT NULL,               -- 固定項目ID（外部キー）
    display_order INTEGER DEFAULT 0,               -- プリセット内での表示順序
    field_type VARCHAR(50),                       -- 項目タイプ（例：patient_id, patient_name）
    is_visible BOOLEAN DEFAULT TRUE,               -- プリセット内での表示フラグ
    is_csv_export BOOLEAN DEFAULT TRUE,            -- プリセット内でのCSV出力フラグ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 作成日時
    CONSTRAINT pk_preset_fixed_field PRIMARY KEY (preset_id, fixed_field_id),
    CONSTRAINT fk_preset_fixed_field_preset_id FOREIGN KEY (preset_id) REFERENCES jesgo_preset(preset_id) ON DELETE CASCADE,
    CONSTRAINT fk_preset_fixed_field_fixed_field_id FOREIGN KEY (fixed_field_id) REFERENCES jesgo_fixed_field(fixed_field_id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_fixed_field_display_order ON jesgo_fixed_field(display_order);
CREATE INDEX idx_fixed_field_field_type ON jesgo_fixed_field(field_type);
CREATE INDEX idx_preset_fixed_field_preset_id ON jesgo_preset_fixed_field(preset_id);
CREATE INDEX idx_preset_fixed_field_display_order ON jesgo_preset_fixed_field(preset_id, display_order);

-- コメント追加
COMMENT ON TABLE jesgo_fixed_field IS '固定項目マスタテーブル - システム全体で共通の固定項目を管理';
COMMENT ON COLUMN jesgo_fixed_field.fixed_field_id IS '固定項目ID（主キー）';
COMMENT ON COLUMN jesgo_fixed_field.field_name IS '項目名（例：患者ID）';
COMMENT ON COLUMN jesgo_fixed_field.display_name IS '表示名（画面表示用）';
COMMENT ON COLUMN jesgo_fixed_field.field_type IS '項目タイプ（例：patient_id, patient_name）';
COMMENT ON COLUMN jesgo_fixed_field.is_visible IS '表示フラグ';
COMMENT ON COLUMN jesgo_fixed_field.is_csv_export IS 'CSV出力フラグ';
COMMENT ON COLUMN jesgo_fixed_field.display_order IS '表示順序';
COMMENT ON COLUMN jesgo_fixed_field.created_at IS '作成日時';
COMMENT ON COLUMN jesgo_fixed_field.updated_at IS '更新日時';

COMMENT ON TABLE jesgo_preset_fixed_field IS 'プリセット固定項目関連テーブル - プリセットと固定項目の関連を管理';
COMMENT ON COLUMN jesgo_preset_fixed_field.preset_id IS 'プリセットID（外部キー）';
COMMENT ON COLUMN jesgo_preset_fixed_field.fixed_field_id IS '固定項目ID（外部キー）';
COMMENT ON COLUMN jesgo_preset_fixed_field.display_order IS 'プリセット内での表示順序';
COMMENT ON COLUMN jesgo_preset_fixed_field.field_type IS '項目タイプ（例：patient_id, patient_name）';
COMMENT ON COLUMN jesgo_preset_fixed_field.is_visible IS 'プリセット内での表示フラグ';
COMMENT ON COLUMN jesgo_preset_fixed_field.is_csv_export IS 'プリセット内でのCSV出力フラグ';
COMMENT ON COLUMN jesgo_preset_fixed_field.created_at IS '作成日時';

-- 固定項目テーブルの更新日時自動更新トリガー
CREATE TRIGGER update_fixed_field_updated_at 
    BEFORE UPDATE ON jesgo_fixed_field 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 固定項目取得用ビュー
CREATE VIEW v_preset_with_fixed_fields AS
SELECT 
    p.preset_id,
    p.preset_name,
    p.preset_description,
    p.created_by,
    p.created_at,
    p.updated_by,
    p.updated_at,
    p.is_active,
    -- 固定項目の情報
    ff.fixed_field_id,
    ff.field_name as fixed_field_name,
    ff.display_name as fixed_display_name,
    ff.field_type as fixed_field_type,
    pff.field_type as preset_fixed_field_type,
    ff.is_visible as fixed_is_visible,
    ff.is_csv_export as fixed_is_csv_export,
    pff.display_order as fixed_display_order,
    pff.is_visible as preset_fixed_is_visible,
    pff.is_csv_export as preset_fixed_is_csv_export,
    -- カスタム項目の情報
    pf.field_id as custom_field_id,
    pf.field_name as custom_field_name,
    pf.display_name as custom_display_name,
    pf.field_type as custom_field_type,
    pf.is_visible as custom_is_visible,
    pf.is_csv_export as custom_is_csv_export,
    pf.schema_title,
    pf.schema_version,
    pf.display_order as custom_display_order
FROM jesgo_preset p
LEFT JOIN jesgo_preset_fixed_field pff ON p.preset_id = pff.preset_id
LEFT JOIN jesgo_fixed_field ff ON pff.fixed_field_id = ff.fixed_field_id
LEFT JOIN jesgo_preset_field pf ON p.preset_id = pf.preset_id AND pf.is_fixed = FALSE
WHERE p.is_active = TRUE
ORDER BY p.preset_id, COALESCE(pff.display_order, 999), COALESCE(pf.display_order, 999);

COMMENT ON VIEW v_preset_with_fixed_fields IS 'プリセットと固定項目・カスタム項目を統合したビュー';

