#!/bin/bash
# create-secrets.sh — Create Kubernetes secrets for petpay-app
#
# Usage:
#   ./create-secrets.sh                          # Create secrets (interactive prompts for passwords)
#   ./create-secrets.sh --auto                   # Create secrets with placeholder values (dev only)
#   ./create-secrets.sh --from-env <env-file>    # Create secrets from a .env file
#
# Security note: Never commit real secrets to version control.

set -euo pipefail

NAMESPACE="${NAMESPACE:-petpay}"
SECRET_NAME="petpay-secrets"

create_from_literals() {
  kubectl create secret generic "${SECRET_NAME}" \
    --namespace "${NAMESPACE}" \
    --dry-run=client -o yaml \
    --from-literal=DB_HOST='postgres.petpay.svc.cluster.local' \
    --from-literal=DB_PORT='5432' \
    --from-literal=DB_NAME='petpay' \
    --from-literal=DB_USER='postgres' \
    --from-literal=DB_PASSWORD="${DB_PASSWORD:-changeme}" \
    --from-literal=DATABASE_URL="postgresql://postgres:${DB_PASSWORD:-changeme}@postgres.petpay.svc.cluster.local:5432/petpay" \
    --from-literal=JWT_SECRET="${JWT_SECRET:-changeme-jwt-secret-min-32-chars}" \
    --from-literal=JWT_SECRET_KEY="${JWT_SECRET:-changeme-jwt-secret-min-32-chars}" \
    --from-literal=JWT_EXPIRES_IN='7d' \
    --from-literal=RABBITMQ_URL='amqp://guest:guest@rabbitmq.petpay-dev.svc.cluster.local:5672' \
    --from-literal=MAIL_HOST='smtp.example.com' \
    --from-literal=MAIL_PORT='587' \
    --from-literal=MAIL_USER='noreply@petpay.com' \
    --from-literal=MAIL_PASSWORD="${MAIL_PASSWORD:-changeme}" \
    --from-literal=EMAIL_USER='noreply@petpay.com' \
    --from-literal=EMAIL_APP_PASSWORD="${EMAIL_APP_PASSWORD:-changeme}" \
    --from-literal=GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-changeme}" \
    --from-literal=GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-changeme}" \
    --from-literal=GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:-changeme}" \
    --from-literal=GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-changeme}" \
    --from-literal=OAUTH_STATE_SECRET="${OAUTH_STATE_SECRET:-changeme-oauth-state-secret-min-32}" \
    | kubectl apply -f -
}

create_from_env_file() {
  local env_file="$1"
  if [[ ! -f "${env_file}" ]]; then
    echo "Error: Environment file '${env_file}' not found." >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  source "${env_file}"
  create_from_literals
}

if [[ $# -eq 0 ]]; then
  echo "=== petpay-app Secret Creator ==="
  echo ""
  read -rsp "DB_PASSWORD: " DB_PASSWORD; echo
  read -rsp "JWT_SECRET (32+ chars): " JWT_SECRET; echo
  read -rsp "MAIL_PASSWORD: " MAIL_PASSWORD; echo
  read -rsp "EMAIL_APP_PASSWORD: " EMAIL_APP_PASSWORD; echo
  read -rsp "OAUTH_STATE_SECRET (32+ chars): " OAUTH_STATE_SECRET; echo
  echo ""
  create_from_literals
  echo "Secret '${SECRET_NAME}' created in namespace '${NAMESPACE}'."
elif [[ "$1" == "--auto" ]]; then
  echo "WARNING: Creating secrets with placeholder values. Only use for local/dev."
  create_from_literals
elif [[ "$1" == "--from-env" && -n "${2:-}" ]]; then
  create_from_env_file "$2"
else
  echo "Usage: $0 [--auto | --from-env <env-file>]"
  exit 1
fi
