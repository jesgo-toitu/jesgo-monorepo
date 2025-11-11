# JESGO Development Keys Generator for Windows PowerShell
# RSA鍵ペアを生成するPowerShellスクリプト

Write-Host "=== JESGO Development Keys Generator ===" -ForegroundColor Green

$keysDir = "packages\backend\backendapp\config\keys"
$privateKey = "$keysDir\private.key"
$publicKey = "$keysDir\public.key"

# keysディレクトリを作成
Write-Host "Creating keys directory..." -ForegroundColor Yellow
if (!(Test-Path $keysDir)) {
    New-Item -ItemType Directory -Path $keysDir -Force | Out-Null
}

# 既存の鍵があるかチェック
if (Test-Path $privateKey) {
    Write-Host "Warning: Existing private key found!" -ForegroundColor Red
    $overwrite = Read-Host "Do you want to overwrite existing keys? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Key generation cancelled." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Removing existing keys..." -ForegroundColor Yellow
    Remove-Item $privateKey -Force -ErrorAction SilentlyContinue
    Remove-Item $publicKey -Force -ErrorAction SilentlyContinue
}

# RSA鍵ペア生成
Write-Host "Generating RSA key pair (4096 bits)..." -ForegroundColor Yellow
try {
    ssh-keygen -q -t rsa -b 4096 -C "JESGO_DEV_KEY" -N '""' -f $privateKey
    if ($LASTEXITCODE -ne 0) {
        throw "ssh-keygen failed"
    }
} catch {
    Write-Host "Error: Failed to generate keys. Please ensure ssh-keygen is installed." -ForegroundColor Red
    Write-Host "You can install it via Git for Windows or Windows Subsystem for Linux." -ForegroundColor Red
    exit 1
}

# 公開鍵をリネーム
Write-Host "Renaming public key..." -ForegroundColor Yellow
$pubFile = "$privateKey.pub"
if (Test-Path $pubFile) {
    Move-Item $pubFile $publicKey -Force
} else {
    Write-Host "Error: Public key file not found." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "RSA key pair generated successfully!" -ForegroundColor Green
Write-Host "   Private key: $privateKey" -ForegroundColor Cyan
Write-Host "   Public key:  $publicKey" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important:" -ForegroundColor Yellow
Write-Host "   - These keys are for development only" -ForegroundColor White
Write-Host "   - Never commit private keys to version control" -ForegroundColor White
Write-Host "   - Generate new keys for production deployment" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"