FORMAT: 1A

# Group 認証系

## ログイン [/login]

### ログイン認証 [POST]

ログインリクエストに使用。name と password でログイン認証を行う。

- RequestBody

  - name (string): ログイン用ユーザ ID 文字列
  - password (string): パスワード

- Response 200 (application/json)

  - Body

    ```
    interface localStorageObject {
      user_id: number;
      display_name: string;
      token: string;
      reflesh_token: string;
      roll_id: number;
      is_view_roll: boolean;
      is_add_roll: boolean;
      is_edit_roll: boolean;
      is_remove_roll: boolean;
      is_plugin_registerable: boolean;
      is_plugin_executable_select: boolean;
      is_plugin_executable_update: boolean;
      is_data_manage_roll: boolean;
      is_system_manage_roll: boolean;
    }
    ```

## 再ログイン [/relogin]

### ログイン時自動再認証 [POST]

他の API を呼ぶ再にメインの JWT トークンの期限が切れていた時に自動で呼ばれる。  
 reflesh_token を用いて再認証を行う。

- RequestBody

  - reflesh_token (string): JWT リフレッシュトークン

- Response 200 (application/json)

  - Body

    ```
    {
      token: string;
      reflesh_token: string;
    }
    ```

# Group 初期設定系

## スキーマ取得 [/getJsonSchema]

### スキーマ全取得 [GET]

DB に保存されているすべてのスキーマの新旧すべてのバージョンのものを取得する。  
必要権限: ログイン、閲覧

- Response 200 (application/json)

  - Body

    ```
    type schemaRecord = {
      schema_id: number;
      schema_id_string: string;
      title: string;
      subtitle: string;
      document_schema: string;
      uniqueness: boolean;
      hidden: boolean;
      subschema: number[];
      child_schema: number[];
      subschema_default: number[];
      child_schema_default: number[];
      inherit_schema: number[];
      inherit_schema_default: number[];
      base_schema: number | null;
      base_version_major: number;
      valid_from: Date;
      valid_until: Date | null;
      author: string;
      version_major: number;
      version_minor: number;
      plugin_id: number;
    }[]
    ```

## ルートスキーマ ID 取得 [/getRootSchemaIds]

### ルートスキーマ ID 取得 [GET]

DB に保存されているスキーマの中からルートスキーマに属するスキーマの ID 一覧を取得する。  
戻り値は body そのものが number[]型で返る。  
必要権限: ログイン、閲覧

- Response 200 (application/json)

  - Body

    ```
    *noName: number[]
    ```

# Group 利用者情報系

## 利用者取得 [/userlist]

### 利用者一覧取得 [GET]

DB に保存されているすべての利用者情報を取得する。  
必要権限: システム管理者

- Response 200 (application/json)

  - Body

    ```
    data: {
      user_id: number;
      name: string;
      displayName: string;
      rollId: number;
      rolltitle: string;
    }[]
    ```

## 利用者登録 [/signup]

### 利用者新規登録 [POST]

利用者の新規登録を行う。  
必要権限: システム管理者

- RequestBody

  - name (string): ログイン用ユーザ ID 文字列
  - display_name (string): 利用者名(画面表示用)
  - password (string): パスワード
  - roll_id (number): 割り当てられるロール ID

- Response 200 (application/json)

  - Body

    ```
    null(ステータスコードのみ)
    ```

## 利用者削除 [/deleteUser]

### 利用者削除 [POST]

利用者の削除を行う。  
必要権限: システム管理者

- RequestBody

  - user_id (number): 削除対象利用者の ID(ログイン用 ID ではなく、DB の主キー)

- Response 200 (application/json)

  - Body

    ```
    null(ステータスコードのみ)
    ```

## 利用者パスワード変更 [/changeUserPassword]

### 利用者パスワード変更 [POST]

利用者のパスワードの変更を行う。  
JWT によるログイン中のユーザ ID の照合が行われ自身のパスワードの変更のみが可能。  
必要権限: ログイン、閲覧

- RequestBody

  - user_id (number): パスワードを変更する利用者の ID(ログイン用 ID ではなく、DB の主キー)
  - password (string): 変更先のパスワード

- Response 200 (application/json)

  - Body

    ```
    null(ステータスコードのみ)
    ```

## 利用者情報更新 [/editUser]

### 利用者情報更新 [POST]

利用者情報全般の更新を行う。  
パスワード含む利用者情報全般の変更のみが可能。  
必要権限: システム管理者

- RequestBody

  - user_id (number): 情報を更新する利用者の ID(ログイン用 ID ではなく、DB の主キー)
  - name (string): 変更先のログイン用 ID(現在は未使用)
  - display_name (string): 変更先の表示名
  - password (string): 変更先のパスワード、未指定あるいは空文字の場合変更なし
  - roll_id (number): 変更先のロール ID

