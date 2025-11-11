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

rem テーブル更新
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\alter_jesgo_plugin.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\alter_jesgo_plugin.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo テーブル更新成功
)

rem テーブル作成
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\create_jesgo_plugin_group.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\create_jesgo_plugin_group.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo テーブル作成成功
)

rem データ更新
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\insert_jesgo_plugin_group.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\insert_jesgo_plugin_group.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo データ更新成功
)

rem データ更新2
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\update_jesgo_plugin.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\update_jesgo_plugin.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo データ更新2成功
)
