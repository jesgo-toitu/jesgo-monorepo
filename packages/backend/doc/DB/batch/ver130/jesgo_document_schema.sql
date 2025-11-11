UPDATE public.jesgo_document_schema SET valid_until = CURRENT_DATE - INTERVAL '1 day'
WHERE schema_id_string = '/schema/common/root' AND (valid_until is null OR CURRENT_DATE - INTERVAL '1 day' < valid_until)
;