- Response 200 (application/json)

  - Body

    ```
    null(ステータスコードのみ)
    ```

## 権限一覧取得 [/getUserRollList]

### 権限一覧取得 [POST]

権限(ロール)の一覧の取得を行う。
DB に保存されている全ての情報が確認できる。  
必要権限: システム管理者

- Response 200 (application/json)

  - Body

    ```
      data: {
        roll_id: number;
        title: string;
        login: boolean;
        view: boolean;
        add: boolean;
        edit: boolean;
        remove: boolean;
        data_manage: boolean;
        system_manage: boolean;
        plugin_registerable: boolean;
        plugin_executable_select: boolean;
        plugin_executable_update: boolean;
        deleted: boolean;
      }[]
    ```

## 権限一覧取得(コンボボックス用) [/getUserRollItemMaster]

### 権限一覧取得 [GET]

権限(ロール)の一覧の取得を行う。
取得内容はコンボボックス用途の情報のみのため、ログイン権限のみで使用できる。  
必要権限: ログイン

- Response 200 (application/json)

  - Body

    ```
      data: {
        roll_id: number;
        title: string;
      }[]
    ```

## 権限設定更新 [/saveUserRoll]

### 権限設定更新 [POST]

権限(ロール)情報の更新を行う。
取得内容はコンボボックス用途の情報のみのため、ログイン権限のみで使用できる。  
必要権限: システム管理者

- RequestBody

  ```
  data: {
    roll_id: number;
    title: string;
    isNew?: boolean; // trueは新規作成したレコード
    login: boolean;
    view: boolean;
    add: boolean;
    edit: boolean;
    remove: boolean;
    data_manage: boolean;
    system_manage: boolean;
    plugin_registerable: boolean;
    plugin_executable_select: boolean;
    plugin_executable_update: boolean;
    deleted: boolean;
  }[]
  ```

- Response 200 (application/json)

  - Body

    ```
    null(ステータスコードのみ)
    ```

# Group 患者系

## 検索用カラム取得 [/getSearchColumns]

### 検索用カラム取得 [GET]

検索に使用するカラムを取得する。
現状ではがん種のみが対象となる。

- Response 200 (application/json)

  ```
  {
    cancerTypes: string[];
  }
  ```

## 患者検索 [/patientlist]

### 患者検索 [GET]

患者一覧、あるいは患者検索結果を取得する
パラメータでクエリがない場合は全患者を取得する。
指定されている場合はその条件にそった検索結果を返す。
必要権限: ログイン

- RequestBody

  - すべてクエリとして指定
    - initialTreatmentDate: string;
    - cancerType: string;
    - showOnlyTumorRegistry: string;
    - diagnosisDate: string;
    - eventDateType: string;
    - eventDate: string;
    - checkOfDiagnosisDate: string;
    - checkOfBlankFields: string;
    - advancedStage: string;
    - pathlogicalDiagnosis: string;
    - initialTreatment: string;
    - complications: string;
    - threeYearPrognosis: string;
    - fiveYearPrognosis: string;
    - showProgressAndRecurrence: string;

- Response 200 (application/json)

  ```
  {
    data: {
      caseId: number;
      patientId: string;
      patientName: string;
      age: number;
      registedCancerGroup: string;
      since: string | null;
      startDate: string | null;
      eventDate: (Date | null)[];
      lastUpdate: string;
      diagnosis: string;
      diagnosisMajor: string;
      diagnosisMinor: string;
      advancedStage: string;
      pathlogicalDiagnosis: string;
      initialTreatment: string[];
      complications: string[];
      progress: string[];
      postRelapseTreatment: string[];
      registration: string[];
      threeYearPrognosis: string[];
      fiveYearPrognosis: string[];
      status: string[];
    }[]
  }
  ```

## 症例削除 [/deleteCase/:caseId]

### 症例削除 [GET]

登録されている症例データを削除する。
必要権限: 削除

- RequestBody

  - caseId (string): クエリとして設定,削除対象の症例 ID

- Response 200 (application/json)

  ```
  null(ステータスコードのみ)
  ```

## 症例登録 [/registrationCaseAndDocument]

### 症例登録 [GET]

症例、ドキュメントの新規登録、上書きを行う。
既存の物がない場合は INSERT を行い、既存がある場合は UPDATE を行う。
必要権限: 編集

- RequestBody

  ```
  data: {
    jesgo_case: jesgoCaseDefine;
    jesgo_document: jesgoDocumentObjDefine[];
  }
  ```

