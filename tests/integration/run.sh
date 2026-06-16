#!/bin/bash
# ===================================================================
# PETPAY-APP - Integration Test Runner
# ===================================================================
# Orchestrates the full integration test suite:
#   1. Spins up all services via docker compose
#   2. Waits for health checks to pass
#   3. Runs each service's integration tests
#   4. Reports pass/fail per suite
#   5. Tears down the stack
#   6. Returns non-zero if any suite failed
# ===================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.test.yml"
COMPOSE_PROJECT="petpay-test"

echo "=============================================="
echo "  PETPAY-APP INTEGRATION TEST RUNNER"
echo "=============================================="
echo "Project root: $PROJECT_ROOT"
echo "Compose file: $COMPOSE_FILE"
echo ""

# --------------------------------------------------
# Prerequisites check
# --------------------------------------------------
check_prerequisites() {
  local missing=0

  if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed"
    missing=1
  else
    echo "✓ docker found: $(docker --version)"
  fi

  if ! docker compose version &>/dev/null; then
    echo "ERROR: docker compose plugin is not installed"
    missing=1
  else
    echo "✓ docker compose found: $(docker compose version)"
  fi

  if [ $missing -ne 0 ]; then
    echo ""
    echo "Install missing prerequisites and try again."
    exit 1
  fi

  echo ""
}

# --------------------------------------------------
# Start infrastructure services
# --------------------------------------------------
start_services() {
  echo "Starting test infrastructure..."
  echo ""

  docker compose \
    -f "$COMPOSE_FILE" \
    -p "$COMPOSE_PROJECT" \
    up -d --build --wait 2>&1

  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "ERROR: Failed to start test infrastructure (exit $exit_code)"
    exit $exit_code
  fi

  echo ""
  echo "All services are running."
  echo ""
}

# --------------------------------------------------
# Wait for all health endpoints
# --------------------------------------------------
wait_for_health() {
  local max_retries=60
  local retry_interval=3
  local services=(
    "identity:http://identity:3000/health"
    "marketplace:http://marketplace:8080/health"
    "catalog:http://catalog:8081/health"
    "bookings:http://bookings:8082/health"
    "payments:http://payments:8083/health"
    "krakend:http://krakend:8080/health"
  )

  echo "Waiting for service health checks..."
  echo ""

  for entry in "${services[@]}"; do
    local name="${entry%%:*}"
    local url="${entry#*:}"
    local ok=0

    for ((i = 1; i <= max_retries; i++)); do
      if docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" \
        exec -T test-runner curl -sf "$url" &>/dev/null; then
        echo "  ✓ $name is healthy"
        ok=1
        break
      fi
      sleep "$retry_interval"
    done

    if [ $ok -eq 0 ]; then
      echo "  ✗ $name FAILED health check after $((max_retries * retry_interval))s"
      return 1
    fi
  done

  echo ""
  echo "All services are healthy."
  echo ""
  return 0
}

# --------------------------------------------------
# Run a single test suite inside the test-runner container
# --------------------------------------------------
run_test_suite() {
  local name="$1"
  local command="$2"

  echo "  Running $name..."

  set +e
  docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" \
    exec -T test-runner /bin/bash -c "$command" 2>&1
  local exit_code=$?
  set -e

  if [ $exit_code -eq 0 ]; then
    echo "  ✓ $name PASSED"
  else
    echo "  ✗ $name FAILED (exit code: $exit_code)"
  fi

  echo ""
  return $exit_code
}

# --------------------------------------------------
# Run all test suites
# --------------------------------------------------
run_all_tests() {
  local results=()
  local total=0
  local passed=0
  local failed=0

  echo "=============================================="
  echo "  RUNNING INTEGRATION TESTS"
  echo "=============================================="
  echo ""

  # -------- Identity (TypeScript/Bun) --------
  if run_test_suite "Identity" \
    "cd /app/Identity && bun install --silent 2>/dev/null && bun test --coverage 2>&1"; then
    results+=("PASS")
    ((passed++))
  else
    results+=("FAIL")
    ((failed++))
  fi
  ((total++))

  # -------- Marketplace (Go) --------
  if run_test_suite "Marketplace" \
    "cd /app/marketplace && go test ./tests/integration/... -v -count=1 2>&1"; then
    results+=("PASS")
    ((passed++))
  else
    results+=("FAIL")
    ((failed++))
  fi
  ((total++))

  # -------- Catalog & Offers (Go) --------
  if run_test_suite "Catalog" \
    "cd /app/catalog-&-offers && go test ./tests/integration/... -v -count=1 2>&1"; then
    results+=("PASS")
    ((passed++))
  else
    results+=("FAIL")
    ((failed++))
  fi
  ((total++))

  # -------- Bookings (Go) --------
  if run_test_suite "Bookings" \
    "cd /app/bookings-service && go test ./tests/integration/... -v -count=1 2>&1"; then
    results+=("PASS")
    ((passed++))
  else
    results+=("FAIL")
    ((failed++))
  fi
  ((total++))

  # -------- Payments (Rust) --------
  if run_test_suite "Payments" \
    "cd /app/payments-service && cargo test --test '*integration*' -- --nocapture 2>&1"; then
    results+=("PASS")
    ((passed++))
  else
    results+=("FAIL")
    ((failed++))
  fi
  ((total++))

  # -------- Cross-service tests (TypeScript/Bun) --------
  if [ -d "$PROJECT_ROOT/tests/integration/cross-service" ]; then
    if run_test_suite "Cross-service" \
      "cd /app/tests/integration/cross-service && bun install --silent 2>/dev/null && bun test 2>&1"; then
      results+=("PASS")
      ((passed++))
    else
      results+=("FAIL")
      ((failed++))
    fi
    ((total++))
  else
    echo "  Skipping cross-service (directory not found)"
    echo ""
  fi

  # -------- Summary --------
  echo "=============================================="
  echo "  RESULTS"
  echo "=============================================="
  echo ""

  local i=0
  local suites=("Identity" "Marketplace" "Catalog" "Bookings" "Payments")
  if [ -d "$PROJECT_ROOT/tests/integration/cross-service" ]; then
    suites+=("Cross-service")
  fi

  for suite in "${suites[@]}"; do
    if [ "${results[$i]}" = "PASS" ]; then
      echo "  ✓ $suite"
    else
      echo "  ✗ $suite"
    fi
    ((i++))
  done

  echo ""
  echo "  Total: $total | Passed: $passed | Failed: $failed"
  echo ""

  if [ $failed -gt 0 ]; then
    return 1
  fi
  return 0
}

# --------------------------------------------------
# Tear down
# --------------------------------------------------
teardown() {
  local exit_code=$1

  echo "=============================================="
  echo "  TEARING DOWN"
  echo "=============================================="
  echo ""

  docker compose \
    -f "$COMPOSE_FILE" \
    -p "$COMPOSE_PROJECT" \
    down -v --rmi local 2>&1 || true

  echo ""
  echo "Cleanup complete."
  echo ""

  exit "$exit_code"
}

# --------------------------------------------------
# Main
# --------------------------------------------------
main() {
  # Trap to ensure cleanup
  trap 'teardown 1' EXIT SIGINT SIGTERM

  check_prerequisites
  start_services
  wait_for_health

  set +e
  run_all_tests
  local result=$?
  set -e

  # Disable trap for successful teardown
  trap - EXIT SIGINT SIGTERM
  teardown "$result"
}

main
