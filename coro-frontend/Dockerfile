# ── Build stage ──────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Variables nécessaires au build Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Présentation Liquid Glass V2 : active les écrans migrés (valeur exacte fixée par le workflow de release, vide par défaut = Classique partout).
# Ce n'est PAS un mécanisme d'authentification ni d'autorisation : aucun droit n'en dépend (voir docs/design/liquid-glass/v2/).
ARG NEXT_PUBLIC_GLASS_BETA=""
ENV NEXT_PUBLIC_GLASS_BETA=$NEXT_PUBLIC_GLASS_BETA

RUN npm run build

# ── Production stage ─────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]