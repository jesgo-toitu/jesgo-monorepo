CREATE TABLE IF NOT EXISTS jesgo_plugin_group
(
    plugin_group_id integer PRIMARY KEY,
    plugin_group_name text NOT NULL,
    deleted boolean,
    disabled boolean DEFAULT false,
    last_updated timestamp with time zone
);