import { env } from "$lib/server/env";
import { error } from "@sveltejs/kit";

type Fetch = typeof fetch;

export function getPasteUrl(id: string) {
  const baseUrl = env.BACKEND_API_URL.replace(/\/$/, "");
  const encodedId = encodeURIComponent(id);
  return `${baseUrl}/p/${encodedId}`;
}

export async function fetchPasteResponse(id: string, fetcher: Fetch) {
  const url = getPasteUrl(id);
  const signal = AbortSignal.timeout(30_000);
  try {
    const response = await fetcher(url, { signal });
    return response;
  } catch {
    error(502, `Could not connect to the paste service while loading “${id}”. Please try again.`);
  }
}

export async function fetchPaste(id: string, fetcher: Fetch) {
  const response = await fetchPasteResponse(id, fetcher);
  if (response.status === 404) {
    error(404, `Paste “${id}” could not be found. It may have been deleted.`);
  }
  if (!response.ok) {
    error(502, `Could not load paste “${id}” (HTTP ${response.status}). Please try again.`);
  }
  const paste = await response.text();
  return paste;
}
