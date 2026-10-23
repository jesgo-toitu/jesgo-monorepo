@echo on

pushd %~dp0

cd .\beta1
call DB更新.bat
cd ..\

cd .\beta2
call DB更新.bat
cd ..\

cd .\beta3
call DB更新.bat
cd ..\

cd .\beta4
call DB更新.bat
cd ..\

cd .\ver111
call DB更新.bat
cd ..\

cd .\ver120
call DB更新.bat
cd ..\

cd .\ver130
call DB更新.bat
cd ..\

cd .\ver140
call DB更新.bat
cd ..\

cd .\ver150
call DB更新.bat
cd ..\

cd .\ver160
call DB更新.bat
cd ..\
