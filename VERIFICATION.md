# JESGO 動作確認手順書

本書は、JESGO が **Node.js 24 系 / PostgreSQL 17 系** の環境で正しく動作することを確認するための手順書である。
システム管理者が初見でも再現できる粒度で記載している。

確認方法は次の **2 通り**である。両方を実施することを推奨する。

| 方法 | アプリ（frontend / backend / common） | PostgreSQL |
|------|--------------------------------------|------------|
| **① Docker** | Docker コンテナ上でビルド・実行 | Docker コンテナ |
| **② Windows ローカル** | **Windows 上でネイティブに**ビルド・実行 | **Docker コンテナから供給** |

## 検証済みバージョン

| 対象 | バージョン | 確認コマンド |
|------|-----------|-------------|
| Node.js | **24.19.0** | `node -v` |
| npm | **11.17.0** | `npm -v` |
| PostgreSQL | **17.11** | `docker exec jesgo-postgres-dev postgres --version` |

> リポジトリが宣言しているのは `.nvmrc` = `24`、`package.json` の `engines` = `node >=24.0.0` / `npm >=11.0.0`、
> `docker-compose.dev.yml` = `postgres:17-alpine` である（いずれもメジャー指定）。
> **実際に使用しているマイナーバージョンは上記の確認コマンドで取得できる。**

---

## ★ 実施前に必ず読むこと（禁止事項）

| # | 禁止事項 |
|---|---------|
| 1 | **開発端末に既存の PostgreSQL が稼働している場合、それに一切触れないこと。** 停止・アンインストール・ポート変更・設定変更・データ変更のいずれも行わない。本手順は **ホストに PostgreSQL を新規導入しない**。DB は必ず Docker コンテナから供給する |
| 2 | 本手順で使用するのは **テスト用データのみ**とする。本番相当の患者データを投入・出力しない |
| 3 | Docker ボリュームを削除する場合は、**必ず `docker volume ls` で実名を確認してから**行う。ボリューム名は作業ディレクトリ名から生成されるため、**別環境のボリュームを誤って削除する危険がある** |

> **ポートの衝突に注意:** 本手順の PostgreSQL コンテナは **ホストの 5432 番**に公開される。
> 開発端末で別の PostgreSQL が 5432 番を使用している場合は衝突する。
> その場合は `docker-compose.dev.yml` の `ports` を変更して重ならないようにすること（**既存インスタンス側は変更しない**）。

---

## 0. 共通の準備

```bash
# 1. リポジトリの取得
git clone <リポジトリURL>
cd jesgo-monorepo

# 2. Node のバージョンを合わせる（nvm-windows を使う場合）
nvm install 24.19.0
nvm use 24.19.0
node -v    # v24.19.0 であること
npm -v     # 11.x であること

# 3. 依存関係のインストール
#    postinstall で patch-package の適用と検証が自動実行される
npm install

# 4. インストール結果の検証（★必須）
npm run verify:install
```

### `npm run verify:install` について（★省略しないこと）

このコマンドは次の 2 点を検証し、問題があれば **異常終了する**。

| 検証項目 | 省略した場合に起きること |
|---------|------------------------|
| **patch-package のパッチ適用** | ZIP 内の日本語ファイル名の解読方式が変わる。**パッチが当たっていないことに誰も気づけない** |
| **`bcrypt` のネイティブバイナリ** | **全ユーザーがログインできなくなる。** npm 11 は install スクリプトを既定で実行しないため、クリーンな環境ではバイナリが生成されないことがある |

成功時の出力例:

```
[verify-install] unzipper+0.10.14.patch: 適用済み (node_modules\unzipper\lib\parse.js)
[verify-install] @types+json-schema+7.0.11.patch: 適用済み (node_modules\@types\json-schema\index.d.ts)
[verify-install] bcrypt: 正常に読み込めました (node_modules\bcrypt)
[verify-install] 検証に成功しました
```

失敗した場合は、表示される対処に従って `npm run apply:patches` または `npm install` を再実行する。

### RSA 鍵の生成

`packages/backend/backendapp/config/keys/` に `private.key` / `public.key` が無い場合のみ実行する。

```bash
npm run generate:keys           # Git Bash / WSL
npm run generate:keys:windows   # Windows コマンドプロンプト
```

---

## 方法①: Docker で確認する

