#!/bin/sh
set -eu

placeholder='BOOTSTRAP_TOKEN_NOT_CONFIGURED'

for name in BACKEND_SERVICE_TOKEN BACKEND_CHECKOUT_SERVICE_TOKEN; do
  value="$(printenv "$name" 2>/dev/null || true)"
  if [ -z "$value" ] || [ "$value" = "$placeholder" ]; then
    echo "ERROR: $name is not provisioned. Complete the service-account bootstrap before starting Gateway." >&2
    exit 78
  fi
done

exec node apps/store-api-gateway/dist/index.js
