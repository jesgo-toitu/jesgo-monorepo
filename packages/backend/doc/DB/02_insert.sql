\c jesgo_db;

INSERT INTO JESGO_SEX_MASTER VALUES('F', '女性');
INSERT INTO JESGO_SEX_MASTER VALUES('M', '男性');
INSERT INTO JESGO_SEX_MASTER VALUES('N', '記載なし');
INSERT INTO JESGO_SEX_MASTER VALUES('1', 'MTF');
INSERT INTO JESGO_SEX_MASTER VALUES('2', 'FTM');

INSERT INTO JESGO_USER_ROLL VALUES(0, 'システム管理者', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);
INSERT INTO JESGO_USER_ROLL VALUES(1, 'システムオペレーター', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, TRUE, TRUE, FALSE);
INSERT INTO JESGO_USER_ROLL VALUES(100, '上級ユーザ', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, FALSE);
INSERT INTO JESGO_USER_ROLL VALUES(101, '一般ユーザ', TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE);
INSERT INTO JESGO_USER_ROLL VALUES(999, 'ログ用ユーザ', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE);
INSERT INTO JESGO_USER_ROLL VALUES(1000, '退職者', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE);

INSERT INTO JESGO_USER VALUES(0, 'log_user', 'システムログ', NULL, 999);
INSERT INTO JESGO_USER (name, display_name, password_hash, roll_id) VALUES ('systemuser', 'システム管理者', '$2b$10$D7Qt2wIzzTEkYfBuOz68OuIi1WuUMSlZT3cy4r3LL8noWaBe3QQY2', 0);
INSERT INTO jesgo_system_setting VALUES(1, '{"setting": {"hisid" : {"alignment": false,"digit": 8,"hyphen_enable" : true,"alphabet_enable" : false},"facility_information":{"name" : "","jsog_registration_number" : "","joed_registration_number" : ""}}}');
INSERT INTO jesgo_document_schema (schema_primary_id, schema_id, schema_id_string, title, subtitle, document_schema, 
uniqueness, hidden, subschema, subschema_default, child_schema, child_schema_default, base_version_major, 
valid_from, valid_until, author, version_major, version_minor, plugin_id, inherit_schema, inherit_schema_default, base_schema) 
VALUES (0, 0, NULL, 'JESGOシステム', '', '{}', TRUE, TRUE, '{}', '{}', '{}', '{}', 1, '1970-01-01', NULL, 'system', 1, 0, NULL, '{}', '{}', NULL);
