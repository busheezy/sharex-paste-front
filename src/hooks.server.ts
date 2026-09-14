import { parseReaderPreferences, readerPreferencesCookieName } from "$lib/preferences";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get(readerPreferencesCookieName);
  const preferences = parseReaderPreferences(cookie);
  event.locals.readerPreferences = preferences;

  const themeColor = preferences.theme === "light" ? "#ffffff" : "#111217";
  const documentAttributes = `data-theme="${preferences.theme}" data-wrap="${preferences.wrapped}" data-lines="${preferences.numbered}" style="--code-size: ${preferences.fontSize}px"`;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      const themedHtml = html.replace("data-reader-preferences", documentAttributes);
      return themedHtml.replace("reader-theme-color", themeColor);
    },
  });

  return response;
};
