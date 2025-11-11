# @jesgo/common

JESGO共通ライブラリ - Frontend/Backend共通の型定義・ユーティリティを提供します。

## 概要

このパッケージは、JESGOプロジェクトのフロントエンドとバックエンドで共通して使用される型定義、定数、ユーティリティ関数を提供します。コードの重複を避け、一貫性を保つために作成されました。

## 提供される機能

### 型定義 (types/)

#### API関連 (api.ts)
- `ApiReturnObject`: API通信の戻り値の型定義
- `RESULT`: API通信の結果コード（正常終了、各種エラーコード）
- `METHOD_TYPE`: HTTPメソッドタイプ（GET, POST, DELETE等）

#### 設定関連 (config.ts) ✨新機能
- `ServerConfig`: サーバー設定の型定義
- `WebAppConfig`: Webアプリケーション設定の型定義
- `BackendConfigFile`: Backend設定ファイルの構造
- `FrontendConfigFile`: Frontend設定ファイルの構造
- `ConfigEnvironment`: 環境変数の型定義
- `ConfigLoadOptions`: 設定読み込みオプション

### 定数 (constants/)

- `Const.JESGO_TAG`: JESGOタグの定義
- `Const.UI_WIDGET`: UIスキーマプロパティ
- `Const.EX_VOCABULARY`: 拡張ボキャブラリー
- `Const.JESGO_UI_LISTTYPE`: リストタイプの定義
- `Const.JSONSchema7Keys`: JSONSchema7のキー定義
- `Const.JSONSchema7Types`: JSONSchema7の型定義
- `jesgo_tagging()`: JESGOタグ文字列生成関数

### ユーティリティ関数 (utils/)

#### 日付関連 (date-utils)
- `isDate()`: 日付の妥当性チェック
- `isDateStr()`: 日付文字列判定
- `formatDate()`: 日付のフォーマット変換
- `formatTime()`: 時刻のフォーマット変換
- `formatDateStr()`: 日付文字列のフォーマット変換
- `calcAge()`: 年齢計算
- `isAgoYearFromNow()`: 満N年経過チェック

#### JSON Pointer関連 (json-pointer-utils)
- `isPointerWithArray()`: 配列指定を含むか判定
- `getPointerArrayNum()`: 配列位置指定を取得
- `getPointerTrimmed()`: 配列位置指定を削除

#### 文字列関連 (string-utils)
- `escapeText()`: テキストのエスケープ処理
- `generateUuid()`: UUID生成

#### 配列関連 (array-utils)
- `getArrayWithSafe()`: 安全な配列要素取得

#### 設定読み込み (config-loader) ✨新機能
- `loadConfigFromEnv()`: 環境変数から設定を読み込む
- `mergeConfigWithEnv()`: 設定を環境変数でマージ
- `getConfigPathFromPackageJson()`: package.jsonから設定パスを取得
- `loadConfigFile()`: 設定ファイルを読み込む
- `loadBackendConfig()`: Backend設定を読み込む
- `loadFrontendConfig()`: Frontend設定を読み込む
- `validateConfig()`: 設定の検証

### バリデーション (validation/)

- `StaffErrorMessage`: スタッフ登録・編集のエラーメッセージ定義
- `LOGINID_PATTERN`: ログインID検証用正規表現
- `PASSWORD_PATTERN`: パスワード検証用正規表現

## 使用方法

### インストール

```bash
# backendから使用
cd packages/backend
npm install

# frontendから使用
cd packages/frontend
npm install
```

### インポート

#### API関連
```typescript
import { 
  ApiReturnObject, 
  RESULT, 
  METHOD_TYPE 
} from '@jesgo/common';

const result: ApiReturnObject = {
  statusNum: RESULT.NORMAL_TERMINATION,
  body: { data: 'example' }
};
```

#### 日付・時刻関連
```typescript
import { formatDate, formatDateStr } from '@jesgo/common';

const formattedDate = formatDate(new Date(), '-');
console.log(formattedDate); // 2025-10-11
```

#### 設定読み込み（Backend）✨新機能
```typescript
import { 
  loadBackendConfig,
  ServerConfig,
  mergeConfigWithEnv 
} from '@jesgo/common';

// 設定ファイルから読み込み
const config = loadBackendConfig({
  configPath: './config/config.json',
  allowEnvOverride: true,
});

// 環境変数でマージ
const mergedConfig = mergeConfigWithEnv(config);
```

#### 設定読み込み（Frontend）✨新機能
```typescript
import { 
  loadFrontendConfig,
  WebAppConfig 
} from '@jesgo/common';

// 設定ファイルから読み込み
const config = loadFrontendConfig({
  configPath: './dist/config.json',
  allowEnvOverride: true,
  defaults: {
    webAppPort: 3030,
    endPointUrl: 'http://localhost:5001/',
  },
});
```

## 設定ファイル

### 設定ファイルのテンプレート

リポジトリルートに `config.template.json` があります：

```json
{
  "server": {
    "database": "jesgo_db",
    "user": "postgres",
    "password": "your_password_here",
    "host": "localhost",
    "port": 5432,
    "passwordSalt": "change_this_salt",
    "hashSalt": "change_this_hash_salt",
    "serverPort": 5000
  },
  "webApp": {
    "webAppPort": 3030,
    "endPointUrl": "http://localhost:5001/"
  }
}
```

### 環境変数による設定の上書き

以下の環境変数で設定を上書きできます：

- `DB_HOST`: データベースホスト
- `DB_PORT`: データベースポート
- `DB_NAME`: データベース名
- `DB_USER`: データベースユーザー
- `DB_PASSWORD`: データベースパスワード
- `PORT`: サーバーポート
- `REACT_APP_API_URL`: APIエンドポイントURL

### Docker環境での設定

Docker環境では、`docker-compose.yml`で環境変数を設定することで、設定ファイルの値を上書きできます：

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: jesgo_db
  DB_USER: postgres
  DB_PASSWORD: 12345678
  PORT: 5000
```

## ビルド

```bash
npm run build
```

## 開発

ソースファイルは `src/` ディレクトリに配置されています：

```
src/
├── types/          # 型定義
│   ├── api.ts
│   └── config.ts   # 設定関連の型（新規）
├── constants/      # 定数
│   └── jesgo-tags.ts
├── utils/          # ユーティリティ関数
│   ├── date-utils.ts
│   ├── json-pointer-utils.ts
│   ├── string-utils.ts
│   ├── array-utils.ts
│   └── config-loader.ts  # 設定読み込み（新規）
├── validation/     # バリデーション
│   └── staff-validation.ts
└── index.ts        # エントリーポイント
```

## 貢献

共通化できる新しいコードを見つけた場合は、このパッケージに追加することを検討してください。

1. 新しいファイルを適切なディレクトリに作成
2. `src/index.ts` からエクスポート
3. `npm run build` でビルド
4. frontendまたはbackendで使用

## ライセンス

ISC
