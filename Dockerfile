FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install
COPY . .
RUN npx svelte-kit sync
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
