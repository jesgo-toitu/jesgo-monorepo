# JESGO - 医療情報システム（モノレポ版）

JESGOは医療情報を管理するWebアプリケーションです。このリポジトリはフロントエンド（React + TypeScript）とバックエンド（Express + TypeScript）、共通パッケージをモノレポ構成で管理しています。

## バージョン

**v1.5.0** - 共通パッケージ化・設定の一元管理対応

### v1.5.0 の主な変更点

- ✅ **共通パッケージ (`@jesgo/common`)** の導入
  - Frontend/Backend共通の型定義とユーティリティを統合
  - コードの重複を排除し、保守性を向上
  
- ✅ **設定ファイルの共通化**
  - `packages/settings`ディレクトリで設定を一元管理
  - 環境変数による柔軟な設定変更に対応
  - 自動フォールバック機能の追加
  
- ✅ **Docker環境の最適化**
  - 共通パッケージの自動ビルド
  - ボリュームマウントによる開発効率の向上

## システム要件

### 開発環境
- Node.js 20.x 以上
- npm 10.x 以上
- Docker & Docker Compose（開発時）
- PostgreSQL 14.x（ローカル開発時）
- Git

### 本番環境（Windows）
- Windows 10/11 または Windows Server 2019/2022
- Node.js 20.x 以上
- PostgreSQL 14.x 以上

## プロジェクト構成

```
jesgo-monorepo/
├── packages/
│   ├── common/               # 共通パッケージ（v1.5.0～）
│   │   ├── src/
│   │   │   ├── types/       # API、設定の型定義
│   │   │   ├── constants/   # JESGO定数
│   │   │   ├── utils/       # ユーティリティ関数
│   │   │   └── validation/  # バリデーション定義
│   │   └── dist/            # ビルド出力
│   │
│   ├── settings/             # 設定ファイル（v1.5.0～）
│   │   ├── config.json      # 実際の設定（Git除外）
│   │   └── README.md
│   │
│   ├── frontend/             # React + TypeScript
│   │   ├── src/
│   │   ├── dist/            # ビルド出力
│   │   └── package.json
│   │
│   └── backend/              # Express + TypeScript
│       ├── backendapp/
│       ├── doc/DB/          # データベーススキーマ
│       └── package.json
│
├── scripts/                  # デプロイスクリプト
├── docker/                   # Docker設定
├── docker-compose.dev.yml    # 開発環境
└── package.json              # モノレポルート設定
```

## クイックスタート

### Docker を使用（推奨）

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd jesgo-monorepo

# 2. 依存関係のインストール
npm install

# 3. RSA鍵ペアの生成
npm run generate:keys        # macOS/Linux
npm run generate:keys:windows # Windows

# 4. Docker環境の起動
npm run docker:dev

# 5. アクセス
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### ローカル開発（Dockerなし）

```bash
# 1. PostgreSQL 14をインストール・起動

# 2. 依存関係のインストール
npm install

# 3. RSA鍵ペアの生成
npm run generate:keys

# 4. 共通パッケージのビルド
cd packages/common
npm run build

# 5. バックエンドとフロントエンドのビルド
cd ../backend && npm run build
cd ../frontend && npm run build

# 6. 開発サーバーの起動
cd ../..
npm run dev  # 両方同時に起動

# 7. アクセス
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

**注意**: npm run devで起動する場合、.envファイルを作成しておくことを推奨します：
```bash
cp env.template .env
# 必要に応じて.envファイルを編集
```

## 設定ファイル

### 設定ファイルの場所

v1.5.0から、設定ファイルは`packages/settings/`ディレクトリで一元管理されます。

**設定ファイルのパス優先順位:**

1. **Backend**:
   - `packages/backend/backendapp/config/config.json`
   - `packages/settings/config.json` ← **推奨**
   - デフォルト設定（ファイルがない場合）

2. **Frontend**:
   - `packages/frontend/dist/config.json`（手動配置）
   - `packages/settings/config.json` ← **推奨**
   - デフォルト設定（ファイルがない場合） ← **開発時はこれで動作**
   
   ⚠️ **注意**: フロントエンドの `config.json` は自動生成されません。
   - 開発時: デフォルト設定で動作（`http://localhost:8000/`）
   - 本番時: 必要に応じて手動で `dist/config.json` を配置

