import { bundledLanguagesInfo } from "shiki";

export const languageOptions = bundledLanguagesInfo.map((language) => {
  const label = language.name;
  const value = language.id;
  return { label, value };
});

export function resolveLanguage(requestedLanguage: string) {
  const selected = bundledLanguagesInfo.find((language) => {
    const matchesId = language.id === requestedLanguage;
    const matchesAlias = language.aliases?.includes(requestedLanguage);
    return matchesId || matchesAlias;
  });
  return selected?.id ?? "text";
}
