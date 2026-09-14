# SvelteKit SSR migration

This release replaces the static Vite frontend with a server-rendered SvelteKit application. Paste data and public viewer URLs do not require migration, but the frontend deployment model changes.

## Deployment changes

1. Save the currently deployed frontend image, static output, reverse-proxy configuration, and environment so you can roll back.
2. Replace the one-shot frontend build job with the persistent `sharex-paste-front` service. The new container listens on port 4000 and serves `/health`.
3. Remove the frontend `dist` bind mount. The server and client assets are contained in the runtime image.
4. Remove `VITE_APP_API_URL` and `GENERATE_API`. Set the private runtime variable `BACKEND_API_URL` to the ShareX API origin without `/p`, such as `http://api:3000` on a shared container network.
5. Set `ORIGIN` to the public HTTPS origin. Keep `HOST=0.0.0.0` and `PORT=4000` unless the surrounding deployment requires different values.
6. Route all paste-site requests to the frontend service. A static `index.html` fallback and a separate public `/api` proxy are no longer required; SvelteKit owns both page routes and `/api/p/:id`.
7. Wait for `/health` to return HTTP 200 before switching traffic.

Existing `/:id`, `/:id/:language`, `/diff/:left/:right`, `?view=preview`, and `#L<number>` links remain valid. The frontend fetches the same `GET /p/:id` API response and does not change the API database.

## Verification

- Open the home page and confirm it renders without contacting the API.
- Open plain-text and language paste URLs directly and through client navigation.
- Confirm page source contains the paste text before client JavaScript runs.
- Open a Markdown preview link and confirm the rendered content is present in page source.
- Check raw text, copy, download, search, line anchors, theme, fullscreen, and comparisons.
- Stop the API temporarily and confirm paste routes render the error page while `/health` remains available.

To roll back, restore the saved static frontend image/output, environment, and reverse-proxy behavior together. No API data rollback is needed.