### 設定ファイルの構造

`packages/settings/config.json`:
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
    "serverPort": 8000
  },
  "webApp": {
    "webAppPort": 3000,
    "endPointUrl": "http://localhost:8000/"
  }
}
```

### 環境変数による上書き

以下の環境変数で設定を動的に変更できます：

| 環境変数 | 設定項目 | 説明 |
|---------|---------|------|
| `DB_HOST` | `server.host` | データベースホスト |
| `DB_PORT` | `server.port` | データベースポート |
| `DB_NAME` | `server.database` | データベース名 |
| `DB_USER` | `server.user` | データベースユーザー |
| `DB_PASSWORD` | `server.password` | データベースパスワード |
| `PORT` | `server.serverPort` | APIサーバーポート |
| `REACT_APP_API_URL` | `webApp.endPointUrl` | APIエンドポイントURL |

**Docker環境の例:**
```yaml
environment:
  DB_HOST: postgres
  DB_PASSWORD: secure_password
  PORT: 8000
```

### ポート設定の統一

v1.5.0からDocker開発環境とnpm run dev環境でポート番号を統一しています：

| サービス | ポート番号 | アクセスURL |
|---------|----------|------------|
| **Frontend** | 3000 | http://localhost:3000 |
| **Backend API** | 8000 | http://localhost:8000 |
| **PostgreSQL** | 5432 | localhost:5432 |

**統一の利点：**
- Docker環境とローカル環境を切り替えてもURLが変わらない
- 設定ファイルや環境変数を変更せずに開発環境を切り替え可能
- チーム全体で一貫した開発環境

**⚠️ macOSユーザーへの注意：**
- macOSのAirPlay Receiverが5000番ポートを使用するため、8000番ポートを採用しています
- 5000番ポートを使用したい場合は、システム設定でAirPlay Receiverを無効化してください

**ポート設定方法：**

1. **Docker環境（docker-compose.dev.yml）：**
   ```yaml
   backend:
     environment:
       PORT: 8000
     ports:
       - "8000:8000"
   
   frontend:
     environment:
       PORT: 3000
     ports:
       - "3000:3000"
   ```

2. **npm run dev環境（.env）：**
   ```bash
   # env.templateから.envファイルを作成
   cp env.template .env
   
   # デフォルトで以下の設定が適用されます
   PORT=8000              # Backend
   FRONTEND_PORT=3000     # Frontend
   REACT_APP_API_URL=http://localhost:8000
   ```

3. **カスタムポート番号を使用する場合：**
   ```bash
   # .envファイルで変更
   PORT=8080                    # Backend
   FRONTEND_PORT=8000           # Frontend
   REACT_APP_API_URL=http://localhost:8080
   ```
   
   または個別に起動：
   ```bash
   # Backend
   cd packages/backend
   PORT=8080 npm run dev-start
   
   # Frontend（別のターミナル）
   cd packages/frontend
   PORT=8000 npm run dev-start
   ```

## 開発ワークフロー

### 1. 新機能の開発

```bash
# メインブランチから最新を取得
git checkout main
git pull origin main

# 機能ブランチを作成
git checkout -b feature/your-feature-name

# 開発環境起動
npm run docker:dev

# コード変更...

# リント・フォーマット・テスト実行
npm run lint
npm run fmt
npm run test

# 変更をコミット
git add .
git commit -m "feat: 新機能の説明"

# プッシュ
git push origin feature/your-feature-name
```

### 2. コードレビュー
- Pull Request を作成
- レビュワーを指定
- CI/CD チェックの通過を確認
- レビュー承認後にマージ

### 3. リリース準備

```bash
# リリースブランチ作成
git checkout -b release/v1.x.x

# バージョン更新
npm version patch  # patch, minor, major

# ビルドテスト
npm run build
npm run test