**アプリも DB もすべて Docker コンテナ上で動かす方法である。**

### 前提条件

- Docker Desktop が起動していること（`docker info` が正常に応答すること）
- ホストの **3000 / 8000 / 5432** 番ポートが空いていること

### 手順

```bash
# 1. 起動（初回はイメージのビルドが走るため時間がかかる）
npm run docker:dev

# 以降は別のターミナルで実行する

# 2. コンテナの状態確認（3 つとも Up、postgres は healthy であること）
docker ps

# 3. バージョンの確認
docker exec jesgo-backend-dev node -v                # v24.19.0
docker exec jesgo-backend-dev npm -v                 # 11.x
docker exec jesgo-frontend-dev node -v               # v24.19.0
docker exec jesgo-postgres-dev postgres --version    # 17.11

# 4. データベース初期化の確認（ERROR / FATAL が 0 件であること）
docker logs jesgo-postgres-dev 2>&1 | grep -iE "error|fatal"

# 5. 初期化スクリプトが 30 本実行されたことの確認
docker logs jesgo-postgres-dev 2>&1 | grep -c "running /docker-entrypoint-initdb.d"
```

### 確認ポイント

| # | 確認内容 | 期待結果 |
|---|---------|---------|
| 1 | `http://localhost:3000` を開く | ログイン画面が表示される |
| 2 | システム管理者アカウントでログイン | **患者リスト画面に遷移する**（初期ユーザーは `packages/backend/doc/DB/02_insert.sql` を参照） |
| 3 | 患者リスト画面 | 一覧が表示され、日本語が文字化けしない |
| 4 | スキーマ管理画面 | 文書構造が表示される（スキーマ未登録の場合は先にスキーマを登録する） |
| 5 | プラグイン管理画面 | 登録済みプラグインが一覧表示される |
| 6 | 症例登録画面 | スキーマツリーが表示され、入力・保存ができる |
| 7 | 患者リストの CSV 作成 | UTF-8 BOM 付きの CSV がダウンロードされ、日本語が文字化けしない |
| 8 | ブラウザの開発者コンソール | 致命的な JS エラー（`pageerror`）が出ない |
| 9 | backend のログ | `docker logs jesgo-backend-dev` に想定外の `ERROR` が出ない |

### 後片付け

```bash
# コンテナの停止（データは保持される）
npm run docker:down
```

> **データベースを初期状態に戻したい場合のみ**、ボリュームを削除する。
> **削除すると症例・スキーマ・プラグインの登録はすべて失われる。**
>
> ```bash
> docker volume ls | grep postgres_data      # ★実名を必ず確認する
> docker volume rm <確認した実名>
> ```

---

## 方法②: Windows ローカルで確認する

**アプリのビルド・実行・テストを Windows 上でネイティブに行い、PostgreSQL のみを Docker コンテナから供給する方法である。**
本番環境（Windows）に近い構成で確認できる点が方法①との違いである。

### 前提条件

- Windows 10/11 または Windows Server 2019/2022
- **Node.js 24.19.0**（nvm-windows での導入を推奨）
- Docker Desktop（**PostgreSQL の供給にのみ使用する**）
- ホストの **3000 / 8000** 番ポートが空いていること

> **ホストに PostgreSQL を新規導入しないこと。** 既存の PostgreSQL が別ポートで稼働している場合も、それには一切触れない。

> **★ 方法①（Docker）を実施した直後に方法②を行う場合は、先にアプリのコンテナを停止すること。**
> 方法①の backend / frontend コンテナが **3000 / 8000 番を使用したままだと、方法②のアプリが起動できない。**
> 停止するのは **アプリのコンテナだけ**であり、**PostgreSQL のコンテナは動かしたままにする**（方法②でも DB はコンテナから供給するため）。手順 1 で実施する。

### 手順

