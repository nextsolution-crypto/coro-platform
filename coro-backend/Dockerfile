# ── Build stage ──────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Detect and generate the Prisma engine against the runtime OpenSSL version.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma@6.19.3 generate
RUN npm run build

# ── Production stage ─────────────────────────────────
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Dépendances système pour Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    openssl \
    ca-certificates \
    fonts-freefont-ttf \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

# Fail the image build if the runtime Prisma engine is missing or cannot load.
RUN node -e "require('./node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node')"

RUN node dist/scripts/knowledge-runtime-smoke.js

EXPOSE 3002

CMD ["node", "dist/src/main.js"]