# リリースパッケージ作成
npm run release:build

# タグ作成
git tag v1.x.x
git push origin v1.x.x
```

## Docker環境

### 開発環境の起動

```bash
# 起動
npm run docker:dev
# または
docker-compose -f docker-compose.dev.yml up -d

# ログ確認
npm run docker:logs
# または
docker-compose -f docker-compose.dev.yml logs -f

# 停止
npm run docker:down
# または
docker-compose -f docker-compose.dev.yml down
```

### サービス構成

| サービス | ポート | 説明 |
|---------|--------|------|
| PostgreSQL | 5432 | データベース |
| Backend | 5001 | APIサーバー |
| Frontend | 3000, 3030 | Webアプリケーション |
| Nginx | 80 | リバースプロキシ（オプション） |

### 個別サービスの操作

```bash
# 特定のサービスのみ再起動
docker-compose -f docker-compose.dev.yml restart backend
docker-compose -f docker-compose.dev.yml restart frontend

# 特定のサービスのログ確認
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend

# コンテナ内に入る
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

### イメージの再ビルド

```bash
# 全サービスを再ビルド
docker-compose -f docker-compose.dev.yml build --no-cache

# 特定のサービスのみ再ビルド
docker-compose -f docker-compose.dev.yml build --no-cache backend
docker-compose -f docker-compose.dev.yml build --no-cache frontend
```

### 共通パッケージの変更を反映

共通パッケージを変更した場合：

```bash
# 方法1: コンテナを再起動（自動的に再ビルド）
docker-compose -f docker-compose.dev.yml restart backend frontend

# 方法2: コンテナ内で手動ビルド
docker-compose -f docker-compose.dev.yml exec backend sh -c "cd /app/packages/common && npm run build"
docker-compose -f docker-compose.dev.yml exec frontend sh -c "cd /app/packages/common && npm run build"
```

## 共通パッケージ (`@jesgo/common`)

### 提供される機能

#### API関連
- `ApiReturnObject`: API通信の戻り値型
- `RESULT`: API結果コード定数
- `METHOD_TYPE`: HTTPメソッドタイプ

#### 設定関連
- `ServerConfig`: サーバー設定の型定義
- `WebAppConfig`: Webアプリケーション設定の型定義
- `loadBackendConfig()`: Backend設定の読み込み
- `loadFrontendConfig()`: Frontend設定の読み込み

#### ユーティリティ
- 日付・時刻処理（`formatDate`, `formatTime`, `calcAge`等）
- JSON Pointer操作（`isPointerWithArray`, `getPointerTrimmed`等）
- 文字列処理（`escapeText`, `generateUuid`）
- 配列処理（`getArrayWithSafe`）

#### バリデーション
- `StaffErrorMessage`: エラーメッセージ定義
- `LOGINID_PATTERN`, `PASSWORD_PATTERN`: 検証用正規表現

### 使用例

```typescript
import { 
  ApiReturnObject, 
  RESULT, 
  formatDate,
  Const,
  StaffErrorMessage 
} from '@jesgo/common';

// API結果の作成
const result: ApiReturnObject = {
  statusNum: RESULT.NORMAL_TERMINATION,
  body: { data: 'example' }
};

// 日付のフォーマット
const today = formatDate(new Date(), '-');
console.log(today); // 2025-10-11

// JESGO定数の使用
const tag = Const.JESGO_TAG.CANCER_MAJOR;
```

詳細は [packages/common/README.md](packages/common/README.md) を参照してください。

## ビルドとテスト

### ビルド

```bash
# 全体ビルド
npm run build

# 個別ビルド
cd packages/common && npm run build   # 共通パッケージ
cd packages/backend && npm run build  # バックエンド
cd packages/frontend && npm run build # フロントエンド
```

### リント・フォーマット

```bash
# リント実行
npm run lint

# リント修正
npm run lint:fix

# フォーマット
npm run fmt
```

### テスト

```bash
# 全テスト実行
npm run test

# バックエンドのテストのみ
cd packages/backend
npm run test
```

## 本番デプロイ（Windows環境）

