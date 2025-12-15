# JESGO Backend Server

JESGOプロジェクトのバックエンドAPIサーバーです。

## 設定

### 設定ファイル

`backendapp/config/config.json` に設定ファイルを配置してください。

テンプレートは `/config.template.json` を参照してください。

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
  }
}
```

### 鍵ファイル

JWT認証用の鍵ファイルを生成してください：

```bash
# Windowsの場合
scripts/generate-keys.bat

# macOS/Linuxの場合
scripts/generate-keys.sh
```

鍵ファイルは `backendapp/config/keys/` に配置されます。

### 環境変数

以下の環境変数で設定を上書きできます：

- `NODE_ENV`: 環境（development/production）
- `DB_HOST`: データベースホスト
- `DB_PORT`: データベースポート
- `DB_NAME`: データベース名
- `DB_USER`: データベースユーザー
- `DB_PASSWORD`: データベースパスワード
- `PORT`: サーバーポート

## 使用方法

### 開発環境

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# 開発サーバー起動
npm run dev-start
```

### 本番環境

```bash
# 依存関係のインストール
npm ci --only=production

# ビルド
npm run build

# 本番サーバー起動
npm run prod-start
```

## 共通パッケージの使用

v1.5.0から、`@jesgo/common` パッケージを使用して、設定の読み込みや型定義を共通化しています。

詳細は `/packages/common/README.md` を参照してください。

### 設定の読み込み

```typescript
import { 
  ServerConfig,
  loadBackendConfig,
  mergeConfigWithEnv 
} from '@jesgo/common';

// 設定ファイルから読み込み
const config = loadBackendConfig({
  configPath: './backendapp/config/config.json',
  allowEnvOverride: true,
});
```

## API仕様

API仕様書は `specifications/api.md` を参照してください。

## ライセンス

ISC
