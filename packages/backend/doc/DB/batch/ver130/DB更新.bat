@echo off
rem ***************************************************************************************
rem JESGO データベース更新バッチ
rem Ver 1.1.1
rem テーブル更新
rem テーブル作成
rem データ更新
rem ***************************************************************************************

echo JESGOデータベースを更新します
call C:\jesgo\scripts\env_db.bat

rem データ更新
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\fix_schema_variation.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\insert_jesgo_plugin_group.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo データ更新成功
)

rem スキーマ更新
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\jesgo_document_schema.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\update_jesgo_plugin.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo スキーマ更新成功
)

rem プラグイン更新
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\update_plugins.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\update_plugins.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo プラグイン更新成功
)
