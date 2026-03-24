<#
.SYNOPSIS
  JESGO配布資源作成
.DESCRIPTION
  1. [root] npm install
  2. [common] build & pack
  3. [root] npm install jesgo-common-{version}.tgz
  4. [backend / frontend] build
  5. [root] node_modules & [package] node_modules
#>
#### 静的定数定義
Set-Variable -Name 'ROOT_DIR' -Value (Join-Path -Path "$PSScriptRoot" -ChildPath '..\..') -Option Constant -Scope Script
Set-Variable -Name 'UTILS_PATH' -Value (Join-Path -Path "$ROOT_DIR" -ChildPath 'export\scripts\Export-Utils.ps1') -Option Constant -Scope Script
Set-Variable -Name 'PACKAGES' -Value @('common', 'backend', 'frontend') -Option Constant -Scope Script
Set-Variable -Name 'EXPORT_PACKAGES' -Value @(
  @{
    PackageName = 'backend'
    Script = 'build'
    ExportDirName = 'server'
    ExportItems = @('dist', 'package.json')
  },
  @{
    PackageName = 'frontend'
    Script = 'release-build'
    ExportDirName = 'webApp'
    ExportItems = @('dist', 'image', 'package.json', 'start.js', 'config.js')
  }
) -Option Constant -Scope Script
Set-Variable -Name 'REMOVE_NODE_MODULES' -Value @('@react-icons', '@mui') -Option Constant -Scope Script
#### インポート
. "$UTILS_PATH"
#### 配布資源作成
try {
  ### 0. 動的定数定義
  Set-Variable -Name 'EXPORT_DIR' -Value $(Get-UserDefinedDir -DirName '配布資源出力用ディレクトリ') -Option Constant -Scope Script
  ### 1. 初期化
  Write-Host '初期化中...' -ForegroundColor Green
  ## 配布資源出力用ディレクトリの作成
  if (-not (Test-Path "$EXPORT_DIR" -PathType Container)) { New-Item "$EXPORT_DIR" -ItemType Directory -Force -ErrorAction Stop }
  ## 依存関係のアンインストール
  # [root]
  $nodeModulesDirName = 'node_modules'
  $rootNodeModulesDir = Join-Path -Path "$ROOT_DIR" -ChildPath $nodeModulesDirName
  if (Test-Path "$rootNodeModulesDir" -PathType Container) { Remove-Item -Path "$rootNodeModulesDir" -Force -Recurse -ErrorAction Stop }
  # [package]
  $packagesDir = Join-Path -Path "$ROOT_DIR" -ChildPath 'packages'
  $PACKAGES | ForEach-Object {
    $packageNodeModulesDir = Join-Path -Path "$packagesDir" -ChildPath "$_\$nodeModulesDirName"
    if (Test-Path "$packageNodeModulesDir" -PathType Container) { Remove-Item -Path "$packageNodeModulesDir" -Force -Recurse -ErrorAction Stop }
  }
  ### 2. 依存関係のインストール
  Write-Host '依存関係のインストール中...' -ForegroundColor Green
  Install-NodeModules -PackageDir "$ROOT_DIR"
  ### 3. 共通パッケージ資源の作成
  $commonDir = Join-Path -Path "$packagesDir" -ChildPath 'common'
  ## ビルド
  Write-Host '共通パッケージのビルド中...' -ForegroundColor Green
  Build-Package -PackageDir "$commonDir" -Pack
  $commonPackPath = Get-PackagePackPath -PackageDir "$commonDir"
  ### 3. 配布資源の出力
  $EXPORT_PACKAGES | ForEach-Object {
    $packageDir = Join-Path -Path "$packagesDir" -ChildPath $_.PackageName
    ## ビルド
    Write-Host "$($_.PackageName)のビルド中..." -ForegroundColor Green
    Build-Package -PackageDir "$packageDir" -Script $_.Script
    ## パッケージ配布資源出力用ディレクトリの作成
    $exportDir = Join-Path -Path "$EXPORT_DIR" -ChildPath $_.ExportDirName
    if (Test-Path "$exportDir" -PathType Container) { Remove-Item -Path "$exportDir" -Force -Recurse -ErrorAction Stop }
    ## ビルド資源の出力
    Write-Host "$($_.PackageName)の配布資源を出力中..." -ForegroundColor Green
    Export-Production -ExportDir "$exportDir" -PackageDir "$packageDir" -ExportItems $_.ExportItems
    Invoke-ExportProduction -PackageName $_.PackageName -ExportDir "$exportDir" -RootDir "$ROOT_DIR"
    ## 共通パッケージのインストール
    Write-Host '共通パッケージのインストール中...' -ForegroundColor Green
    Install-NodeModules -PackageDir "$packageDir" -Options @("$commonPackPath", '--no-save')
    ## 配布用依存関係の出力
    Write-Host "$($_.PackageName)のnode_modulesを出力中..." -ForegroundColor Green
    Export-NodeModules -RootDir "$ROOT_DIR" -PackageDir "$packageDir" -ExportDir "$exportDir"
  }
  ### 4. 作業用ディレクトリの削除
  Remove-Item -Path "$commonPackPath" -Force -ErrorAction Stop
  ### 5. 開発環境の依存関係の復元
  Write-Host "開発環境の依存関係を復元中..." -ForegroundColor Green
  Install-NodeModules -PackageDir "$ROOT_DIR"
} catch {
  Write-Error ($_ | Out-String)
}
