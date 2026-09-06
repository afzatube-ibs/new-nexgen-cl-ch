# syntax=docker/dockerfile:1

# neXgen Store API Gateway — immutable production image built from the
# monorepo root so npm workspaces resolve exactly as they do in CI.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build -w apps/store-api-gateway
# Keep runtime dependencies only after TypeScript has been compiled.
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app /app

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/store-api-gateway/dist/index.js"]
