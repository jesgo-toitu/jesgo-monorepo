-- スキーマの修正(同等)
-- 実施手術スキーマの更新
UPDATE jesgo_document_schema
SET
  document_schema = (jsonb_set((document_schema::jsonb - 'items'), '{type}', '"object"') ||  '{"properties":{"実施手術":{"type":"array","description": "主たる術式を最初の行に配置してください.","items":{"$ref": "#/$defs/procedure"}}}}')::json
WHERE
  schema_id_string = '/schema/treatment/operation_procedures'
  AND
  (document_schema ->> 'type') = 'array';

-- PerformanceStatusスキーマの更新(oneOf)
UPDATE jesgo_document_schema
SET document_schema = 
jsonb_set(document_schema::jsonb - 'oneOf', '{"type"}', '"object"')
||
jsonb_set('{"properties":{"PerformanceStatus":{"type":"integer","description":"ECOGのPerformance Status"}}}'::jsonb, '{"properties", "PerformanceStatus", "oneOf"}',
          regexp_replace(
            replace(document_schema::jsonb->>'oneOf', '<BR/>', ''),
            '{(?:"const": (\d)), (?:"title": "([^"]+)")}', '{"const":\1, "title": "\1: \2"}',
            'g'
          )::jsonb
 ) 
 WHERE
  schema_id_string in ('/schema/evaluation/performance_status', '/schema/evaluations/performance_status')
   AND
   (document_schema->>'type') = 'integer'
   AND
   (document_schema->>'oneOf') IS NOT NULL;

-- PerformanceStatusスキーマの更新(anyOf)
UPDATE jesgo_document_schema
SET document_schema = 
jsonb_set(document_schema::jsonb - 'anyOf', '{"type"}', '"object"')
||
jsonb_set('{"properties":{"PerformanceStatus":{"type":"integer","description":"ECOGのPerformance Status"}}}'::jsonb, '{"properties", "PerformanceStatus", "anyOf"}',
          regexp_replace(
            replace(document_schema::jsonb->>'anyOf', '<BR/>', ''),
            '{(?:"const": (\d)), (?:"title": "([^"]+)")}', '{"const":\1, "title": "\1: \2"}',
            'g'
          )::jsonb
 ) 
 WHERE
  schema_id_string in ('/schema/evaluation/performance_status', '/schema/evaluations/performance_status')
   AND
   (document_schema->>'type') = 'integer'
   AND
   (document_schema->>'anyOf') IS NOT NULL;

-- ドキュメントの修正
UPDATE jesgo_document
SET document =  jsonb_set('{"実施手術": []}'::jsonb, '{実施手術}', document)
WHERE
  schema_id IN (SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string = '/schema/treatment/operation_procedures')
  AND
  jsonb_typeof(document) = 'array';

UPDATE jesgo_document
SET document =  jsonb_set('{}', '{"PerformanceStatus"}', document)
WHERE
  schema_id in (SELECT schema_id FROM jesgo_document_schema WHERE schema_id_string in ('/schema/evaluation/performance_status', '/schema/evaluations/performance_status'))
AND
  jsonb_typeof(document) = 'number';