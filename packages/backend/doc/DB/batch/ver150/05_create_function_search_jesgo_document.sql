CREATE OR REPLACE FUNCTION search_jesgo_document(
    schema_path integer[],
    document_key_path text[],
    case_ids integer[]
)
RETURNS TABLE(document_id integer, case_id integer, schema_id integer, value text) 
LANGUAGE 'sql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
WITH RECURSIVE path_tree AS (
    SELECT
        d.document_id,
        d.case_id,
        d.schema_id,
        d.child_documents,
        d.document,
        d.document_id AS parent_document_id,
        d.schema_id AS parent_schema_id,
        1 AS depth
    FROM jesgo_document d
    WHERE d.schema_id = schema_path[1]
      AND NOT d.deleted
      AND d.case_id = ANY(case_ids)
    UNION ALL
    SELECT
        c.document_id,
        c.case_id,
        c.schema_id,
        c.child_documents,
        c.document,
        p.parent_document_id,
        p.parent_schema_id,
        p.depth + 1
    FROM path_tree p
    JOIN jesgo_document c
      ON c.document_id = ANY(p.child_documents)
     AND c.case_id = p.case_id
    WHERE c.schema_id = schema_path[p.depth + 1]
      AND NOT c.deleted
),
child_match AS (
    SELECT
        parent_document_id,
        parent_schema_id,
        case_id,
        document #>> document_key_path AS document_value_text
    FROM path_tree
    WHERE depth = array_length(schema_path, 1)
      AND document #> document_key_path IS NOT NULL
      AND NOT (
            jsonb_typeof(document #> document_key_path) = 'object'
        AND document #> document_key_path = '{}'::jsonb
      )
      AND (
            (jsonb_typeof(document #> document_key_path) = 'array'
             AND jsonb_array_length(document #> document_key_path) > 0)
         OR (jsonb_typeof(document #> document_key_path) <> 'array'
             AND document #>> document_key_path <> '')
      )
),
parent_tree AS (
    SELECT
        child.parent_document_id,
        child.parent_schema_id,
        doc.document_id,
        doc.case_id,
        1 AS depth
    FROM child_match child
    JOIN jesgo_document doc
      ON doc.document_id = child.parent_document_id
     AND doc.case_id = child.case_id
    WHERE NOT doc.deleted
    UNION ALL
    SELECT
        p.parent_document_id,
        p.parent_schema_id,
        parent_doc.document_id,
        parent_doc.case_id,
        p.depth + 1
    FROM parent_tree p
    JOIN jesgo_document parent_doc
      ON parent_doc.child_documents @> ARRAY[p.document_id]
     AND parent_doc.case_id = p.case_id
    WHERE NOT parent_doc.deleted
),
parent_tree_top AS (
    SELECT DISTINCT ON (parent_document_id)
        parent_document_id,
        document_id,
        case_id
    FROM parent_tree
    ORDER BY parent_document_id, depth DESC
),
root_schema AS (
    SELECT unnest(subschema) AS schema_id
    FROM view_latest_schema
    WHERE schema_primary_id = 0
      AND schema_id = 0
)
SELECT
    CASE
        WHEN child.parent_schema_id IN (SELECT schema_id FROM root_schema)
            THEN child.parent_document_id
        ELSE pt.document_id
    END AS document_id,
    CASE
        WHEN child.parent_schema_id IN (SELECT schema_id FROM root_schema)
            THEN child.case_id
        ELSE pt.case_id
    END AS case_id,
    child.parent_schema_id AS schema_id,
    child.document_value_text AS value
FROM child_match child
LEFT JOIN parent_tree_top pt
  ON pt.parent_document_id = child.parent_document_id;
$BODY$;
