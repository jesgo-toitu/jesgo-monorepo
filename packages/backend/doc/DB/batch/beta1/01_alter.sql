ALTER TABLE jesgo_document_schema ADD COLUMN IF NOT EXISTS subschema_default integer[];
ALTER TABLE jesgo_document_schema ADD COLUMN IF NOT EXISTS child_schema_default integer[];
ALTER TABLE jesgo_document_schema ADD COLUMN IF NOT EXISTS inherit_schema_default integer[];

CREATE TABLE IF NOT EXISTS jesgo_search_column
(
column_id integer,
column_type text,
column_name text, 
PRIMARY KEY ( column_id, column_type)
);

DROP VIEW IF EXISTS view_latest_schema;
CREATE VIEW view_latest_schema AS 
SELECT s.* 
FROM jesgo_document_schema s 
INNER JOIN 
(SELECT schema_id, MAX(schema_primary_id) newest_id 
 FROM jesgo_document_schema GROUP BY schema_id) g 
ON s.schema_id = g.schema_id 
WHERE s.schema_primary_id = g.newest_id;

