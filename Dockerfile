FROM node:24.19.0-bookworm-slim
WORKDIR /vite-sharex
RUN npm install --global pnpm@12.3.4
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=sharex-front-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
VOLUME ["/vite-sharex/dist"]
CMD ["sh", "docker-entrypoint.sh"]
