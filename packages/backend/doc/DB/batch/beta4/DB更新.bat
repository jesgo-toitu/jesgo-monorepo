@echo off
rem ***************************************************************************************
rem JESGO データベース更新バッチ
rem Ver 1.0.4
rem テーブル更新
rem データ更新
rem ***************************************************************************************

echo JESGOデータベースを更新します
call C:\jesgo\scripts\env_db.bat

rem テーブル更新
call :psqlroutine alter_jesgo_document.sql jesgo_documentテーブル更新成功
call :psqlroutine alter_jesgo_plugin.sql プラグインテーブル更新成功
call :psqlroutine update_jesgo_document_schema.sql jesgo_document_schemaテーブル更新成功
call :psqlroutine fix_not_object_document_schema.sql 非オブジェクトドキュメントスキーマ更新成功

call repair_schema.bat

pause

exit /b






rem SQL実行サブルーチン
:psqlroutine
C:\jesgo\pgsql\bin\psql.exe -f .\%1 -U postgres -d jesgo_db
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました ErrorCode=%errorlevel% FileName「%1」 >> %~DP0psql_log.txt

) ELSE (
  echo %2
)
exit /b