#!/bin/bash
# JESGO Development Keys Generator
# RSA鍵ペアを生成するスクリプト

set -e

KEYS_DIR="packages/backend/backendapp/config/keys"
PRIVATE_KEY="$KEYS_DIR/private.key"
PUBLIC_KEY="$KEYS_DIR/public.key"

echo "=== JESGO Development Keys Generator ==="

# keysディレクトリを作成
echo "Creating keys directory..."
mkdir -p "$KEYS_DIR"

# 既存の鍵があるかチェック
if [[ -f "$PRIVATE_KEY" ]] || [[ -f "$PUBLIC_KEY" ]]; then
    echo "Warning: Existing keys found!"
    read -p "Do you want to overwrite existing keys? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Key generation cancelled."
        exit 0
    fi
    echo "Removing existing keys..."
    rm -f "$PRIVATE_KEY" "$PUBLIC_KEY"
fi

# RSA鍵ペア生成
echo "Generating RSA key pair (4096 bits)..."
ssh-keygen -q -t rsa -b 4096 -C '""' -N '""' -f "$PRIVATE_KEY"

# 公開鍵をリネーム
echo "Renaming public key..."
mv "${PRIVATE_KEY}.pub" "$PUBLIC_KEY"

# 権限設定
echo "Setting file permissions..."
chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

echo ""
echo "✅ RSA key pair generated successfully!"
echo "   Private key: $PRIVATE_KEY"
echo "   Public key:  $PUBLIC_KEY"
echo ""
echo "⚠️  Important:"
echo "   - These keys are for development only"
echo "   - Never commit private keys to version control"
echo "   - Generate new keys for production deployment"
echo ""
