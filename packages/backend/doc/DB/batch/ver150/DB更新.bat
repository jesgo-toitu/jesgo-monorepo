@echo off
rem ***************************************************************************************
rem JESGO データベース更新バッチ
rem Ver 1.5.0
rem テーブル作成
rem データ作成
rem テーブル更新
rem 関数作成
rem ***************************************************************************************

echo JESGOデータベースを更新します
call C:\jesgo\scripts\env_db.bat

rem ver150 の SQL は再実行に対応していない（2 回目はテーブル・初期データが既にあるためエラーになる）。
rem 途中で止めて変更を取り消すため、各 SQL を 1 つのトランザクションで実行し、エラーで中断する（-1 -v ON_ERROR_STOP=1）。
rem 00_drop_tables.sql は既存のプリセットを削除するため、このバッチでは実行しない。

rem テーブル作成（プリセット）
set SQLFILE=01_create_preset_tables.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\01_create_preset_tables.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\01_create_preset_tables.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo プリセットテーブル作成成功
)

rem テーブル作成（固定項目）
set SQLFILE=02_create_fixed_field_tables.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\02_create_fixed_field_tables.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\02_create_fixed_field_tables.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo 固定項目テーブル作成成功
)

rem データ作成（デフォルトプリセット・固定項目）
set SQLFILE=03_insert_sample_data.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\03_insert_sample_data.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\03_insert_sample_data.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo デフォルトプリセット作成成功
)

rem テーブル更新（プリセットの制約）
set SQLFILE=04_fix_constraints.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\04_fix_constraints.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\04_fix_constraints.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo プリセットテーブル更新成功
)

rem 関数作成（search_jesgo_document）
set SQLFILE=05_create_function_search_jesgo_document.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\05_create_function_search_jesgo_document.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\05_create_function_search_jesgo_document.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo 関数作成成功（search_jesgo_document）
)

rem 関数作成（search_jesgo_document_multiple）
set SQLFILE=06_create_function_search_jesgo_document_multiple.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\06_create_function_search_jesgo_document_multiple.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\06_create_function_search_jesgo_document_multiple.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo 関数作成成功（search_jesgo_document_multiple）
)

rem 関数作成（get_jesgo_document）
set SQLFILE=07_create_function_get_jesgo_document.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\07_create_function_get_jesgo_document.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\07_create_function_get_jesgo_document.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo 関数作成成功（get_jesgo_document）
)

rem 関数作成（get_jesgo_filtered_root_document）
set SQLFILE=08_create_function_get_jesgo_filtered_root_document.sql
if exist C:\jesgo\pgsql\bin\psql.exe (
	C:\jesgo\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\08_create_function_get_jesgo_filtered_root_document.sql -U postgres -d jesgo_db
) else (
	C:\jesgo\postgres\pgsql\bin\psql.exe -1 -v ON_ERROR_STOP=1 -f .\08_create_function_get_jesgo_filtered_root_document.sql -U postgres -d jesgo_db
)
IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel%^
  FileName「%SQLFILE%」 >> %~DP0\log/psql_log.txt

) ELSE (
  echo 関数作成成功（get_jesgo_filtered_root_document）
)