- Response 200 (application/json)

  ```
  *noName: number
  ```

## 症例取得 [/getCaseAndDocument/:caseId]

### 症例取得 [GET]

対象の症例の情報を取得する。
症例に付随するドキュメントもまとめて取得する。
必要権限: 閲覧

- RequestBody

  - caseId (string): URL として設定,取得対象の症例 ID

- Response 200 (application/json)

  ```
  *noName: saveDataObjDefine
  ```

# Group 設定系

## 無限ループスキーマ ID 取得 [/getblacklist]

### 無限ループスキーマ ID 取得 [GET]

親子関係により無限参照ループが発生しているスキーマを検出し、該当のスキーマ ID を取得する。
必要権限: ログイン、閲覧

- Response 200 (application/json)

  ```
  {
    blackList: number[]
  }
  ```

## 設定情報取得 [/getSettings]

### 設定情報取得 [GET]

現在設定されているシステム設定情報をすべて取得する。
施設名の参照のみログイン画面でも使用するため、権限による呼び出し制御は行わない。

- Response 200 (application/json)

  ```
  settings = {
    hisid_alignment: boolean;
    hisid_digit: number;
    hisid_hyphen_enable: boolean;
    hisid_alphabet_enable: boolean;
    facility_name: string;
    jsog_registration_number: string;
    joed_registration_number: string;
  };
  ```

## 設定情報更新 [/updateSettings]

### 設定情報更新 [GET]

システム設定情報を任意の情報に更新する。
必要権限: システム管理者

- RequestBody

  ```
  settings = {
  hisid_alignment: boolean;
  hisid_digit: number;
  hisid_hyphen_enable: boolean;
  hisid_alphabet_enable: boolean;
  facility_name: string;
  jsog_registration_number: string;
  joed_registration_number: string;
  };
  ```

- Response 200 (application/json)

  ```
  null(ステータスコードのみ)
  ```

## スキーマアップロード [/upload]

### スキーマアップロード [GET]

スキーマをアップロードするのに使用する。
アップロードファイルは json ファイル単体か、json ファイル複数を ZIP にまとめたものどちらかとする。
スキーマは新規登録か更新が行われ、更新スキーマは既存の物よりバージョンが大きい必要があり、一部更新に失敗しても残りは更新に成功する。
必要権限: システム管理者

- RequestBody

  - アップロードファイルとして指定

- Response 200 (application/json)

  ```
  {
    number: number, // 更新数
    message: string[] // エラーメッセージ
  }
  ```

# Group スキーマ系

## スキーマツリー取得 [/gettree]

### スキーマツリー取得 [GET]

現在登録されているスキーマをツリー状にして取得を行う。
必要権限: システム管理者

- Response 200 (application/json)

  ```
  {
    treeSchema: apiBody.treeSchema,
    errorMessages: apiBody.errorMessages,
  },
  ```

## スキーマ情報更新 [/updateSchemas]

### スキーマ情報更新 [GET]

指定のスキーマの情報を更新する。
更新対象のスキーマは更新先情報の ID から取得する。
必要権限: システム管理者

- RequestBody

  ```
  type JesgoDocumentSchema = {
  schema_id: number;
  schema_id_string: string;
  title: string;
  subtitle: string;
  document_schema: JSONSchema7;
  subschema: number[];
  child_schema: number[];
  inherit_schema: number[];
  base_schema: number | null;
  version_major: number;
  version_minor: number;
  schema_primary_id: number;
  subschema_default: number[];
  child_schema_default: number[];
  inherit_schema_default: number[];
  valid_from: string;
  valid_until: string | null;
  hidden: boolean;
  };
  ```

- Response 200 (application/json)

  ```
  null(ステータスコードのみ)
  ```

# Group プラグイン系

## ドキュメントパッケージ取得 [/packaged-document]

### ドキュメントパッケージ取得 [GET]

指定された条件の症例、ドキュメントのリストをひとまとめにして取得する。
主にプラグインで使用される。
必要権限: プラグイン-ドキュメント取得、プラグイン-ドキュメント更新

- RequestBody

  ```
  interface PackageDocumentRequest {
  jesgoCaseList: jesgoCaseDefine[];
  schema_ids?: number[];
  document_id?: number;
  filter_query?: string;
  attachPatientInfoDetail?: boolean;
  }
  ```

- Response 200 (application/json)

  ```
  PatientItemDefine {
    hash: string;
    his_id?: string;
    date_of_birth?: string;
    name?: string;
    decline: boolean;
    documentList?: object[];
  }[]
  ```

## プラグイン一覧取得 [/plugin-list]

### プラグイン一覧取得 [GET]

現在登録しているプラグインのリストを取得する
必要権限: ログイン

