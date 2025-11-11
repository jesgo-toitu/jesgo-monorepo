UPDATE jesgo_document_schema SET subschema_default = subschema WHERE array_length(subschema_default, 1) IS NULL AND array_length(subschema, 1) IS NOT NULL;
UPDATE jesgo_document_schema SET child_schema_default = child_schema WHERE array_length(child_schema_default, 1) IS NULL AND array_length(child_schema, 1) IS NOT NULL;
UPDATE jesgo_document_schema SET inherit_schema_default = inherit_schema WHERE array_length(inherit_schema_default, 1) IS NULL AND array_length(inherit_schema, 1) IS NOT NULL;

UPDATE jesgo_document_schema SET valid_from = 'epoch', valid_until = null WHERE valid_from IS NULL;

INSERT INTO jesgo_document_schema (schema_primary_id, schema_id, schema_id_string, title, subtitle, document_schema, 
uniqueness, hidden, subschema, subschema_default, child_schema, child_schema_default, base_version_major, 
valid_from, valid_until, author, version_major, version_minor, plugin_id, inherit_schema, inherit_schema_default, base_schema) 
SELECT 0, 0, NULL, 'JESGOシステム', '', '{}', TRUE, TRUE, '{}', '{}', '{}', '{}', 1, '1970-01-01', NULL, 'system', 1, 0, NULL, '{}', '{}', NULL 
WHERE NOT EXISTS (SELECT schema_primary_id FROM jesgo_document_schema WHERE schema_primary_id = 0);

UPDATE jesgo_document_schema SET subschema = (SELECT ARRAY_AGG(DISTINCT(schema_id)) FROM view_latest_schema WHERE document_schema->>'jesgo:parentschema' like '%"/"%') WHERE schema_id = 0 AND array_length(subschema, 1) IS NULL;
UPDATE jesgo_document_schema SET subschema_default = (SELECT ARRAY_AGG(DISTINCT(schema_id)) FROM view_latest_schema WHERE document_schema->>'jesgo:parentschema' like '%"/"%') WHERE schema_id = 0 AND array_length(subschema_default, 1) IS NULL;