-- jesgo_dbデータベースが存在しない場合のみ作成
SELECT 'CREATE DATABASE jesgo_db ENCODING ''UTF-8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jesgo_db')\gexec

-- データベースに接続
\c jesgo_db

CREATE TABLE IF NOT EXISTS jesgo_sex_master
(
sex_identifier varchar(1) PRIMARY KEY,
sex text NOT NULL
);

CREATE TABLE IF NOT EXISTS jesgo_user_roll
(
roll_id integer PRIMARY KEY,
title text NOT NULL,
login boolean,
view boolean,
add boolean,
edit boolean,
remove boolean,
data_manage boolean,
system_manage boolean,
plugin_registerable boolean default false,
plugin_executable_select boolean default false,
plugin_executable_update boolean default false,
deleted boolean default false
);

CREATE TABLE IF NOT EXISTS jesgo_user
(
user_id serial PRIMARY KEY,
name text UNIQUE NOT NULL,
display_name text,
password_hash text,
roll_id integer NOT NULL,
deleted boolean DEFAULT FALSE,
FOREIGN KEY(roll_id) REFERENCES jesgo_user_roll(roll_id)
);

CREATE TABLE IF NOT EXISTS jesgo_case
(
case_id serial PRIMARY KEY,
name text,
date_of_birth date NOT NULL,
date_of_death date ,
sex varchar(1) DEFAULT 'F',
HIS_id text UNIQUE NOT NULL,
decline boolean DEFAULT FALSE,
registrant integer,
last_updated timestamptz NOT NULL,
deleted boolean DEFAULT FALSE,
FOREIGN KEY(sex) REFERENCES jesgo_sex_master(sex_identifier),
FOREIGN KEY(registrant) REFERENCES jesgo_user(user_id)
);

CREATE TABLE IF NOT EXISTS jesgo_document_schema
(
schema_primary_id serial PRIMARY KEY,
schema_id integer,
schema_id_string text,
title text,
subtitle text,
document_schema JSON NOT NULL,
uniqueness boolean DEFAULT FALSE,
hidden boolean,
subschema integer[],
subschema_default integer[],
child_schema integer[],
child_schema_default integer[],
base_version_major integer,
valid_from date DEFAULT '1970-01-01',
valid_until date,
author text NOT NULL,
version_major integer NOT NULL,
version_minor integer NOT NULL,
plugin_id integer,
inherit_schema integer[],
inherit_schema_default integer[],
base_schema integer DEFAULT NULL
-- TODO★設定テーブル未作成
-- FOREIGN KEY(plugin_id) REFERENCES jesgo_setting(plugin_id)
);

CREATE TABLE IF NOT EXISTS jesgo_document
(
document_id serial PRIMARY KEY,
case_id integer NOT NULL,
event_date date,
document JSONB NOT NULL,
child_documents integer[],
schema_id integer NOT NULL,
schema_primary_id integer NOT NULL,
inherit_schema integer[],
schema_major_version integer,
registrant integer,
created timestamp with time zone,
last_updated timestamptz NOT NULL,
readonly boolean DEFAULT FALSE,
deleted boolean DEFAULT FALSE,
root_order integer NOT NULL DEFAULT -1,
FOREIGN KEY(case_id) REFERENCES jesgo_case(case_id),
-- 配列の中は外部キー制約がきかない
-- FOREIGN KEY(child_documents) REFERENCES jesgo_document(document_id),
-- 複合主キー扱いなので外部キー制約がきかない
-- FOREIGN KEY(schema_id) REFERENCES jesgo_document_schema(schema_id),
FOREIGN KEY(registrant) REFERENCES jesgo_user(user_id)
);

CREATE TABLE IF NOT EXISTS jesgo_document_icon
(
title text PRIMARY KEY,
icon text
);

CREATE TABLE IF NOT EXISTS jesgo_log
(
log_id serial PRIMARY KEY,
user_id integer,
body text,
created timestamptz NOT NULL,
FOREIGN KEY(user_id) REFERENCES jesgo_user(user_id)
);

CREATE TABLE IF NOT EXISTS jesgo_system_setting
(
setting_id integer PRIMARY KEY,
value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS jesgo_search_column
(
column_id integer,
column_type text,
column_name text, 
PRIMARY KEY ( column_id, column_type)
);

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
    deleted boolean,
    disabled boolean DEFAULT false,
    registrant integer,
    last_updated timestamp with time zone,
    CONSTRAINT jesgo_plugin_pkey PRIMARY KEY (plugin_id, plugin_name),
    CONSTRAINT jesgo_plugin_uniquekey UNIQUE (plugin_name)
);


CREATE VIEW view_latest_schema AS 
SELECT s.* 
FROM jesgo_document_schema s 
INNER JOIN 
(SELECT schema_id, MAX(schema_primary_id) newest_id 
 FROM jesgo_document_schema GROUP BY schema_id) g 
ON s.schema_id = g.schema_id 
WHERE s.schema_primary_id = g.newest_id;