### 1. リリースパッケージの作成

```bash
# ビルドとパッケージング
npm run release:build
```

### 2. Windows環境でのデプロイ

PowerShellを管理者権限で実行：

```powershell
# デプロイスクリプトの実行
.\scripts\deploy-windows.ps1 -Environment production -InstallServices

# カスタムパスでのデプロイ
.\scripts\deploy-windows.ps1 -DeployPath "D:\MyApp\jesgo" -InstallServices
```

### 3. 手動セットアップ（必要に応じて）

```powershell
# データベースのみスキップ
.\scripts\deploy-windows.ps1 -SkipDatabase

# ビルドのみスキップ
.\scripts\deploy-windows.ps1 -SkipBuild

# サービスインストールなし
.\scripts\deploy-windows.ps1
```

## コーディング規約

### TypeScript
- strict モードを使用
- 型定義を明示的に記述
- `any` の使用は最小限に
- 適切なコメントとドキュメント

### コミットメッセージ

Conventional Commits 形式を使用：

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### AI支援開発ルール

- **日本語での回答**: AIアシスタント（Cursor AI等）を使用する際は、常に日本語で回答・説明を行う
- **日本語コメント**: コード内のコメントも可能な限り日本語で記述する
- **日本語ドキュメント**: 技術文書、README、仕様書等は日本語で作成する
- **エラーメッセージ**: ユーザー向けエラーメッセージは日本語で表示する
- **ログメッセージ**: 開発・運用ログも日本語で記録する

## トラブルシューティング

### 共通的な問題

#### 1. Node.js バージョンエラー

```bash
# Node.js 20をインストール
nvm install 20
nvm use 20

# バージョン確認
node --version  # v20.x.x
```

#### 2. 依存関係の問題

```bash
# node_modules 削除・再インストール
rm -rf node_modules packages/*/node_modules
npm ci

# 共通パッケージを再ビルド
cd packages/common
npm install
npm run build
```

#### 3. ビルドエラー

```bash
# 共通パッケージから順にビルド
cd packages/common && npm run build
cd ../backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

#### 4. 設定ファイルが見つからない

```bash
# 設定ファイルの確認
ls -la packages/settings/config.json

# ない場合は作成（デフォルト値で動作します）
```

### Docker環境の問題

#### 1. コンテナが起動しない

```bash
# Docker Desktop が起動しているか確認
docker --version
docker-compose --version

# 完全リセット
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
npm run docker:dev
```

#### 2. ポートが使用中

```bash
# ポート使用状況確認
lsof -i :3000
lsof -i :5001
lsof -i :5432

# プロセス終了
kill -9 <PID>
```

#### 3. PostgreSQL接続エラー

- PostgreSQLサービスが起動しているか確認
- 接続情報（ホスト、ポート、認証情報）を確認
- 設定ファイルまたは環境変数を確認

#### 4. フロントエンドのビルド警告

```bash
# webpack fallback設定が正しいか確認
# packages/frontend/webpack.config.js を確認

# 警告を無視してビルド継続（Node.jsモジュールのfallbackは正常）
```

### ログの確認

#### Docker環境
```bash
# 全サービスのログ
docker-compose -f docker-compose.dev.yml logs -f

# 特定のサービスのみ
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f postgres
```

#### ローカル環境
- フロントエンド: コンソール出力
- バックエンド: `packages/backend/log/` ディレクトリ
- 本番環境（Windows）: `C:\jesgo\logs\`

## デバッグ

### フロントエンド
- ブラウザ開発者ツール（F12）
- React Developer Tools
- Redux DevTools（使用している場合）

### バックエンド
- Node.js デバッガー
- ログファイル確認
- PostgreSQL クライアントでDB確認

```bash
# PostgreSQLに接続
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d jesgo_db

# テーブル確認
\dt

