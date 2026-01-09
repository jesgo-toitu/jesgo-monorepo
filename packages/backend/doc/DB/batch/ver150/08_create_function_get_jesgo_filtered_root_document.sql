CREATE OR REPLACE FUNCTION get_jesgo_filtered_root_document(
	document_ids_groups jsonb
)
RETURNS TABLE(root_document_id integer) 
LANGUAGE 'sql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
WITH filter_docs AS (
    SELECT (jsonb_array_elements_text(doc_id_array))::integer AS document_id,
           filter_index
    FROM jsonb_array_elements(document_ids_groups) WITH ORDINALITY AS t(doc_id_array, filter_index)
),
parent_tree AS (
    WITH RECURSIVE pt AS (
        SELECT
            d.document_id,
            d.document_id AS current_document_id,
            d.document_id AS root_document_id,
            d.child_documents,
            1 AS depth,
            fd.filter_index
        FROM jesgo_document d
        JOIN filter_docs fd ON d.document_id = fd.document_id
        WHERE NOT d.deleted
        UNION ALL
        SELECT
            pt.document_id,
            parent_doc.document_id AS current_document_id,
            parent_doc.document_id AS root_document_id,
            parent_doc.child_documents,
            pt.depth + 1,
            pt.filter_index
        FROM pt
        JOIN jesgo_document parent_doc
          ON parent_doc.child_documents @> ARRAY[pt.current_document_id]
         AND NOT parent_doc.deleted
    )
    SELECT document_id, root_document_id, filter_index
    FROM pt
),
root_counts AS (
    SELECT root_document_id,
           COUNT(DISTINCT filter_index) AS filter_count
    FROM parent_tree
    GROUP BY root_document_id
),
filter_total AS (
    SELECT jsonb_array_length(document_ids_groups) AS total_filters
)
SELECT rc.root_document_id
FROM root_counts rc
JOIN filter_total ft ON true
WHERE rc.filter_count = ft.total_filters;
$BODY$;
