UPDATE jesgo_document_schema SET subschema_default = subschema WHERE array_length(subschema_default, 1) IS NULL AND array_length(subschema, 1) IS NOT NULL;
UPDATE jesgo_document_schema SET child_schema_default = child_schema WHERE array_length(child_schema_default, 1) IS NULL AND array_length(child_schema, 1) IS NOT NULL;
UPDATE jesgo_document_schema SET inherit_schema_default = inherit_schema WHERE array_length(inherit_schema_default, 1) IS NULL AND array_length(inherit_schema, 1) IS NOT NULL;

UPDATE jesgo_document_schema SET valid_from = 'epoch', valid_until = null WHERE valid_from IS NULL;

INSERT INTO jesgo_document_schema (schema_primary_id, schema_id, schema_id_string, title, subtitle, document_schema, 
uniqueness, hidden, subschema, subschema_default, child_schema, child_schema_default, base_version_major, 
valid_from, valid_until, author, version_major, version_minor, plugin_id, inherit_schema, inherit_schema_default, base_schema) 
SELECT 0, 0, NULL, 'JESGOシステム', '', '{}', TRUE, TRUE, '{}', '{}', '{}', '{}', 1, '1970-01-01', NULL, 'system', 1, 0, NULL, '{}', '{}', NULL 
WHERE NOT EXISTS (SELECT schema_primary_id FROM jesgo_document_schema WHERE schema_primary_id = 0);

-- ルートスキーマ（jesgo:parentschema に "/" を持つスキーマ）を、JESGOシステム（schema_id = 0）の
-- サブスキーマとして設定する。
-- ★ COALESCE は必須である（v1.6.0 で追加）。
--    スキーマが 1 件も登録されていない新規DBでは副問い合わせの ARRAY_AGG が NULL を返すため、
--    COALESCE が無いと subschema / subschema_default が NULL で上書きされる。
--    NULL になるとスキーマツリー取得（GET /gettree）が
--    「schema.subschema is not iterable」で失敗し、スキーマ管理画面が開けなくなる。
--    空配列 '{}' を明示的に残すことで、新規DBでも「ルートスキーマが 0 件」という正しい状態になる。
-- ★ 冪等性: WHERE 条件の array_length(..., 1) IS NULL は NULL と空配列 '{}' の両方に合致するため、
--    本UPDATEは (a) 新規DB、(b) 本不具合で既に NULL になってしまったDB、の双方で同じ結果に収束する。
--    サブスキーマが 1 件以上設定済みの既存DBは WHERE に合致しないため、値は一切変更されない。
UPDATE jesgo_document_schema SET subschema = COALESCE((SELECT ARRAY_AGG(DISTINCT(schema_id)) FROM view_latest_schema WHERE document_schema->>'jesgo:parentschema' like '%"/"%'), '{}') WHERE schema_id = 0 AND array_length(subschema, 1) IS NULL;
UPDATE jesgo_document_schema SET subschema_default = COALESCE((SELECT ARRAY_AGG(DISTINCT(schema_id)) FROM view_latest_schema WHERE document_schema->>'jesgo:parentschema' like '%"/"%'), '{}') WHERE schema_id = 0 AND array_length(subschema_default, 1) IS NULL;