-- /schema/OV/stagingのtitleでTMNの表記が抜けていたのをupdateで対応する
UPDATE jesgo_document_schema SET document_schema = replace(document_schema::text, 'TMN', 'TNM')::json
WHERE schema_id_string = '/schema/OV/staging';