#!/bin/bash
# Development Health Check Script
# Docker開発環境の各サービスの状態を確認

set -e

echo "=== JESGO Development Environment Health Check ==="

# Docker Compose サービス状態確認
echo ""
echo "🔍 Checking Docker services..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🔍 Checking service logs (last 10 lines each)..."

echo ""
echo "📊 PostgreSQL logs:"
docker-compose -f docker-compose.dev.yml logs --tail=10 postgres

echo ""
echo "🔧 Backend logs:"
docker-compose -f docker-compose.dev.yml logs --tail=10 backend

echo ""
echo "🎨 Frontend logs:"
docker-compose -f docker-compose.dev.yml logs --tail=10 frontend

echo ""
echo "🌐 Service endpoints:"
echo "  - Frontend:  http://localhost:3000"
echo "  - Backend:   http://localhost:5001"
echo "  - PostgreSQL: localhost:5432"

echo ""
echo "💡 Useful commands:"
echo "  - View all logs:     npm run docker:logs"
echo "  - Stop services:     npm run docker:down"
echo "  - Restart services:  npm run docker:dev"
