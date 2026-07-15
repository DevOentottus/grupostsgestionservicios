# ============================================================
# GrupoSTS — Dockerfile (monoconteiner)
# Build:       docker build -t grupsts .
# Run:         docker run -p 3000:3000 --env-file .env grupsts
# ============================================================

# ─── Stage 1: Frontend (Vite build) ──────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Backend (TypeScript build) ─────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json backend/
COPY shared/ shared/
RUN cd backend && npm ci
COPY backend/tsconfig.json backend/
COPY backend/src/ backend/src/
RUN cd backend && npm run build

# ─── Stage 3: Runtime ────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Backend compilado + dependencias
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Frontend build (estáticos)
COPY --from=frontend-builder /app/dist ./public

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/backend/src/main.js"]