```bash
# 1. 方法①（Docker）を実施していた場合は、先にアプリのコンテナを停止する
#    PostgreSQL のコンテナは停止しないこと（方法②でも DB はコンテナから供給する）
docker compose -f docker-compose.dev.yml stop backend frontend

#    3000 / 8000 番が解放されたことを確認する（何も表示されなければ解放済み）
netstat -ano | findstr ":3000 :8000"

# 2. 「0. 共通の準備」を完了しておく
node -v                  # v24.19.0
npm run verify:install   # 成功すること

# 3. PostgreSQL をコンテナから起動する（手順 1 で停止していない場合はすでに起動している）
docker compose -f docker-compose.dev.yml up -d postgres

# 4. 起動確認（healthy になるまで待つ）
docker ps
docker exec jesgo-postgres-dev postgres --version   # 17.11

# 5. 接続先の設定
#    ★ packages/settings/config.json が「無い場合のみ」テンプレートからコピーする。
#       既にある場合はコピーしないこと（既存の設定を上書きしてしまうため）。
#    Git Bash / WSL の場合:
test -f packages/settings/config.json || cp packages/settings/config.template.json packages/settings/config.json

#    コマンドプロンプトの場合:
#    if not exist packages\settings\config.json copy packages\settings\config.template.json packages\settings\config.json

#    作成後、server.host が "localhost"、server.port が 5432 であることを確認する
```

**設定ファイルについて（重要）**

| 項目 | 内容 |
|------|------|
| 使用されるファイル | `packages/settings/config.json`（無い場合は `packages/settings/config.template.json` にフォールバックする） |
| **`server.host`** | **`localhost`**（テンプレートの既定値。通常は変更不要）。`postgres` は Docker ネットワーク内でのみ解決できる名前であり、**Windows ネイティブ実行では接続できない**ため、`postgres` に書き換えないこと |
| `server.port` | `5432`（コンテナが公開しているポート） |
| 環境変数による上書き | `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `PORT` が設定されていれば **設定ファイルより優先される**。方法①では `docker-compose.dev.yml` が `DB_HOST=postgres` を与えるため、**同じ `config.json` のまま方法①・方法②の両方で動作する** |

> `.env` は **Node のプロセスからは自動読み込みされない**（`dotenv` を使用していない）。環境変数で上書きしたい場合はシェルで明示的に設定すること。

```bash
# 6. ビルド
npm run build

# 7. バックエンドの起動（このターミナルは起動したままにする）
cd packages/backend
npm run dev-start          # node ./dist/app.js

# 8. フロントエンドの起動（別のターミナルで実行する）
cd packages/frontend
npm run dev-start          # webpack serve --mode development --port 3000
```

起動に成功すると、バックエンドのターミナルに次のように表示される。

```
✓ 設定ファイルを読み込みました: ../settings/config.json
[INFO] [共通] - listen on port 8000
express: start. port=8000, mode=development, node=C:\Program Files\nodejs\node.exe
JESGO サーバー起動中...
```

### 確認ポイント

方法①の「確認ポイント」表の 1〜8 に加えて、次を確認する。

| # | 確認内容 | 期待結果 |
|---|---------|---------|
| 10 | バックエンドの起動ログ | `node=` に **Windows のパス**（`C:\Program Files\nodejs\node.exe` 等）が表示される ＝ ネイティブ実行である |
| 11 | ログイン | 成功する（＝ Windows ネイティブの `bcrypt` が動作し、コンテナの PostgreSQL に接続できている） |
| 12 | 患者リスト・スキーマ管理・プラグイン管理 | 方法①と同じ内容が表示される |

### 後片付け

```bash
# 1. バックエンド／フロントエンドを停止する（各ターミナルで Ctrl+C）
#    残っている場合は PID を確認して停止する
#    netstat -ano | findstr ":3000 :8000"
#    powershell -Command "Stop-Process -Id <PID> -Force"

