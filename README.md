# ShareX Paste

A lightweight viewer for text shared through [ShareX API](https://github.com/busheezy/sharex-api). Open `/:id` for plain text or `/:id/:language` for syntax highlighting, such as `/abc123/typescript`.

The viewer preserves the Dracula Pro colors, loads language support on demand, and includes keyboard-accessible copy and raw-text actions. Missing pastes, unsupported languages, network failures, and clipboard errors have visible feedback. Paste text is rendered as text; highlighted HTML is produced by Shiki.

## Development

Use Node.js 24.19+ within 24.x and pnpm 12.3.4.

```sh
nvm use
npm install --global pnpm@12.3.4
pnpm install --frozen-lockfile
pnpm dev
```

Vite serves the app on port 4000 and proxies `/api` to `http://localhost:3000`. Builds do not need a running API or a generated OpenAPI client.

```sh
pnpm check
pnpm build
pnpm preview
```

There is no automated frontend test suite. CI checks lint, formatting, types, the production build, and the Docker build, then uploads `dist` as an artifact. Use `pnpm format` and `pnpm lint:fix` locally. VS Code extension recommendations configure Oxc as the formatter.

## Configuration

`VITE_APP_API_URL` is the API base URL, without `/p`. It defaults to `/api`, which works with the Vite development proxy and the installer's Caddy proxy. The value is embedded at build time and must be reachable by the browser. A Docker service hostname such as `http://api:3000` is not a browser URL.

For production, route `/api/*` to the API with `/api` stripped and serve `index.html` as the fallback for paste URLs. Clipboard access requires HTTPS or localhost. If using a separate API origin, configure CORS there.

## Docker

```sh
docker compose up --build front
```

The container builds static files into the mounted `./docker/dist` directory and exits. Serve that directory with Caddy or another web server; this container is not an HTTP server.

`GENERATE_API=true` remains supported for existing installer configurations and now means “rebuild the frontend at startup.” It defaults to true. `TYPES_URL` is no longer needed. API schema generation and the fixed startup delay have been removed.

## Image publishing

CI publishes `ghcr.io/busheezy/sharex-paste-front:latest` and `sha-<commit>` tags after checks pass on `main`. Images support Linux amd64 and arm64. Pull requests build images without publishing them. Publishing uses the repository’s GitHub token; Docker Hub credentials are not required.

Pastes longer than 100,000 characters stay in plain text to keep highlighting from blocking the page. Copy and raw-text actions remain available.
