# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org/

RUN npm config set registry ${NPM_REGISTRY} \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG INTERNAL_API_BASE_URL=http://localhost:8080
ENV INTERNAL_API_BASE_URL=${INTERNAL_API_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . ./

RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV INTERNAL_API_BASE_URL=http://localhost:8080

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]