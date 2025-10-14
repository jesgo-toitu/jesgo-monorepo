ALTER TABLE jesgo_document ADD COLUMN IF NOT EXISTS created timestamp with time zone;

UPDATE jesgo_document jd
  SET created = (
    SELECT valid_from FROM jesgo_document_schema js
    WHERE js.schema_primary_id = jd.schema_primary_id
  ) 
  WHERE jd.created IS NULL;