# データ確認
SELECT * FROM jesgo_user LIMIT 10;
```

## IDE 設定

### VS Code 推奨拡張機能
- TypeScript and JavaScript Language Features
- ESLint
- Prettier - Code formatter
- Docker
- PostgreSQL
- GitLens

### 設定例 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## セキュリティ

### 開発環境
- デフォルトのパスワード使用可（`packages/settings/config.json`）
- ローカルホストでのアクセスのみ

### 本番環境
- **重要**: デフォルトのパスワードやソルトは必ず変更すること
- 強力なパスワードとランダムなソルトを使用
- HTTPS/TLSの使用を推奨
- ファイアウォールの適切な設定
- 定期的なセキュリティアップデート

### 設定ファイルの管理

- ✅ `config.template.json`: Gitにコミット（デフォルト値のみ）
- ❌ `config.json`: Gitにコミットしない（実際の認証情報を含む）
- ✅ `.gitignore`で`config.json`が除外されていることを確認済み

## パフォーマンス最適化

### フロントエンド
- React.memo、useMemo、useCallback の活用
- Code Splitting
- 画像の最適化
- Bundle サイズの監視

### バックエンド
- データベースクエリの最適化
- インデックスの適切な設定
- コネクションプールの調整
- キャッシングの活用

## 利用可能なnpmスクリプト

### モノレポルートレベル

```bash
npm run dev              # 開発サーバー起動（frontend + backend）
npm run build            # 全パッケージビルド
npm run lint             # リント実行
npm run lint:fix         # リント自動修正
npm run fmt              # フォーマット実行
npm run test             # テスト実行
npm run docker:dev       # Docker開発環境起動
npm run docker:down      # Docker環境停止
npm run docker:logs      # Dockerログ確認
npm run generate:keys    # RSA鍵生成（macOS/Linux）
npm run generate:keys:windows # RSA鍵生成（Windows）
npm run release:build    # リリースパッケージ作成
```

### パッケージ個別

```bash
# 共通パッケージ
cd packages/common
npm run build            # ビルド
npm run watch            # ウォッチモード

# バックエンド
cd packages/backend
npm run build            # TypeScriptビルド
npm run dev-start        # 開発サーバー起動
npm run prod-start       # 本番サーバー起動
npm run test             # テスト実行
npm run lint             # リント実行

# フロントエンド
cd packages/frontend
npm run build            # webpack本番ビルド
npm run dev-start        # webpack開発サーバー起動
npm run lint             # リント実行
```

## プロジェクト管理

### ブランチ戦略

- `main`: 本番環境と同期
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- `bugfix/*`: バグ修正ブランチ
- `release/*`: リリース準備ブランチ
- `hotfix/*`: 緊急修正ブランチ

### タグ管理

```bash
# タグ作成
git tag v1.5.0
git push origin v1.5.0

# タグ一覧
git tag -l

# タグ削除
git tag -d v1.5.0
git push origin :refs/tags/v1.5.0
```

## コントリビューション

1. Issueの作成または既存Issueの確認
2. フィーチャーブランチの作成
3. コード変更とテスト
4. Pull Requestの作成
5. コードレビューと承認
6. マージ

### Pull Requestガイドライン

- 明確なタイトルと説明
- 関連するIssue番号の記載
- リント・テストが通過していること
- スクリーンショット（UI変更の場合）

## 参考資料

### プロジェクト内ドキュメント

- [packages/common/README.md](packages/common/README.md) - 共通パッケージの詳細
- [packages/backend/README.md](packages/backend/README.md) - バックエンド仕様
- [packages/frontend/README.md](packages/frontend/README.md) - フロントエンド仕様
- [packages/settings/README.md](packages/settings/README.md) - 設定ファイルガイド

### 技術スタック

- [Node.js ドキュメント](https://nodejs.org/docs/)
- [React ドキュメント](https://react.dev/)
- [TypeScript ドキュメント](https://www.typescriptlang.org/docs/)
- [Express.js ドキュメント](https://expressjs.com/)
- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/)
- [Docker ドキュメント](https://docs.docker.com/)

## ライセンス

ISC License

## サポート

技術的な問題やバグ報告は、GitHubのIssueまたは開発チームにお問い合わせください。

---

**JESGO Project** - 医療情報システム v1.5.0
