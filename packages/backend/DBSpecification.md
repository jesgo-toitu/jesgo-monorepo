# 腫瘍サマリ(jesgo_db)

## DB 仕様

### 使用アプリケーション

PostgreSQL 14.1(Windows)

### 文字コード

UTF-8

## 症例 (jesgo_case)

### テーブル定義

| 列名          | 型          | 属性             | デフォルト | 解説                                    |
| ------------- | ----------- | ---------------- | ---------- | --------------------------------------- |
| case_id       | serial      | PK               |            | 内部で使用する患者 ID                   |
| name          | text        |                  |            | 患者名                                  |
| date_of_birth | date        | NOT NULL         |            | 患者の生年月日                          |
| date_of_death | date        |                  |            | 患者の死亡日、死亡していない場合は NULL |
| sex           | varchar(1)  | FK               | 'F'        | 患者の性別                              |
| his_id        | text        | UNIQUE, NOT NULL |            | 施設での患者 ID                         |
| decline       | boolean     |                  | FALSE      | 臨床試験登録拒否を表明しているか否か    |
| registrant    | integer     | FK               |            | 最終更新登録者 ID                       |
| last_updated  | timestamptz | NOT NULL         |            | 最終更新タイムスタンプ                  |
| deleted       | boolean     |                  | FALSE      | 削除済みフラグ                          |

## ドキュメント (jesgo_document)

### テーブル定義

| 列名                 | 型          | 属性           | デフォルト | 解説                                                                             |
| -------------------- | ----------- | -------------- | ---------- | -------------------------------------------------------------------------------- |
| document_id          | serial      | PK             |            | 内部で使用するドキュメント ID                                                    |
| case_id              | integer     | FK,NOT NULL    |            | ドキュメントの紐付く患者 ID                                                      |
| event_date           | date        |                |            | ドキュメントイベントの日付                                                       |
| document             | JSONB       | NOT NULL       |            | スキーマに沿って記録されたドキュメント情報(JSON)                                 |
| child_documents      | integer[]   |                |            | このドキュメントの下の階層を構成するドキュメントのドキュメント ID を保持した配列 |
| schema_id            | integer     | NOT NULL       |            | ドキュメントを構成するスキーマの ID                                              |
| schema_primary_id    | integer     | NOT NULL       |            | ドキュメントを構成するスキーマのバージョン毎に別に振られる ID                    |
| inherit_schema       | integer[]   |                |            | (未使用)継承先スキーマのIDリスト                                                 |
| schema_major_version | integer     |                |            | スキーマのメジャーバージョン                                                     |
| registrant           | integer     | FK             |            | 最終更新登録者 ID                                                                |
| created              | timestamptz |                |            | 作成日時タイムスタンプ                                                           |
| last_updated         | timestamptz | NOT NULL       |            | 最終更新タイムスタンプ                                                           |
| readonly             | boolean     |                | FALSE      | 編集禁止フラグ                                                                   |
| deleted              | boolean     |                | FALSE      | 削除済みフラグ                                                                   |
| root_order           | integer     | NOT NULL       | -1         | 削除済みフラグ                                                                   |

## ドキュメントスキーマ (jesgo_document_schema)

### テーブル定義