- Response 200 (application/json)

  ```
  type jesgoPluginColumns = {
    plugin_id?: number;
    plugin_name: string;
    plugin_version?: string;
    script_text: string;
    target_schema_id?: number[];
    target_schema_id_string?: string;
    all_patient: boolean;
    update_db: boolean;
    attach_patient_info: boolean;
    show_upload_dialog: boolean;
    filter_schema_query?: string;
    explain?: string;
  }[]
  ```

## プラグインアップロード [/upload-plugin]

### プラグインアップロード [GET]

プラグインをアップロードするのに使用する。
アップロードファイルは js ファイル単体か、js ファイル複数を ZIP にまとめたものどちらかとする。
プラグインは新規登録か更新が行われ、一部更新に失敗しても残りは更新に成功する。
必要権限: プラグイン-アップロード

- RequestBody

  - アップロードファイルとして指定

- Response 200 (application/json)

  ```
  {
    number: number, // 更新数
    message: string[] // エラーメッセージ
  }
  ```

## プラグイン削除 [/deletePlugin]

### プラグイン削除 [GET]

対象のプラグインを削除する。
必要権限: プラグイン-アップロード

- RequestBody

  data: { plugin_id: number }

- Response 200 (application/json)

  ```
  undefined(ステータスコードのみ)
  ```

## 上書き元ドキュメント取得 [/getPatientDocuments]

### 上書き元ドキュメント取得 [GET]

ファイルアップロードを伴わない更新プラグインの使用時に既存のドキュメントを取得してプラグインの処理に組み込むための API。
必要権限: プラグイン-ドキュメント更新

- RequestBody

  - caseId?: string(クエリとして)
  - schemaIds?: string(クエリとして)

- Response 200 (application/json)

  ```
  {
    document_id: number;
    case_id: number;
    schema_id: string;
    document: JSON;
  }[]
  ```

## 更新プラグイン実行(準備) [/plugin-update]

### 更新プラグイン実行(準備) [GET]

更新系のプラグインで使用される。
この API では実際の更新は行わず、更新対象、更新後の状態を取得することが主である。
必要権限: プラグイン-ドキュメント更新

- RequestBody

  ```
  data: {
    case_id: number;
    objects: updateObject[];
  }
  ```

- Response 200 (application/json)

  ```
  {
    his_id,
    patient_name,
    checkList,
    updateList
  }
  ```

## 更新プラグイン実行 [/executeUpdate]

### 更新プラグイン実行 [GET]

更新系のプラグインで使用される。
この API で実際の更新が行われる。
必要権限: プラグイン-ドキュメント更新

- RequestBody

  ```
  data: {
    updateObjects: updateObject[];
  };
  ```

- Response 200 (application/json)

  ```
  undefined(ステータスコードのみ)
  ```

## 症例 ID-DocID 組み合わせ取得 [/getCaseIdAndDocIdList]

### 症例 ID-DocID 組み合わせ取得 [GET]

更新系のプラグインで使用される。
症例 ID とドキュメント ID の組み合わせリストを取得する。
必要権限: プラグイン-ドキュメント更新

- Response 200 (application/json)

  ```
  {
    case_id: number;
    document_id: number;
  }[]
  ```

## 症例 ID-ハッシュ組み合わせ取得 [/getCaseIdAndHashList]

### 症例 ID-ハッシュ組み合わせ取得 [GET]

更新系のプラグインで使用される。
ハッシュと症例 ID の組み合わせリストを取得する。
必要権限: プラグイン-ドキュメント更新

- Response 200 (application/json)

  ```
  {
    case_id: number;
    hash: string;
  }[]
  ```

## 症例 ID-腫瘍登録番号組み合わせ取得 [/getCaseIdAndCaseNoList]

### 症例 ID-腫瘍登録番号組み合わせ取得 [GET]

更新系のプラグインで使用される。
腫瘍登録番号と症例 ID の組み合わせリストを取得する。
必要権限: プラグイン-ドキュメント更新

- Response 200 (application/json)

  ```
  {
    case_id: number;
    caseNo: string;
  }[]
  ```

## 患者登録プラグイン実行 [/register-case]

### 患者登録プラグイン実行 [POST]

更新系のプラグインのうち、患者登録機能で使用される。
APIの実行で1患者分の患者情報の登録・更新、ドキュメントの作成・更新が行われる
必要権限: プラグイン-ドキュメント更新

- RequestBody

  ```
  data: {
    objects: updateObject[];
  };
  ```

- Response 200 (application/json)

  ```
  {
    his_id: string;
    patient_name: string;
    case_id: number;
    returnUpdateObjects: updateObject[];
  }
  ```