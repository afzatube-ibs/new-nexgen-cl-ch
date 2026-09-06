# syntax=docker/dockerfile:1

# neXgen Admin — compiled Vite SPA served by nginx. The browser-facing
# backend URL is intentionally a build argument because VITE_* variables are
# compiled into the static bundle.
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build -w apps/admin

FROM nginx:1.27-alpine AS runtime
COPY docker/admin-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O - http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
