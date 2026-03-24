@echo off
set "SCRIPT_PATH=%~dp0scripts\Export-Production.ps1"
powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%SCRIPT_PATH%"
pause
