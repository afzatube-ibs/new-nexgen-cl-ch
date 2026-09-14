#!/usr/bin/env bash
set -Eeuo pipefail

REPO="/home/demolokkisonacom/nexgen"
PHP84="/opt/remi/php84/root/usr/bin/php"
NVM_SH="/home/demolokkisonacom/.nvm/nvm.sh"
DEPLOY_LOCK="/home/demolokkisonacom/.nexgen-deploy.lock"
DEPLOY_LOG="/home/demolokkisonacom/nexgen-deploy.log"
LAST_SUCCESS="/home/demolokkisonacom/.nexgen-last-successful-deploy"

exec 9>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "Another NexGen deployment is already running."
  exit 1
fi

exec > >(tee -a "$DEPLOY_LOG") 2>&1
echo
echo "[$(date --iso-8601=seconds)] Starting NexGen sPanel deployment"

cd "$REPO"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Tracked server files have local modifications; refusing to overwrite them."
  git status --short --untracked-files=no
  exit 1
fi

CURRENT_SHA="$(git rev-parse HEAD)"
git fetch --prune origin main
TARGET_SHA="$(git rev-parse origin/main)"

if ! git merge-base --is-ancestor "$CURRENT_SHA" "$TARGET_SHA"; then
  echo "Server HEAD is not an ancestor of origin/main; refusing a non-fast-forward deployment."
  exit 1
fi

git merge --ff-only "$TARGET_SHA"

# Load the server's pinned Node 22 runtime.
# shellcheck disable=SC1090
source "$NVM_SH"
nvm use 22
node --version
npm --version

npm ci
npm run build -w apps/store-api-gateway
npm run build -w apps/storefront
npm run build -w apps/admin

# Vite output is public; environment source files remain outside dist and private.
find "$REPO/apps/admin/dist" -type d -exec chmod 755 {} +
find "$REPO/apps/admin/dist" -type f -exec chmod 644 {} +

cd "$REPO/apps/backend"
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
"$PHP84" artisan migrate --force
"$PHP84" artisan optimize
"$PHP84" artisan platform:health --liveness

cd "$REPO/apps/store-api-gateway"
pm2 startOrRestart app.yml --only demo-gateway.lokkisona.com --update-env

cd "$REPO/apps/storefront"
pm2 startOrRestart app.yml --only demo.lokkisona.com --update-env
pm2 save

check_url() {
  local name="$1"
  local url="$2"
  local attempt

  for attempt in {1..12}; do
    if curl --fail --silent --show-error --max-time 20 "$url" >/dev/null; then
      echo "HEALTH_OK $name $url"
      return 0
    fi
    sleep 5
  done

  echo "HEALTH_FAILED $name $url"
  return 1
}

check_url "backend" "https://demo-api.lokkisona.com/up"
check_url "gateway" "https://demo-gateway.lokkisona.com/health"
check_url "storefront" "https://demo.lokkisona.com/"
check_url "admin" "https://demo-admin.lokkisona.com/"

printf '%s\n' "$TARGET_SHA" > "$LAST_SUCCESS"
echo "[$(date --iso-8601=seconds)] DEPLOYMENT_COMPLETE $TARGET_SHA"
