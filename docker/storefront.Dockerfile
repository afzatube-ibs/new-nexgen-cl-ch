# syntax=docker/dockerfile:1

# neXgen Storefront — Next.js production image. Browser-exposed NEXT_PUBLIC_*
# values are build arguments because Next.js intentionally bakes them into
# client bundles. STORE_API_GATEWAY_URL remains runtime-only and is supplied
# by docker-compose.production.yml over the private Docker network.
FROM node:22-alpine AS build
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDIA_ORIGIN
ARG NEXT_PUBLIC_STORE_API_GATEWAY_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_MEDIA_ORIGIN=${NEXT_PUBLIC_MEDIA_ORIGIN}
ENV NEXT_PUBLIC_STORE_API_GATEWAY_URL=${NEXT_PUBLIC_STORE_API_GATEWAY_URL}
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build -w apps/storefront
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "apps/storefront"]
