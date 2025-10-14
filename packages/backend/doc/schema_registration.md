# スキーマ登録手順

1. バックエンドを起動する(起動中であればそのままで可)
2. バックエンドのインポート用ディレクトリ`tumor-server/backendapp/import`に登録したいスキーマファイル(ディレクトリも可)を格納する
3. (バックエンドの URL)/json2schema/ に対して POST を行う
4. 必要に応じて`tumor-server/backendapp/imported`に移動されたスキーマファイルを削除する(削除しなくても次回再登録はされない)
