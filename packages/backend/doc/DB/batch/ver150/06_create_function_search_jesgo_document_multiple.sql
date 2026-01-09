CREATE OR REPLACE FUNCTION search_jesgo_document_multiple(
    search_json jsonb,
    case_ids integer[]
)
RETURNS TABLE(document_id integer, case_id integer) 
LANGUAGE 'sql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
WITH items AS (
    SELECT jsonb_array_elements(search_json) AS item
),
search_results AS (
    SELECT *
    FROM items i,
        LATERAL search_jesgo_document(
            ARRAY(
                SELECT (jsonb_array_elements_text(i.item->'schema_path'))::integer
            ),
            ARRAY(
                SELECT jsonb_array_elements_text(i.item->'document_key_path')
            ),
            case_ids
        ) AS result
)
SELECT DISTINCT
    document_id,
    case_id
FROM search_results
ORDER BY document_id, case_id;
$BODY$;
