#!/bin/bash
# Run cross-service integration tests
# Usage: ./tests/integration/run-cross-service.sh [options]
#
# Options:
#   --identity-url URL     Identity service URL (default: http://localhost:3000)
#   --marketplace-url URL  Marketplace service URL (default: http://localhost:8080)
#   --catalog-url URL      Catalog service URL (default: http://localhost:8081)
#   --bookings-url URL     Bookings service URL (default: http://localhost:8082)
#   --payments-url URL     Payments service URL (default: http://localhost:8083)
#   --rmq-api-url URL      RabbitMQ Management API URL (default: http://localhost:15672)
#   --watch                Run in watch mode
#   --coverage             Run with coverage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --identity-url)   IDENTITY_URL="$2";   shift 2 ;;
    --marketplace-url) MARKETPLACE_URL="$2"; shift 2 ;;
    --catalog-url)    CATALOG_URL="$2";    shift 2 ;;
    --bookings-url)   BOOKINGS_URL="$2";   shift 2 ;;
    --payments-url)   PAYMENTS_URL="$2";   shift 2 ;;
    --rmq-api-url)    RABBITMQ_API_URL="$2"; shift 2 ;;
    --watch)          WATCH="--watch";     shift ;;
    --coverage)       COVERAGE="--coverage"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

export IDENTITY_URL="${IDENTITY_URL:-http://localhost:3000}"
export MARKETPLACE_URL="${MARKETPLACE_URL:-http://localhost:8080}"
export CATALOG_URL="${CATALOG_URL:-http://localhost:8081}"
export BOOKINGS_URL="${BOOKINGS_URL:-http://localhost:8082}"
export PAYMENTS_URL="${PAYMENTS_URL:-http://localhost:8083}"
export RABBITMQ_API_URL="${RABBITMQ_API_URL:-http://localhost:15672}"

echo "🔄 Running cross-service integration tests..."
echo "   Identity:    $IDENTITY_URL"
echo "   Marketplace: $MARKETPLACE_URL"
echo "   Catalog:     $CATALOG_URL"
echo "   Bookings:    $BOOKINGS_URL"
echo "   Payments:    $PAYMENTS_URL"
echo "   RabbitMQ:    $RABBITMQ_API_URL"
echo ""

cd "$SCRIPT_DIR/../.."  # root of repo
bun test tests/integration/cross-service/ $WATCH $COVERAGE
