@echo off
REM JESGO Development Keys Generator for Windows
REM Generate RSA key pair for development

echo === JESGO Development Keys Generator ===

set KEYS_DIR=packages\backend\backendapp\config\keys
set PRIVATE_KEY=%KEYS_DIR%\private.key
set PUBLIC_KEY=%KEYS_DIR%\public.key

REM Create keys directory
echo Creating keys directory...
if not exist "%KEYS_DIR%" mkdir "%KEYS_DIR%"

REM Check if keys already exist
if exist "%PRIVATE_KEY%" (
    echo Warning: Existing private key found!
    set /p OVERWRITE="Do you want to overwrite existing keys? (y/N): "
    if /i not "%OVERWRITE%"=="y" (
        echo Key generation cancelled.
        pause
        exit /b 0
    )
    echo Removing existing keys...
    del /q "%PRIVATE_KEY%" 2>nul
    del /q "%PUBLIC_KEY%" 2>nul
)

REM Generate RSA key pair
echo Generating RSA key pair (4096 bits)...
ssh-keygen.exe -q -t rsa -b 4096 -C "JESGO Development" -N "" -f "%PRIVATE_KEY%"

if errorlevel 1 (
    echo Error: Failed to generate keys. Please ensure ssh-keygen is installed.
    echo You can install it via Git for Windows or Windows Subsystem for Linux.
    pause
    exit /b 1
)

REM Rename public key file
echo Renaming public key...
if exist "%PRIVATE_KEY%.pub" (
    move "%PRIVATE_KEY%.pub" "%PUBLIC_KEY%" >nul
) else (
    echo Error: Public key file not found.
    pause
    exit /b 1
)

echo.
echo RSA key pair generated successfully!
echo    Private key: %PRIVATE_KEY%
echo    Public key:  %PUBLIC_KEY%
echo.
echo Important:
echo    - These keys are for development only
echo    - Never commit private keys to version control  
echo    - Generate new keys for production deployment
echo.
pause