| 列名                   | 型        | 属性     | デフォルト   | 解説                                                                                                                                                                                                               |
| ---------------------- | --------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| schema_primary_id      | serial    | PK       |              | レコード毎に振られるID、スキーマが更新された際にスキーマIDが同様でも新しい値となる                                                                                                                                 |
| schema_id              | integer   |          |              | スキーマ ID 、schema_id_stringと対で設定され、バージョンが変わってもスキーマIDは変更されない                                                                                                                       |
| schema_id_string       | text      |          |              | JSON スキーマの$id                                                                                                                                                                                                 |
| title                  | text      |          |              | スキーマが定義するドキュメントのタイトル(JSON スキーマの title から生成)                                                                                                                                           |
| subtitle               | text      |          |              | スキーマが定義するドキュメントのサブタイトル(JSON スキーマの title から生成)                                                                                                                                       |
| document_schema        | JSON      | NOT NULL |              | スキーマ定義内容(JSON)                                                                                                                                                                                             |
| uniqueness             | boolean   |          | FALSE        | 同一階層にこのスキーマで定義されるドキュメントは最大 1 つしか存在できない(JSON スキーマの jesgo:unique)                                                                                                            |
| hidden                 | boolean   |          |              | 候補として表示しない                                                                                                                                                                                               |
| subschema              | integer[] |          |              | このスキーマの下位として標準的に展開されるスキーマのスキーマ ID(初期値は JSON スキーマの jesgo:subschema から検索、順序は保持される)、スキーマ管理画面より並び替えが可能                                           |
| subschema_default      | integer[] |          |              | このスキーマの下位として標準的に展開されるスキーマのスキーマ IDの初期値(初期値は JSON スキーマの jesgo:subschema から検索、順序は保持される)、スキーマのアップロード以外では更新されない                           |
| child_schema           | integer[] |          |              | このスキーマの下位として展開されうるスキーマのスキーマ ID(初期値は JSON スキーマのjesgo:childschema,jesgo:parentschema から検索して生成、順序は保持される)、スキーマ管理画面より表示非表示の切替え、並び替えが可能 |
| child_schema_default   | integer[] |          |              | このスキーマの下位として展開されうるスキーマのスキーマ IDの初期値(初期値は JSON スキーマのjesgo:childschema,jesgo:parentschema から検索して生成、順序は保持される)、スキーマのアップロード以外では更新されない     |
| base_version_major     | integer   |          |              | 継承スキーマの場合、基底スキーマのメジャーバージョンを明示する                                                                                                                                                     |
| valid_from             | date      |          | '1970-01-01' | スキーマの有効期間開始日(JSON スキーマの jesgo:vaild[0])                                                                                                                                                           |
| valid_until            | date      |          |              | スキーマの有効期間終了日(JSON スキーマの jesgo:valid[1])                                                                                                                                                           |
| author                 | text      | NOT NULL |              | スキーマの作成者名(JSON スキーマの jesgo:author)                                                                                                                                                                   |
| version_major          | integer   | NOT NULL |              | スキーマのメジャーバージョン(JSON スキーマの jesgo:version の上位数値)                                                                                                                                             |
| version_minor          | integer   | NOT NULL |              | スキーマのマイナーバージョン(JSON スキーマの jesgo:version の下位数値)                                                                                                                                             |
| plugin_id              | integer   |          |              | このスキーマを導入したプラグインの ID                                                                                                                                                                              |
| inherit_schema         | integer[] |          |              | このスキーマの継承先として展開されうるスキーマのスキーマ ID(初期値は JSON スキーマの$id から検索して生成、順序は保持される)、スキーマ管理画面より表示非表示の切替えが可能                                          |
| inherit_schema_default | integer[] |          |              | このスキーマの継承先として展開されうるスキーマのスキーマ IDの初期値(初期値は JSON スキーマの$id から検索して生成、順序は保持される)、スキーマのアップロード以外では更新されない                                    |
| base_schema            | integer   |          | NULL         | このスキーマが継承スキーマである場合、基底スキーマのスキーマIDを明示する                                                                                                                                           |

## (未使用)ドキュメントアイコン (jesgo_document_icon)

### テーブル定義

| 列名  | 型   | 属性 | デフォルト | 解説                       |
| ----- | ---- | ---- | ---------- | -------------------------- |
| title | text | PK   |            | 対応するスキーマのタイトル |
| icon  | text |      |            | アイコンのデータ           |

## 性別 (jesgo_sex_master)

### テーブル定義

| 列名           | 型         | 属性     | デフォルト | 解説                             |
| -------------- | ---------- | -------- | ---------- | -------------------------------- |
| sex_identifier | varchar(1) | PK       |            | 性別を示す 1 文字で表記された ID |
| sex            | text       | NOT NULL |            | 性別を表記する文字列             |

