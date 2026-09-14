export interface ReaderPreferences {
  fontSize: number;
  numbered: boolean;
  theme: "dark" | "light";
  wrapped: boolean;
}

export const readerPreferencesCookieName = "paste_preferences";

export const defaultReaderPreferences: ReaderPreferences = {
  fontSize: 14,
  numbered: true,
  theme: "dark",
  wrapped: false,
};

function isPreferenceRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFontSize(value: unknown) {
  const validFontSize = Number.isInteger(value) && Number(value) >= 12 && Number(value) <= 22;
  return validFontSize ? Number(value) : defaultReaderPreferences.fontSize;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getTheme(value: unknown) {
  return value === "light" || value === "dark" ? value : defaultReaderPreferences.theme;
}

export function parseReaderPreferences(value: string | undefined): ReaderPreferences {
  if (!value) {
    return { ...defaultReaderPreferences };
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isPreferenceRecord(parsed)) {
      return { ...defaultReaderPreferences };
    }

    const fontSize = getFontSize(parsed.fontSize);
    const numbered = getBoolean(parsed.numbered, defaultReaderPreferences.numbered);
    const theme = getTheme(parsed.theme);
    const wrapped = getBoolean(parsed.wrapped, defaultReaderPreferences.wrapped);

    return {
      fontSize,
      numbered,
      theme,
      wrapped,
    };
  } catch {
    return { ...defaultReaderPreferences };
  }
}

export function writeReaderPreferences(preferences: ReaderPreferences) {
  const value = encodeURIComponent(JSON.stringify(preferences));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${readerPreferencesCookieName}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
