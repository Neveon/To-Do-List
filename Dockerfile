# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- Build: install all dependencies, then build the server bundle and the client app ----
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Copy the manifests first so the dependency layer is cached until they change.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime: only the server's production dependencies and the build output ----
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_FILE=/app/data/todos.json
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace=server && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

# Todos are stored on a volume so they survive container restarts and upgrades.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Run node directly (not via npm) so it receives SIGTERM and shuts down gracefully.
CMD ["node", "--enable-source-maps", "server/dist/index.mjs"]
