#!/bin/bash

# PostgreSQL初期化チェックスクリプト
echo "PostgreSQL初期化状況をチェック中..."

# PostgreSQLコンテナが起動しているかチェック
if ! docker ps | grep -q jesgo-postgres-dev; then
    echo "PostgreSQLコンテナが起動していません。"
    echo "npm run docker:dev を実行してください。"
    exit 1
fi

# plugin_group_idカラムの存在確認
RESULT=$(docker exec jesgo-postgres-dev psql -U postgres -d jesgo_db -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'jesgo_plugin' AND column_name = 'plugin_group_id';" 2>/dev/null | tr -d ' \n')

if [ "$RESULT" = "0" ]; then
    echo "❌ PostgreSQL初期化が不完全です。"
    echo "plugin_group_idカラムが存在しません。"
    echo ""
    echo "以下のコマンドで完全な初期化を実行してください："
    echo "npm run docker:dev:clean"
    exit 1
else
    echo "✅ PostgreSQL初期化は正常に完了しています。"
    exit 0
fi
