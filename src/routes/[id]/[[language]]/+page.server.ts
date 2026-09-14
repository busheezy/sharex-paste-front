import { resolveLanguage } from "$lib/languages";
import { renderMarkdown } from "$lib/server/markdown";
import { fetchPaste } from "$lib/server/pastes";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params }) => {
  const paste = await fetchPaste(params.id, fetch);
  const requestedLanguage = params.language ?? "";
  const language = resolveLanguage(requestedLanguage);
  const markdownHtml = language === "markdown" ? renderMarkdown(paste) : null;
  const encodedId = encodeURIComponent(params.id);
  const rawUrl = `/api/p/${encodedId}`;

  return {
    id: params.id,
    language,
    markdownHtml,
    paste,
    rawUrl,
  };
};
