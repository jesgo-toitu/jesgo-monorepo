-- =============================================
-- サンプルデータ挿入
-- バージョン: 1.5.0
-- 作成日: 2025-10-22
-- 説明: プリセット管理のサンプルデータを挿入
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

-- デフォルトプリセットの作成
INSERT INTO jesgo_preset (preset_name, preset_description, created_by) VALUES 
('デフォルトプリセット', 'システム標準のプリセット', 'system');

-- 固定項目マスタデータの挿入
INSERT INTO jesgo_fixed_field (field_name, display_name, field_type, is_visible, is_csv_export, display_order) VALUES 
('患者ID', '患者ID', 'patient_id', TRUE, TRUE, 1),
('患者名', '患者名', 'patient_name', TRUE, TRUE, 2),
('年齢', '年齢', 'patient_age', TRUE, TRUE, 3),
('初回治療開始日', '初回治療開始日', 'initial_treatment_date', TRUE, TRUE, 4),
('診断', '診断', 'last_update_date', TRUE, TRUE, 5),
('進行期', '進行期', 'diagnosis', TRUE, TRUE, 6),
('ステータス', 'ステータス', 'stage', TRUE, TRUE, 7),
('最終更新日', '最終更新日', 'status', TRUE, TRUE, 8);

-- デフォルトプリセットに固定項目を関連付け
INSERT INTO jesgo_preset_fixed_field (preset_id, fixed_field_id, display_order, field_type, is_visible, is_csv_export) VALUES 
(1, 1, 1, 'patient_id', TRUE, TRUE),  -- 患者ID
(1, 2, 2, 'patient_name', TRUE, TRUE),  -- 患者名
(1, 3, 3, 'patient_age', TRUE, TRUE),  -- 年齢
(1, 4, 4, 'initial_treatment_date', TRUE, TRUE),  -- 初回治療開始日
(1, 5, 5, 'diagnosis', TRUE, TRUE),  -- 診断
(1, 6, 6, 'stage', TRUE, TRUE),  -- 進行期
(1, 7, 7, 'status', TRUE, TRUE),  -- ステータス
(1, 8, 8, 'last_update_date', TRUE, TRUE);  -- 最終更新日

-- デフォルトプリセットの固定項目をプリセット項目テーブルにも挿入（後方互換性のため）
INSERT INTO jesgo_preset_field (preset_id, field_name, display_name, field_type, is_visible, is_csv_export, is_csv_header_display_name, schema_title, schema_version, is_fixed, display_order) VALUES 
(1, '患者ID', '患者ID', 'string', TRUE, TRUE, FALSE, '-', '-', TRUE, 1),
(1, '患者名', '患者名', 'string', TRUE, TRUE, FALSE, '-', '-', TRUE, 2),
(1, '年齢', '年齢', 'number', TRUE, TRUE, FALSE, '-', '-', TRUE, 3),
(1, '初回治療開始日', '初回治療開始日', 'date', TRUE, TRUE, FALSE, '-', '-', TRUE, 4),
(1, '診断', '診断', 'string', TRUE, TRUE, FALSE, '-', '-', TRUE, 5),
(1, '進行期', '進行期', 'string', TRUE, TRUE, FALSE, '-', '-', TRUE, 6),
(1, 'ステータス', 'ステータス', 'status', TRUE, TRUE, FALSE, '-', '-', TRUE, 7),
(1, '最終更新日', '最終更新日', 'date', TRUE, TRUE, FALSE, '-', '-', TRUE, 8);

