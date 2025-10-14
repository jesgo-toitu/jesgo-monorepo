# JESGO Windows Deployment Script
# Node.js 20 + PostgreSQL 14 環境向け

param(
    [string]$Environment = "production",
    [string]$DeployPath = "C:\jesgo",
    [string]$ServiceName = "JESGO",
    [switch]$SkipBuild = $false,
    [switch]$SkipDatabase = $false,
    [switch]$InstallServices = $false
)

# エラー時に停止
$ErrorActionPreference = "Stop"

Write-Host "=== JESGO Windows Deployment Script ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Yellow
Write-Host "Service Name: $ServiceName" -ForegroundColor Yellow

# Node.js バージョンチェック
Write-Host "`n1. Checking Node.js version..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
    
    # Node.js 20以上かチェック
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 20) {
        throw "Node.js version 20 or higher is required. Current version: $nodeVersion"
    }
} catch {
    Write-Host "Error: Node.js not found or version check failed" -ForegroundColor Red
    Write-Host "Please install Node.js 20 or higher from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# PostgreSQL バージョンチェック
if (-not $SkipDatabase) {
    Write-Host "`n2. Checking PostgreSQL..." -ForegroundColor Cyan
    try {
        $pgVersion = psql --version
        Write-Host "PostgreSQL version: $pgVersion" -ForegroundColor Green
    } catch {
        Write-Host "Warning: PostgreSQL not found in PATH" -ForegroundColor Yellow
        Write-Host "Please ensure PostgreSQL 14 is installed and accessible" -ForegroundColor Yellow
    }
}

# デプロイディレクトリの準備
Write-Host "`n3. Preparing deployment directory..." -ForegroundColor Cyan
if (Test-Path $DeployPath) {
    Write-Host "Backing up existing deployment..." -ForegroundColor Yellow
    $backupPath = "$DeployPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -Path $DeployPath -Destination $backupPath -Recurse -Force
    Write-Host "Backup created at: $backupPath" -ForegroundColor Green
}

# 新しいデプロイディレクトリ作成
New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
Write-Host "Deploy directory prepared: $DeployPath" -ForegroundColor Green

# ビルド実行
if (-not $SkipBuild) {
    Write-Host "`n4. Building application..." -ForegroundColor Cyan
    
    # 依存関係のインストール
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm ci --workspaces --production=false
    
    # ビルド実行
    Write-Host "Building frontend..." -ForegroundColor Yellow
    npm run build --workspace=packages/frontend
    
    Write-Host "Building backend..." -ForegroundColor Yellow
    npm run build --workspace=packages/backend
    
    Write-Host "Build completed successfully" -ForegroundColor Green
}

# ファイルのコピー
Write-Host "`n5. Copying files to deployment directory..." -ForegroundColor Cyan

# Backend files
$backendDest = "$DeployPath\backend"
New-Item -Path $backendDest -ItemType Directory -Force | Out-Null
Copy-Item -Path "packages\backend\backendapp" -Destination $backendDest -Recurse -Force
Copy-Item -Path "packages\backend\package.json" -Destination $backendDest -Force
Copy-Item -Path "packages\backend\doc\DB\*.sql" -Destination $backendDest -Force -ErrorAction SilentlyContinue

# Frontend files
$frontendDest = "$DeployPath\frontend"
New-Item -Path $frontendDest -ItemType Directory -Force | Out-Null
Copy-Item -Path "packages\frontend\dist\*" -Destination $frontendDest -Recurse -Force
Copy-Item -Path "packages\frontend\package.json" -Destination $frontendDest -Force

# Configuration files
Copy-Item -Path "package.json" -Destination $DeployPath -Force
Copy-Item -Path "scripts\windows-service.js" -Destination $DeployPath -Force -ErrorAction SilentlyContinue

Write-Host "Files copied successfully" -ForegroundColor Green

# Production dependencies のインストール
Write-Host "`n6. Installing production dependencies..." -ForegroundColor Cyan
Set-Location $DeployPath
npm ci --workspaces --only=production

Set-Location $backendDest
npm ci --only=production

Write-Host "Production dependencies installed" -ForegroundColor Green

# データベースセットアップ
if (-not $SkipDatabase) {
    Write-Host "`n7. Setting up database..." -ForegroundColor Cyan
    
    $dbName = "jesgo_db"
    $dbUser = "postgres"
    
    Write-Host "Creating database if not exists..." -ForegroundColor Yellow
    try {
        # データベース作成（存在しない場合）
        psql -U $dbUser -c "CREATE DATABASE $dbName;" 2>$null
        
        # スキーマ実行
        if (Test-Path "$backendDest\01_create.sql") {
            Write-Host "Executing database schema..." -ForegroundColor Yellow
            psql -U $dbUser -d $dbName -f "$backendDest\01_create.sql"
        }
        
        # 初期データ投入
        if (Test-Path "$backendDest\02_insert.sql") {
            Write-Host "Inserting initial data..." -ForegroundColor Yellow
            psql -U $dbUser -d $dbName -f "$backendDest\02_insert.sql"
        }
        
        Write-Host "Database setup completed" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Database setup failed. Please run manually:" -ForegroundColor Yellow
        Write-Host "  psql -U postgres -c `"CREATE DATABASE jesgo_db;`"" -ForegroundColor Gray
        Write-Host "  psql -U postgres -d jesgo_db -f $backendDest\01_create.sql" -ForegroundColor Gray
        Write-Host "  psql -U postgres -d jesgo_db -f $backendDest\02_insert.sql" -ForegroundColor Gray
    }
}

# Windows サービス設定
if ($InstallServices) {
    Write-Host "`n8. Installing Windows services..." -ForegroundColor Cyan
    
    # Backend service
    try {
        Set-Location $backendDest
        npm run install-service
        Write-Host "Backend service installed: $ServiceName-Backend" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Backend service installation failed" -ForegroundColor Yellow
    }
    
    # Frontend service (if using Node.js server)
    try {
        Set-Location $frontendDest
        if (Test-Path "package.json") {
            npm run install-service
            Write-Host "Frontend service installed: $ServiceName-Frontend" -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Frontend service installation failed" -ForegroundColor Yellow
    }
}

# 設定ファイルの更新
Write-Host "`n9. Updating configuration files..." -ForegroundColor Cyan

$configPath = "$backendDest\backendapp\config\config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    $config.host = "localhost"
    $config.port = 5432
    $config.database = "jesgo_db"
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
    Write-Host "Backend configuration updated" -ForegroundColor Green
}

# 起動スクリプト作成
Write-Host "`n10. Creating startup scripts..." -ForegroundColor Cyan

# Backend startup script
$backendStartScript = @"
@echo off
cd /d "$backendDest"
echo Starting JESGO Backend...
node backendapp/app.js
pause
"@
Set-Content -Path "$DeployPath\start-backend.bat" -Value $backendStartScript

# Frontend startup script (IIS用の設定例)
$frontendStartScript = @"
@echo off
echo JESGO Frontend files are located in: $frontendDest
echo Please configure IIS or another web server to serve these files
echo Backend API should be accessible at: http://localhost:5000
pause
"@
Set-Content -Path "$DeployPath\start-frontend.bat" -Value $frontendStartScript

Write-Host "Startup scripts created" -ForegroundColor Green

Write-Host "`n=== Deployment Completed Successfully ===" -ForegroundColor Green
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Yellow
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Configure PostgreSQL connection in: $configPath" -ForegroundColor White
Write-Host "2. Start backend: $DeployPath\start-backend.bat" -ForegroundColor White
Write-Host "3. Configure web server (IIS/Apache/Nginx) to serve: $frontendDest" -ForegroundColor White
if ($InstallServices) {
    Write-Host "4. Services installed - check Windows Services management console" -ForegroundColor White
}

Write-Host "`nFor manual service management:" -ForegroundColor Cyan
Write-Host "  Install: npm run install-service (in backend directory)" -ForegroundColor Gray
Write-Host "  Uninstall: npm run uninstall-service (in backend directory)" -ForegroundColor Gray
