CREATE TABLE IF NOT EXISTS jesgo_plugin
(
    plugin_id serial NOT NULL,
    plugin_name text COLLATE pg_catalog."default" NOT NULL,
    plugin_version text COLLATE pg_catalog."default",
    script_text text COLLATE pg_catalog."default",
    target_schema_id integer[],
    target_schema_id_string text COLLATE pg_catalog."default",
    all_patient boolean NOT NULL DEFAULT false,
    update_db boolean NOT NULL DEFAULT false,
    attach_patient_info boolean NOT NULL DEFAULT false,
    show_upload_dialog boolean DEFAULT true,
    filter_schema_query text COLLATE pg_catalog."default",
    explain text COLLATE pg_catalog."default",
    deleted boolean NOT NULL DEFAULT false,
    registrant integer,
    last_updated timestamp with time zone,
    CONSTRAINT jesgo_plugin_pkey PRIMARY KEY (plugin_id, plugin_name),
    CONSTRAINT jesgo_plugin_uniquekey UNIQUE (plugin_name)
)