FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install
COPY . .
RUN npx svelte-kit sync

# Valeur factice : le build SvelteKit importe le module db (postgres-js) pour l'analyse SSR sans
# jamais se connecter réellement. La vraie valeur est injectée au runtime par docker-compose.
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["node", "build/index.js"]
