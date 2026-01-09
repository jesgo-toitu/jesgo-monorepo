CREATE OR REPLACE FUNCTION get_jesgo_document(
    document_ids integer[]
)
RETURNS TABLE(
    document_id integer,
    case_id integer,
    event_date date,
    document jsonb,
    child_documents integer[],
    schema_id integer,
    schema_primary_id integer,
    inherit_schema integer[],
    schema_major_version integer,
    registrant integer,
    created timestamp with time zone,
    last_updated timestamp with time zone,
    readonly boolean,
    deleted boolean,
    root_order integer,
    root_document_id integer
)
LANGUAGE sql
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
WITH RECURSIVE doc_tree AS (
    SELECT
        *,
        document_id AS root_document_id
    FROM jesgo_document
    WHERE document_id = ANY(document_ids)
      AND NOT deleted
    UNION ALL
    SELECT
        child.*,
        tree.root_document_id
    FROM doc_tree tree
    JOIN jesgo_document child
      ON child.document_id = ANY(tree.child_documents)
    WHERE NOT child.deleted
)
SELECT *
FROM doc_tree;
$BODY$;
