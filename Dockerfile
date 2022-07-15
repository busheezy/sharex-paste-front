FROM node:16

RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

RUN mkdir -p /vite-sharex/dist
WORKDIR /vite-sharex

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

VOLUME [ "/vite-sharex/dist" ]

RUN chmod +x docker-entrypoint.sh
CMD ["bash", "docker-entrypoint.sh"]