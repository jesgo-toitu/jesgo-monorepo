# リリース用ファイルエクスポート用スクリプト
# ビルド
webpack --progress --mode production

cd ./export

# 既にあるリリース用ファイルを削除
Remove-item .\release -Recurse -Force

# ディレクトリを再生成
New-Item release -ItemType Directory

# ファイルコピー(設定ファイル以外)
Copy-Item -Exclude ("config.json") -Path ..\dist\ -Destination .\release\ -Recurse
Copy-Item -Path ..\image\ -Destination .\release\ -Recurse

# その他単体ファイルをコピーする
Copy-Item -Path ..\start.js -Destination .\release\
Copy-Item -Path ..\config.js -Destination .\release\
Copy-Item -Path ..\package.json -Destination .\release\

# node_modules格納のためのディレクトリを作成
New-Item .\release\node_modules -ItemType Directory

# node_modulesの必要なモジュールリスト
$moduleList = Get-Content .\resource\module_list.txt

foreach ( $module in $moduleList ) {
    Copy-Item -Path ..\node_modules\$module -Destination .\release\node_modules -Recurse
}

cd ../