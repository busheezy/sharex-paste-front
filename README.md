# Paste

A modern, distraction-free viewer for shared text and code. Open `/:id` for plain text or `/:id/:language` for syntax highlighting, such as `/abc123/typescript`. Existing API and shared-link formats remain compatible.

- Light and dark themes, syntax highlighting, and language selection.
- In-paste search with next/previous matches, line numbers, and shareable line anchors.
- Adjustable font size, word wrapping, fullscreen, and print styles.
- Copy text, copy the current link, download the original text, or open the raw response.
- Responsive layout, keyboard shortcuts, accessible controls, and retryable loading errors.

The home screen accepts a paste ID or a link from the same site. This is a viewer; it does not require an API key or create pastes. Display preferences are saved locally; paste contents are not stored in browser storage. Text and syntax tokens are inserted as text nodes, never interpreted as HTML.

Press `Ctrl/Cmd+F` to search, `Enter` / `Shift+Enter` to navigate matches, `Escape` to close search, `C` to copy, `W` to wrap, `F` for fullscreen, and `?` for help. Click a line number, then copy the link to share that line.

Pastes longer than 100,000 characters use plain text. The viewer displays up to 10,000 lines and search marks up to 1,000 matches in those lines. Copy, download, and raw-text actions always preserve the full original paste. Search temporarily uses plain text so matches can span syntax tokens.

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