# 2. PostgreSQL コンテナの停止
docker compose -f docker-compose.dev.yml stop postgres
```

---

## 方法①と方法②の同等性について

両方法で同じ操作を行い、結果を比較した。**利用者に見える範囲での差異は無い。**

| 対象 | 結果 |
|------|------|
| ログイン、患者リスト、スキーマ管理、プラグイン管理、症例登録 | **同一** |
| 提出データ（`POST /packaged-document/`） | **バイト単位で完全一致** |
| 患者リストの表示項目（患者ID・氏名・年齢・初回治療開始日・診断・進行期・最終更新日） | **同一** |
| ZIP 内の日本語ファイル名の解読 | **同一**（`patch-package` の適用を `npm run verify:install` で担保している） |

### 既知の差異: `eventDate` のタイムゾーン表記

患者リスト API（`/patientlist`）の応答に含まれる **`eventDate`（内部用の日時配列）だけ**、両方法で表記が異なる。

| 方法 | プロセスのタイムゾーン | `eventDate` の例 |
|------|---------------------|-----------------|
| ① Docker | **UTC**（コンテナに `TZ` が設定されていないため） | `2026-03-01T00:00:00.000Z` |
| ② Windows ローカル | **Asia/Tokyo** | `2026-02-28T15:00:00.000Z` |

- **どちらも日本時間では同じ日時（2026-03-01 00:00 JST）を指しており、データの中身は同一である。**
- **画面に表示される項目（初回治療開始日・診断日・最終更新日など）は両方法で完全に一致する。**
- 原因は実行プロセスのタイムゾーンの違いであり、Node.js や PostgreSQL のバージョンとは無関係である。
- **本番環境は Windows（Asia/Tokyo）で動作するため、本番の挙動は方法②と同じである。**
- 開発用の Docker 環境も本番に揃えたい場合は、`docker-compose.dev.yml` の各サービスに `TZ: Asia/Tokyo` を追加すればよい（**本バージョンでは既存の挙動を変えないため設定していない**）。

---

## 既知の制限（本バージョンで対応していない事項）

| # | 事項 | 内容 |
|---|------|------|
| 1 | **PostgreSQL 14 からのデータ移行** | 本バージョンは「PostgreSQL 17 上で JESGO が動作すること」までを対象としており、**既存データの移し替えは含まない**（別 Issue で対応）。**PostgreSQL 17 のコンテナは PostgreSQL 14 のデータディレクトリを起動時に拒否する**ため、既存環境をそのまま起動することはできない |
| 2 | **本番環境向けインストーラ** | 別 Issue で作成予定。本バージョンはリポジトリ上のコード・設定・確認手順までを対象とする |
| 3 | **Windows サービス登録（`winser`）** | `winser` の CLI が Node 24 上で動作することは確認済み（`winser v1.0.3` / 同梱の `nssm.exe` が実処理を行う）。**ただしサービス登録の実行自体（`npm run install-service`）は管理者権限と OS への変更を伴うため、本バージョンでは未実施である** |
| 4 | **`npm run lint`** | 本バージョン以前から設定不備により失敗する（Node のバージョンとは無関係）。本バージョンでは修正していない |
| 5 | **`npm test` の一部** | `DbAccess.test.ts` は接続先を `localhost` で固定しているため、コンテナ内から実行すると失敗する。本バージョン以前からの事象であり、Node / PostgreSQL のバージョンとは無関係 |
| 6 | **プラグインの形式** | **プラグインは ESM 形式（`export async function init` 等）で作成する必要がある。** CommonJS 形式（`module.exports`）のプラグインはブラウザで実行できないため、本バージョンから**アップロード時に拒否される** |

---

## トラブルシューティング

| 症状 | 原因と対処 |
|------|-----------|
| `npm run verify:install` が「パッチが適用されていません」で失敗する | `npm run apply:patches` を実行する。npm workspaces の巻き上げにより、パッケージがルートの `node_modules` に配置された場合に起こる |
| `npm run verify:install` が「bcrypt のネイティブバイナリを読み込めません」で失敗する | `package.json` の `allowScripts` に `bcrypt` が含まれているか確認し、`npm install` を実行し直す。npm 11 は install スクリプトを既定で実行しない |
| 方法②でログインできない／DB に接続できない | `packages/settings/config.json` の `server.host` が `localhost` になっているか確認する。`postgres` のままだと Windows ネイティブでは接続できない |
| 方法②で 3000 / 8000 番が使用中と表示される | 方法①のコンテナが起動したままの可能性がある。`docker compose -f docker-compose.dev.yml stop backend frontend` で停止する |
| ログイン後に「読み込めなかったプラグインがある」旨の警告が出る | CommonJS 形式で作成されたプラグインが登録されている。警告に表示されたプラグインをプラグイン管理画面から削除するか、**ESM 形式で作り直して**登録し直す |
| プラグインのアップロードが「CommonJS形式のプラグインは実行できません」で拒否される | 同上。プラグインを ESM 形式で作成する |
| スキーマ管理画面で「アクセス権限がありません」と表示される | スキーマが 1 件も登録されていない場合にもこのメッセージが表示される。先にスキーマを登録する |
