# Paste

A server-rendered SvelteKit viewer for shared text and code. Open `/:id` for plain text or `/:id/:language` for syntax highlighting, such as `/abc123/typescript`. Existing paste, language, comparison, preview, and line-anchor URLs remain compatible.

- Server-rendered paste source, errors, comparisons, and sanitized Markdown previews.
- Light and dark themes, syntax highlighting, and language selection.
- Sanitized Markdown previews with shareable `?view=preview` links.
- In-paste search with next/previous matches, line numbers, and shareable line anchors.
- Inline and side-by-side comparisons with shareable `/diff/:left/:right` links.
- Adjustable font size, word wrapping, fullscreen, and print styles.
- Copy text, copy the current link, download the original text, or open the raw response.
- Responsive layout, keyboard shortcuts, accessible controls, and retryable loading errors.

The home screen contains only a link to this GitHub project. This viewer does not require an API key or create pastes. Display preferences are saved locally; paste contents are not stored in browser storage. Markdown is rendered on the server and sanitized before being included in the page.

Press `Ctrl/Cmd+F` to search, `Enter` / `Shift+Enter` to navigate matches, `Escape` to close search, `C` to copy, `W` to wrap, `F` for fullscreen, and `?` for help. Click a line number, then copy the link to share that line.

Pastes longer than 100,000 characters use plain text. The viewer displays up to 10,000 lines and search marks up to 1,000 matches in those lines. Copy, download, and raw-text actions preserve the complete original paste.

## Migrating an existing installation

See the [SvelteKit SSR migration guide](MIGRATION.md) before replacing a static frontend deployment. The container and reverse-proxy contracts have changed.

## Development

Use Node.js 24.19+ within 24.x and pnpm 12.3.4.

```sh
nvm use
npm install --global pnpm@12.3.4
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

The SvelteKit development server listens on port 4000. `BACKEND_API_URL` must point to the ShareX API origin without `/p`; the example uses `http://localhost:3000`.

```sh
pnpm check
pnpm build
pnpm preview
```

There is no automated frontend test suite. CI checks Svelte, TypeScript, linting, formatting, the production SSR build, and the Docker build. Use `pnpm format` and `pnpm lint:fix` locally.

## Configuration

`BACKEND_API_URL` is a required private runtime variable. Browser code never receives it. SvelteKit server loads fetch paste data from `${BACKEND_API_URL}/p/:id`, and the same-origin `/api/p/:id` endpoint provides the raw-text action.

Adapter-node also supports `HOST`, `PORT`, and `ORIGIN`. The container defaults to `HOST=0.0.0.0` and `PORT=4000`; set `ORIGIN` to the public HTTPS origin behind a reverse proxy.

## Docker

```sh
BACKEND_API_URL=http://host.docker.internal:3000 docker compose up --build front
```

The container runs a persistent SvelteKit Node server on port 4000 and exposes `/health`. It no longer writes a static `dist` directory or exits after building. Route the public paste origin to this service and allow it to reach the ShareX API through `BACKEND_API_URL`.

## Image publishing

CI publishes `ghcr.io/busheezy/sharex-paste-front:latest` and `sha-<commit>` tags after checks pass on `main`. Images support Linux amd64 and arm64. Pull requests build images without publishing them.
