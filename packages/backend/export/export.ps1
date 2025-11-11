# リリース用バックエンドファイルエクスポート用スクリプト

# 既にあるリリース用ファイルを削除
Remove-item .\release -Recurse -Force

# ディレクトリを再生成
New-Item release -ItemType Directory
# バックエンドファイルの主要ファイルから.ts(トランスパイル前ファイル)、.key(秘密鍵ファイル)、設定ファイル以外をコピーする
Copy-Item -Exclude ("*.ts", "*.key", "config.json") -Path ..\backendapp\ -Destination .\release\ -Recurse

# その他単体ファイルをコピーする
Copy-Item -Path ..\package.json -Destination .\release\
Copy-Item -Path .\resource\logConfig.json -Destination .\release\

# 中身の必要ない各種ディレクトリを作成
New-Item .\release\log -ItemType Directory
New-Item .\release\uploads -ItemType Directory

# node_modules格納のためのディレクトリを作成
New-Item .\release\node_modules -ItemType Directory

# node_modulesの必要なモジュールリスト
$moduleList = Get-Content .\resource\module_list.txt

foreach ( $module in $moduleList ) {
    Copy-Item -Path ..\node_modules\$module -Destination .\release\node_modules -Recurse
}

pause