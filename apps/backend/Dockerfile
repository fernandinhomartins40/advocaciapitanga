FROM node:18-bookworm-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/

RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma
RUN cd packages/database && npm run build
RUN cd apps/backend && npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Instalar dependências do Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    fonts-liberation \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Playwright usa seus próprios browsers bundled
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs expressuser

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/database/dist ./node_modules/database/dist
COPY --from=builder /app/packages/database/package.json ./node_modules/database/
COPY --from=builder /app/packages/database/node_modules/@prisma ./node_modules/database/node_modules/@prisma

# Instalar browsers do Playwright
RUN npx playwright install chromium --with-deps

RUN mkdir -p uploads/documentos uploads/documentos-gerados

USER expressuser

EXPOSE 3001

CMD ["node", "dist/server.js"]
