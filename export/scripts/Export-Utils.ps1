function Get-UserDefinedDir {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $DirName,
    [switch] $OutWorkSpace,
    [string] $RootDir
  )
  while ($true) {
    $inputDir = Read-Host "$($DirName)"
    if (-not $inputDir -match '^(?:[A-Za-z]:\\)(?!.*[<>:"|?*]).*\\?$') {
      Write-Host '指定したディレクトリは無効な形式です。'
      continue
    }
    if ($OutWorkSpace) {
      if (-not $RootDir -or -not (Test-Path "$RootDir" -PathType Container)) { throw 'ルートディレクトリが参照できません。' }
      $inputFullPath = [System.IO.Path]::GetFullPath($inputDir).TrimEnd('\')
      $rootFullPath = [System.IO.Path]::GetFullPath($RootDir).TrimEnd('\')
      if ("$inputFullPath\".StartsWith("$rootFullPath\", [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Host '指定したディレクトリはルートのワークスペースに依存するため、指定できません。'
        continue
      }
    }
    if (Test-Path "$inputDir" -PathType Container) {
      $confirm = $null
      while ($null -eq $confirm) {
        $userInput = Read-Host '指定したディレクトリは既に存在しますが、よろしいですか。(y/n)'
        switch ($userInput.ToLower()) {
          'y' { $confirm = $true }
          'n' { $confirm = $false }
        }
      }
      if ($confirm) { break }
    } else { break }
  }
  return $inputDir
}
function Install-NodeModules {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageDir,
    [string[]] $Options
  )
  $npmArgs = @('install')
  if ($Options) { $Options | ForEach-Object { $npmArgs += "$_" } }
  Push-Location "$PackageDir"
  try {
    & npm @npmArgs
    if ($LASTEXITCODE -ne 0) { throw "exit code: $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}
function Build-Package {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageDir,
    [string] $Script = 'build',
    [switch] $Pack
  )
  $packageName = Split-Path "$PackageDir" -Leaf
  if (-not (Test-Path "$PackageDir" -PathType Container)) { throw "$packageName not found." }
  $distDir = Join-Path -Path "$PackageDir" -ChildPath 'dist'
  if (Test-Path "$distDir" -PathType Container) { Remove-Item -Path "$distDir" -Force -Recurse -ErrorAction Stop }
  Push-Location "$PackageDir"
  try {
    & npm run $Script
    if ($LASTEXITCODE -ne 0) { throw "build exit code: $LASTEXITCODE" }
    if ($Pack) {
      & npm pack
      if ($LASTEXITCODE -ne 0) { throw "pack exit code: $LASTEXITCODE" }
    }
  } finally {
    Pop-Location
  }
}
function Get-PackagePackPath {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageDir
  )
  $packageJsonPath = Join-Path -Path "$PackageDir" -ChildPath 'package.json'
  $packageJson = Get-Content "$packageJsonPath" -Encoding utf8 | ConvertFrom-Json
  $packagePackName = "$($packageJson.name -replace '@', '' -replace '/', '-')-$($packageJson.version).tgz"
  $packagePackPath = Join-Path -Path "$PackageDir" -ChildPath $packagePackName
  if (-not (Test-Path "$packagePackPath" -PathType Leaf)) { throw "$packagePackName not found." }
  return $packagePackPath
}
function Export-Production {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageDir,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ExportDir,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string[]] $ExportItems
  )
  New-Item "$ExportDir" -ItemType Directory -Force -ErrorAction Stop
  (Get-ChildItem -Path "$PackageDir") | Where-Object { $ExportItems -contains $_.Name } | ForEach-Object {
    Copy-Item -Exclude @('*.ts', '*.map') -Path "$($_.FullName)" -Destination "$ExportDir" -Force -Recurse -ErrorAction Stop
  }
}
function Invoke-ExportProduction {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageName,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ExportDir,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $RootDir
  )
  switch ($PackageName) {
    'backend' {
      @('log', 'uploads') | ForEach-Object {
        $dir = Join-Path -Path "$ExportDir" -ChildPath $_
        New-Item "$dir" -ItemType Directory -Force -ErrorAction Stop
      }
      $resourceDir = Join-Path -Path "$RootDir" -ChildPath 'export\resource\server'
      $logConfigPath = Join-Path -Path "$resourceDir" -ChildPath 'logConfig.json'
      Copy-Item -Path "$logConfigPath" -Destination "$ExportDir" -Force -ErrorAction Stop
      $keysDir = Join-Path -Path "$resourceDir" -ChildPath 'keys'
      $distDir = Join-Path -Path "$ExportDir" -ChildPath 'dist'
      $configDir = Join-Path -Path "$distDir" -ChildPath 'config'
      Copy-Item -Path "$keysDir" -Destination "$configDir" -Force -Recurse -ErrorAction Stop
      Rename-Item -Path "$distDir" -NewName 'backendApp' -Force -ErrorAction Stop
    }
  } 
}
function Export-NodeModules {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $RootDir,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $PackageDir,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ExportDirName,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ExportDir
  )
  $exportNodeModulesDir = Join-Path -Path "$ExportDir" -ChildPath 'node_modules'
  New-Item "$exportNodeModulesDir" -ItemType Directory -Force -ErrorAction Stop
  $modulesPath = Join-Path -Path "$RootDir" -ChildPath "export\resource\$ExportDirName\node_modules.txt"
  $modules = Get-Content "$modulesPath" -ErrorAction Stop
  ## [root]
  $rootNodeModulesDir = Join-Path -Path "$RootDir" -ChildPath 'node_modules'
  $modules | ForEach-Object {
    $moduleDir = Join-Path -Path "$rootNodeModulesDir" -ChildPath "$_"
    if (Test-Path "$moduleDir" -PathType Container) {
      Copy-Item -Path "$moduleDir" -Destination "$exportNodeModulesDir" -Force -Recurse -ErrorAction Stop
    }
  }
  # [package]
  $packageNodeModulesDir = Join-Path -Path "$PackageDir" -ChildPath 'node_modules'
  $modules | ForEach-Object {
    $moduleDir = Join-Path -Path "$packageNodeModulesDir" -ChildPath "$_"
    if (Test-Path "$moduleDir" -PathType Container) {
      Copy-Item -Path "$moduleDir" -Destination "$exportNodeModulesDir" -Force -Recurse -ErrorAction Stop
    }
  }
}
