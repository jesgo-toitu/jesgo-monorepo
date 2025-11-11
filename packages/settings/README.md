# JESGO 設定ファイル

このディレクトリには、JESGOプロジェクトの共通設定ファイルが含まれています。

## ファイル一覧

### config.json

実際に使用される設定ファイルです。

- **用途**: 開発環境・本番環境の実際の設定
- **Gitコミット**: ❌ 不可（`.gitignore`に追加済み）
- **セキュリティ**: ✅ 実際の認証情報を含めることができる
- **作成方法**: `cp config.template.json config.json` でテンプレートからコピー

### config.template.json

設定ファイルのテンプレートです。

- **用途**: 設定ファイルの雛形、新規開発者向け
- **Gitコミット**: ✅ 可能（デフォルト値のみ含む）
- **セキュリティ**: ⚠️ 本番用のパスワードやシークレットは含めないこと
- **更新**: 新しい設定項目を追加した場合は更新すること

## セットアップ（初回のみ）

```bash
# 設定ファイルを作成
cd packages/settings
cp config.template.json config.json

# 必要に応じて編集
nano config.json
```

## 使用方法

### 開発環境

`config.json`が自動的に読み込まれます：

```bash
# Backend
cd packages/backend
npm run dev-start
# → ../settings/config.json を自動的に読み込み

# Frontend
cd packages/frontend
npm run dev-start
# → ../settings/config.json を自動的に読み込み
```

### 本番環境

本番用の値に変更します：

```bash
cd packages/settings
nano config.json  # 本番用のパスワード等に変更

# または環境変数で上書き
export DB_PASSWORD=secure_password
export HASH_SALT=secure_hash_salt
```

## 設定ファイルの構造

```json
{
  "server": {
    "database": "jesgo_db",
    "user": "postgres",
    "password": "12345678",
    "host": "postgres",
    "port": 5432,
    "passwordSalt": "abcde",
    "hashSalt": "3^0g#H-x$M",
    "serverPort": 5000
  },
  "webApp": {
    "webAppPort": 3030,
    "endPointUrl": "http://localhost:5001/"
  }
}
```

## 環境変数による上書き

以下の環境変数で設定を上書きできます：

| 環境変数 | 設定項目 | 説明 |
|---------|---------|------|
| `DB_HOST` | `server.host` | データベースホスト |
| `DB_PORT` | `server.port` | データベースポート |
| `DB_NAME` | `server.database` | データベース名 |
| `DB_USER` | `server.user` | データベースユーザー |
| `DB_PASSWORD` | `server.password` | データベースパスワード |
| `PORT` | `server.serverPort` | APIサーバーポート |
| `REACT_APP_API_URL` | `webApp.endPointUrl` | APIエンドポイントURL |

## Docker環境

Docker環境では、`docker-compose.yml`で環境変数を設定することで設定を上書きできます：

```yaml
services:
  backend:
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: jesgo_db
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD:-12345678}
      PORT: 5000
```

## セキュリティのベストプラクティス

### 開発環境
- ✅ `config.json`を使用（`config.template.json`からコピー）
- ✅ 開発用のパスワードでOK
- ❌ `config.json`をGitにコミットしない

### 本番環境
- ✅ `config.json`に実際の認証情報を設定
- ✅ または環境変数で認証情報を注入
- ❌ `config.json`をGitにコミットしない
- ✅ `.gitignore`で`config.json`が除外されていることを確認済み

### テンプレートファイル
- ✅ `config.template.json`をGitにコミット
- ✅ 新しい設定項目を追加した場合は更新
- ⚠️ 本番用のパスワードは含めず、プレースホルダー値を使用

## ファイル管理

```bash
# 状態確認
git status packages/settings/

# 期待される結果：
# - config.template.json: 追跡されている
# - config.json: 追跡されていない（.gitignoreで除外）
# - README.md: 追跡されている
# - .gitignore: 追跡されている
```

## トラブルシューティング

### config.jsonがGitに追加されてしまう

`.gitignore`が正しく機能しているか確認：

```bash
cd packages/settings
git check-ignore -v config.json

# 出力例：
# .gitignore:2:config.json    config.json
```

### 設定ファイルが見つからない

```bash
# ファイルの存在確認
ls -la packages/settings/config.json

# ない場合はテンプレートからコピー
cp packages/settings/config.template.json packages/settings/config.json
```

### 設定が反映されない

**確認事項:**
1. JSON形式が正しいか（`,`や`}`の位置）
2. ファイルの文字エンコーディングがUTF-8か
3. 環境変数が正しく設定されているか

**デバッグ:**
```bash
# 設定ファイルの検証
cat packages/settings/config.json | jq .

# 環境変数の確認
env | grep -E "DB_|PORT|REACT_APP"
```

## 関連ドキュメント

- [packages/common/README.md](../common/README.md) - 共通パッケージ
