FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install
COPY . .
RUN npx svelte-kit sync

# Valeurs factices : le build SvelteKit importe les modules db (postgres-js) et auth (Better Auth)
# pour l'analyse SSR, sans jamais se connecter réellement ni servir de requête. Les vraies valeurs
# sont injectées au runtime par docker-compose.
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ARG BETTER_AUTH_SECRET=build-time-placeholder-secret
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
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
