@echo off
chcp 932 >nul
echo =============================================
echo プリセット管理テーブル作成スクリプト
echo バージョン: 1.5.0
echo 作成日: 2025-10-22
echo =============================================
echo.

echo PostgreSQLに接続してプリセット管理テーブルを作成します...
echo.

REM PostgreSQLの接続情報（環境に応じて調整）
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=jesgo_db
set PGUSER=postgres
set PGCLIENTENCODING=UTF8

REM パスワード設定（セキュリティ上の注意: パスワードを直接書くのは推奨されません）
REM 方法1: 環境変数から取得（推奨）
REM システム環境変数PGPASSWORDが設定されている場合はそれを使用
REM 方法2: 直接設定（非推奨、セキュリティリスクあり）
REM set PGPASSWORD=your_password_here
REM 方法3: .pgpassファイルを使用（最も安全）
REM Windowsの場合: %APPDATA%\postgresql\pgpass.conf
REM 形式: hostname:port:database:username:password

REM 環境変数PGPASSWORDが設定されていない場合のみ、ここで設定
if "%PGPASSWORD%"=="" (
    REM パスワードを直接設定する場合は、以下の行のコメントを外して設定してください
    REM set PGPASSWORD=your_password_here
    echo [警告] PGPASSWORD環境変数が設定されていません。
    echo パスワード入力が必要になる場合があります。
    echo パスワード入力なしで実行するには、以下のいずれかの方法を使用してください:
    echo   1. システム環境変数PGPASSWORDを設定
    echo   2. このバッチファイル内でset PGPASSWORD=your_passwordを設定
    echo   3. .pgpassファイルを作成（%APPDATA%\postgresql\pgpass.conf）
    echo.
)

echo 接続情報:
echo   ホスト: %PGHOST%
echo   ポート: %PGPORT%
echo   データベース: %PGDATABASE%
echo   ユーザー: %PGUSER%
if not "%PGPASSWORD%"=="" (
    echo   パスワード: ********（設定済み）
) else (
    echo   パスワード: （未設定）
)
echo.

REM エラーカウンター
set ERROR_COUNT=0

echo =============================================
echo 1. プリセット関連テーブル作成
echo =============================================
echo.
psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f 01_create_preset_tables.sql
if %ERRORLEVEL% NEQ 0 (
    set /a ERROR_COUNT=ERROR_COUNT+1
    echo [ERROR] 01_create_preset_tables.sql の実行に失敗しました
) else (
    echo [SUCCESS] 01_create_preset_tables.sql の実行が完了しました
)
echo.

echo =============================================
echo 2. 固定項目関連テーブル作成
echo =============================================
echo.
psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f 02_create_fixed_field_tables.sql
if %ERRORLEVEL% NEQ 0 (
    set /a ERROR_COUNT=ERROR_COUNT+1
    echo [ERROR] 02_create_fixed_field_tables.sql の実行に失敗しました
) else (
    echo [SUCCESS] 02_create_fixed_field_tables.sql の実行が完了しました
)
echo.

echo =============================================
echo 3. サンプルデータ挿入
echo =============================================
echo.
psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f 03_insert_sample_data.sql
if %ERRORLEVEL% NEQ 0 (
    set /a ERROR_COUNT=ERROR_COUNT+1
    echo [ERROR] 03_insert_sample_data.sql の実行に失敗しました
) else (
    echo [SUCCESS] 03_insert_sample_data.sql の実行が完了しました
)
echo.

echo =============================================
echo 4. 制約修正
echo =============================================
echo.
psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f 04_fix_constraints.sql
if %ERRORLEVEL% NEQ 0 (
    set /a ERROR_COUNT=ERROR_COUNT+1
    echo [ERROR] 04_fix_constraints.sql の実行に失敗しました
) else (
    echo [SUCCESS] 04_fix_constraints.sql の実行が完了しました
)
echo.

REM 結果表示
if %ERROR_COUNT% EQU 0 (
    echo =============================================
    echo すべてのテーブル作成が完了しました
    echo =============================================
    echo.
    echo 作成されたテーブル:
    echo   - jesgo_preset (プリセットマスタ)
    echo   - jesgo_preset_field (プリセット項目・スキーマ連携版)
    echo   - jesgo_fixed_field (固定項目マスタ)
    echo   - jesgo_preset_fixed_field (プリセット固定項目関連)
    echo.
    echo 作成されたビュー:
    echo   - v_preset_field_with_schema (スキーマ連携ビュー)
    echo   - v_preset_with_fixed_fields (固定項目統合ビュー)
    echo.
    echo 作成されたインデックス:
    echo   - idx_preset_created_by
    echo   - idx_preset_created_at
    echo   - idx_preset_is_active
    echo   - idx_preset_field_preset_id
    echo   - idx_preset_field_display_order
    echo   - idx_preset_field_schema_primary_id
    echo   - idx_preset_field_schema_id
    echo   - idx_preset_field_is_fixed
    echo   - idx_fixed_field_display_order
    echo   - idx_fixed_field_field_type
    echo   - idx_preset_fixed_field_preset_id
    echo   - idx_preset_fixed_field_display_order
    echo.
    echo 作成されたトリガー:
    echo   - update_preset_updated_at
    echo   - update_preset_field_updated_at
    echo   - update_fixed_field_updated_at
    echo   - trigger_update_preset_field_schema_info
    echo.
    echo サンプルデータ:
    echo   - デフォルトプリセット (ID: 1)
    echo   - 固定項目8個
    echo   - 固定項目マスタデータ
    echo   - プリセット固定項目関連データ
) else (
    echo.
    echo =============================================
    echo エラーが発生しました (エラー数: %ERROR_COUNT%)
    echo =============================================
    echo.
    echo 接続情報を確認してください:
    echo   - PostgreSQLサーバーが起動しているか
    echo   - データベースが存在するか
    echo   - ユーザー権限が適切か
    echo   - SQLファイルが存在するか
)

echo.
pause
