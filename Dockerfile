FROM node:24.19.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=sharex-front-pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --prefer-offline --store-dir=/pnpm/store

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=sharex-front-pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline --store-dir=/pnpm/store
COPY . .
RUN pnpm build

FROM node:24.19.0-bookworm-slim AS runtime
ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="4000"
WORKDIR /app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY package.json /app/package.json
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "--input-type=module", "-e", \
    "const response = await fetch(`http://127.0.0.1:${process.env.PORT || 4000}/health`); process.exit(response.ok ? 0 : 1);"]

CMD ["node", "build"]