### マスタ設定

| sex_identifier | sex      |
| -------------- | -------- |
| F              | 女性     |
| M              | 男性     |
| N              | 記載なし |
| 1              | MTF      |
| 2              | FTM      |

## ユーザ (jesgo_user)

### テーブル定義

| 列名          | 型      | 属性        | デフォルト | 解説                                       |
| ------------- | ------- | ----------- | ---------- | ------------------------------------------ |
| user_id       | integer | PK          |            | ユーザの ID                                |
| name          | text    | NOT NULL    |            | ログイン時に使用するユーザ名               |
| display_name  | text    |             |            | アプリケーション使用時に表示されるユーザ名 |
| password_hash | text    |             |            | パスワードをハッシュ化したもの             |
| roll_id       | integer | FK,NOT NULL |            | ユーザの権限設定内容への外部参照           |
| deleted       | boolean | FALSE       |            |                                            |

### 補足

ログテーブル記録用にユーザ ID:0 でシステムユーザを作成する。  
上記ユーザはユーザ操作を伴わない(外部からのスクリプト等)ログ出力に記録される。

## ユーザロール (jesgo_user_roll)

### テーブル定義

| 列名                     | 型      | 属性     | デフォルト | 解説                                                     |
| ------------------------ | ------- | -------- | ---------- | -------------------------------------------------------- |
| roll_id                  | integer | PK       |            | 権限管理の ID                                            |
| title                    | text    | NOT NULL |            | 権限の名称                                               |
| login                    | boolean |          |            | ログイン可能                                             |
| view                     | boolean |          |            | ドキュメントの閲覧が可能                                 |
| add                      | boolean |          |            | ドキュメントの追加が可能                                 |
| edit                     | boolean |          |            | ドキュメントの編集が可能                                 |
| remove                   | boolean |          |            | ドキュメントの削除が可能                                 |
| data_manage              | boolean |          |            | データの統括管理可能                                     |
| system_manage            | boolean |          |            | システム管理可能                                         |
| plugin_registerable      | boolean |          | FALSE      | プラグインの登録・削除が可能。プラグイン管理画面が開ける |
| plugin_executable_select | boolean |          | FALSE      | データ抽出プラグイン実行可能                             |
| plugin_executable_update | boolean |          | FALSE      | データ更新プラグイン実行可能                             |
| deleted                  | boolean |          | FALSE      | 削除フラグ                                               |

### マスタ設定

| roll_id | title                | login | view  | add   | edit  | remove | data_manage | system_manage | plugin_registerable | plugin_executable_select | plugin_executable_update | deleted |
| ------- | -------------------- | ----- | ----- | ----- | ----- | ------ | ----------- | ------------- | ------------------- | ------------------------ | ------------------------ | ------- |
| 0       | システム管理者       | TRUE  | TRUE  | TRUE  | TRUE  | TRUE   | TRUE        | TRUE          | TRUE                | TRUE                     | TRUE                     | FALSE   |
| 1       | システムオペレーター | TRUE  | FALSE | FALSE | FALSE | FALSE  | FALSE       | TRUE          | FALSE               | TRUE                     | TRUE                     | FALSE   |
| 100     | 上級ユーザ           | TRUE  | TRUE  | TRUE  | TRUE  | TRUE   | TRUE        | FALSE         | FALSE               | TRUE                     | TRUE                     | FALSE   |
| 101     | 一般ユーザ           | TRUE  | TRUE  | TRUE  | TRUE  | FALSE  | FALSE       | FALSE         | FALSE               | TRUE                     | FALSE                    | FALSE   |
| 999     | ログ用ユーザ         | FALSE | FALSE | FALSE | FALSE | FALSE  | FALSE       | FALSE         | FALSE               | FALSE                    | FALSE                    | FALSE   |
| 1000    | 退職者               | FALSE | FALSE | FALSE | FALSE | FALSE  | FALSE       | FALSE         | FALSE               | FALSE                    | FALSE                    | FALSE   |

## (未使用)ログ (jesgo_log)

