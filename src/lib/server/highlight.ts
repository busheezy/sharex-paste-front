import { maxHighlightedCharacters, maxVisibleLines, type HighlightToken } from "$lib/reader";
import { codeToTokens, type BundledLanguage, type ThemedToken } from "shiki";

function getTokenColor(token: ThemedToken, property: "--shiki-dark" | "--shiki-light") {
  const color = token.htmlStyle?.[property];
  return typeof color === "string" ? color : "inherit";
}

function createHighlightToken(token: ThemedToken): HighlightToken {
  const content = token.content;
  const darkColor = getTokenColor(token, "--shiki-dark");
  const lightColor = getTokenColor(token, "--shiki-light");
  const offset = token.offset;

  return {
    content,
    darkColor,
    lightColor,
    offset,
  };
}

export async function highlightPaste(
  paste: string,
  language: string,
): Promise<HighlightToken[][] | null> {
  if (paste.length > maxHighlightedCharacters || language === "text") {
    return null;
  }

  try {
    const selectedLanguage = language as BundledLanguage;
    const result = await codeToTokens(paste, {
      defaultColor: false,
      lang: selectedLanguage,
      themes: {
        dark: "github-dark",
        light: "github-light",
      },
    });
    const visibleLines = result.tokens.slice(0, maxVisibleLines);
    return visibleLines.map((line) => line.map(createHighlightToken));
  } catch {
    return null;
  }
}
