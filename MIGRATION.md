# Migration: September 7, 2026

This guide covers `cc97d29` (the last commit before September 7 in America/Chicago) through `9325076`, including the final compact viewer redesign.

## Deploy an existing paste viewer

Existing `/:id` and `/:id/:language` links and the API's `GET /p/:id` text response remain compatible. No paste data migration or API key is required. Pastes remain in the API's database.

1. Save your current frontend image/digest, environment, web-server configuration, and static output so you can roll back.
2. Replace Docker Hub references with `ghcr.io/busheezy/sharex-paste-front`. Use a published commit tag/digest or build the selected checkout. Wait for image publishing to succeed before pulling it.
3. Set `VITE_APP_API_URL` to the browser-accessible API base URL without `/p`. The default is now `/api`. An internal Docker hostname such as `http://api:3000` will not work in users' browsers. On the paste origin, proxy `/api/*` to the API and strip the `/api` prefix. Alternatively, use an HTTP/HTTPS API origin with the required CORS configuration.
4. Remove custom OpenAPI generation steps and `TYPES_URL`; builds no longer fetch `/docs-json` or require generated `src/api` code. The old `pnpm openapi` script and fixed startup delay are gone. Keep `GENERATE_API=true` when deploying through the container: it now means rebuild static files at startup using the supplied environment.
5. Rebuild and publish the complete `dist` output. The container remains a build job that exits; it is not an HTTP server. Its output mount remains `/vite-sharex/dist`. Installer stacks use `./docker/vite/dist`; this repository's standalone Compose file uses `./docker/dist`. Preserve the path your web server actually serves.
6. Wait for an exit code of 0 before switching/reloading the web server. Keep the `index.html` fallback for direct visits to paste URLs. Replace the complete asset set together; old cached HTML must not reference assets absent from the new deployment.

For an existing installer stack, run from its deployment directory with the same Compose project options, stopping on any failure:

```sh
docker compose config --quiet
docker compose pull front
docker compose up --no-deps --force-recreate --exit-code-from front front
```

For a source build using this repository's Compose file, use `docker compose up --build --exit-code-from front front` instead. A changed `VITE_APP_API_URL` requires a rebuild; editing the web server's environment after building does not alter the bundle. Setting `GENERATE_API=false` skips the startup build and will not populate an empty bind mount or apply a changed API URL.

## Viewer changes to check

Syntax support is bundled through Shiki 4 rather than the old copied `public/shiki` grammar directory. Remove custom deployment steps that copy those old assets. Existing language links should be checked; unsupported languages fall back to plain text.

The home page now contains only a project link. Paste pages have compact controls for language, theme, search, wrapping, font size, fullscreen, copying, downloading, and raw text. Display preferences are stored locally, with no paste content in browser storage. Clipboard actions require HTTPS or localhost.

Pastes over 100,000 characters render as plain text. The viewer displays at most 10,000 lines, and search marks at most 1,000 matches in displayed lines. Copy, download, and raw actions retain the full original text; this is a display limit, not data loss.

Open an old plain-text URL and a language URL directly, reload each, and verify the network request reaches the intended `/p/:id` endpoint. Check copy, download, raw text, line anchors, a large paste, and a missing ID. If validation fails, restore the saved static output, frontend image/environment, and proxy configuration together. The API database needs no rollback for this viewer update.

## Building from source

Use the repository's `.nvmrc` (Node 24.19.0) and pnpm 12.3.4 instead of the old Node/package-manager setup. From the updated checkout:

```sh
nvm use
npm install --global pnpm@12.3.4
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Keep the committed lockfile. Update custom CI jobs and editor integrations to use `pnpm check`, Oxlint, and Oxfmt instead of the removed ESLint/Prettier setup. Format with `pnpm format`.

The project now uses Vite 8, TypeScript 7, and Shiki 4. `pnpm dev` serves port 4000 and proxies `/api` to localhost:3000. There is no automated frontend test suite; use the production build and browser checks above.
