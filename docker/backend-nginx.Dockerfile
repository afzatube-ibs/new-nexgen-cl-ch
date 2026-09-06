# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine

COPY docker/nginx/production.conf /etc/nginx/conf.d/default.conf
COPY apps/backend/public /var/www/html/public

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O - http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