### テーブル定義

| 列名    | 型          | 属性     | デフォルト | 解説                        |
| ------- | ----------- | -------- | ---------- | --------------------------- |
| log_id  | serial      | PK       |            | ログの ID                   |
| user_id | integer     | FK       |            | 該当ログを残したユーザの ID |
| body    | text        |          |            | ログ本文                    |
| created | timestamptz | NOT NULL |            | ログ作成時のタイムスタンプ  |

### 補足

ユーザ操作を伴わない(外部からのスクリプト等)ログは user_id が 0 で記録される。


## プラグイン (jesgo_plugin)

### テーブル定義

| 列名                    | 型          | 属性             | デフォルト | 解説                                                         |
| ----------------------- | ----------- | ---------------- | ---------- | ------------------------------------------------------------ |
| plugin_id               | serial      | PK               |            | 内部で使用するプラグインID                                   |
| plugin_name             | text        | PK, UNIQUE       |            | プラグイン名                                                 |
| plugin_version          | text        |                  |            | バージョン番号                                               |
| script_text             | text        |                  |            | 実行するJavaScriptコード                                     |
| target_schema_id        | integer[]   |                  |            | 対象のスキーマID(jesgo_document_schemaテーブルのschema_id)   |
| target_schema_id_string | text        |                  |            | 対象のスキーマID(パス)                                       |
| all_patient             | boolean     |                  | FALSE      | 全患者対象のプラグインか否か                                 |
| update_db               | boolean     |                  | FALSE      | DBへの更新を行うプラグインか否か                             |
| attach_patient_info     | boolean     |                  | FALSE      | 出力するドキュメントに患者氏名などの個人情報を載せるか否か   |
| show_upload_dialog      | boolean     |                  | TRUE       | ファイルアップロードが必要か否か                             |
| filter_schema_query     | text        |                  |            | 出力対象のスキーマをフィルターするクエリ(jsonpath)           |
| explain                 | text        |                  |            | プラグインの説明文                                           |
| deleted                 | boolean     |                  |            | 削除済みフラグ                                               |
| disabled                | boolean     |                  | FALSE      | 有効/無効フラグ                                              |
| registrant              | integer     | FK               |            | 最終更新登録者 ID                                            |
| last_updated            | timestamptz |                  |            | 最終更新タイムスタンプ                                       |

### 補足
プラグイン名(plugin_name)で一意となるため、バージョンが異なる同一名称のプラグインは登録不可

## 検索項目マスタ (jesgo_search_column)

### テーブル定義

| 列名        | 型      | 属性     | デフォルト | 解説            |
| ----------- | ------- | -------- | ---------- | --------------- |
| column_id   | integer | PK       |            | 項目ID          |
| column_type | text    | PK       |            | 項目タイプ      |
| column_name | text    |          |            | 項目名称        |

### マスタ設定

| column_id | column_type | column_name |
| --------- | ----------- | ----------- |
| 1         | cancer_type | 子宮頸がん  |
| 2         | cancer_type | 子宮体がん  |
| 3         | cancer_type | 卵巣がん    |
| 4         | cancer_type | 外陰癌      |
| 5         | cancer_type | 腟癌        |
| 6         | cancer_type | 子宮肉腫    |
| 7         | cancer_type | 子宮腺肉腫  |
| 8         | cancer_type | 絨毛性疾患  |

### 補足
スキーマアップロード時、スキーマ情報から動的にマスタを生成する  
現在は患者検索の「がん種」のリスト値に使用のみ。
column_typeを追加することで別のリスト値管理にも対応可能


## システム設定 (jesgo_system_setting)

### テーブル定義

| 列名       | 型      | 属性     | デフォルト | 解説                       |
| ---------- | ------- | -------- | ---------- | -------------------------- |
| setting_id | integer | PK       |            | 設定 ID                    |
| value      | jsonb   |          |            | システム設定を保持したJSON |

### 補足
システム全体の設定を保持。項目はJSONで持つため、現状1レコードしか使用していない