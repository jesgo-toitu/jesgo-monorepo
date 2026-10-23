@echo off
rem ***************************************************************************************
rem JESGO データベース更新バッチ
rem Ver 1.6.0
rem テーブル更新
rem ***************************************************************************************

echo JESGOデータベースを更新します
call C:\jesgo\scripts\env_db.bat

rem テーブル更新（利用者ごとの保存確認の設定）
set SQLFILE=01_alter_jesgo_user.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\01_alter_jesgo_user.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\01_alter_jesgo_user.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo jesgo_userテーブル更新成功
)

rem テーブル更新（プリセット機能更新権限）
set SQLFILE=02_alter_jesgo_user_roll.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -f .\02_alter_jesgo_user_roll.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -f .\02_alter_jesgo_user_roll.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo jesgo_user_rollテーブル更新成功
)
