@echo off
rem ***************************************************************************************
rem JESGO データベース復元バッチ
rem Ver 1.0.0
rem DB更新バッチ実行時のバックアップから復元
rem ***************************************************************************************

pushd %~DP0

rem ★復元元フォルダパス
SET SRCFOLDERPATH=.\

if not exist %SRCFOLDERPATH%\data (
 echo 復元元フォルダパスが見つかりません。[%SRCFOLDERPATH%]
 pause
 EXIT
)

echo JESGOデータベースを復元します

SET /P ANSWER="現在のデータベースは削除されます。復元を実行しますか？(Y/N)"

IF /i {%ANSWER%}=={y} (goto:yes)
IF /i {%ANSWER%}=={yes} (goto:yes)

EXIT

:yes

call C:\jesgo\scripts\env.bat
call C:\jesgo\scripts\env_db.bat

rem データベース停止
%INSTALL_DB_FOLDER%\bin\pg_ctl.exe -D %INSTALL_DB_FOLDER%/data -l ./log/db.log stop
echo データベースサーバー停止

echo DB削除...
del /S /Q %INSTALL_DB_FOLDER%\data

rem JESGOデータベースを復元
echo DB復元中...
xcopy %SRCFOLDERPATH%\data %INSTALL_DB_FOLDER%\data /Y /I /E /K

IF %errorlevel% neq 0 (

  ECHO %date% %time:~0,8% 実行に失敗しました  ErrorCode=%errorlevel% >> %~DP0\log/psql_log.txt
) ELSE (
  echo データベース復元成功
)

pause
