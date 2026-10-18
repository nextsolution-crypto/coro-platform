FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLIENT_PORTAL_URL=http://localhost:3003
ENV NEXT_PUBLIC_CLIENT_PORTAL_URL=$NEXT_PUBLIC_CLIENT_PORTAL_URL

# Présentation Liquid Glass V2 : valeur exacte fixée par le workflow de release pour activer les écrans migrés, vide par défaut = Classique partout.
# Ce n'est PAS un mécanisme d'authentification ni d'autorisation : aucun droit n'en dépend.
ARG NEXT_PUBLIC_GLASS_BETA=""
ENV NEXT_PUBLIC_GLASS_BETA=$NEXT_PUBLIC_GLASS_BETA

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3003

ENV PORT=3003

CMD ["node", "server.js"]
