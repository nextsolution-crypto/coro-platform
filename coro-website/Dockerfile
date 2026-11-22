FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Sophie : assistant documentaire complet (Bedrock Canada) quand true.
ARG NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=false
ENV NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=$NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001

ENV PORT=3001

CMD ["node", "server.js"]