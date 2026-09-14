import { highlightPaste } from "$lib/server/highlight";
import { languageOptions, resolveLanguage } from "$lib/server/languages";
import { renderMarkdown } from "$lib/server/markdown";
import { fetchPaste } from "$lib/server/pastes";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const paste = await fetchPaste(params.id, fetch);
  const requestedLanguage = params.language ?? "";
  const language = resolveLanguage(requestedLanguage);
  const markdownHtml = language === "markdown" ? renderMarkdown(paste) : null;
  const isPreview = language === "markdown" && url.searchParams.get("view") === "preview";
  const highlightedLines = isPreview ? null : await highlightPaste(paste, language);
  const encodedId = encodeURIComponent(params.id);
  const rawUrl = `/api/p/${encodedId}`;

  return {
    id: params.id,
    highlightedLines,
    language,
    languageOptions,
    markdownHtml,
    paste,
    rawUrl,
  };
};
