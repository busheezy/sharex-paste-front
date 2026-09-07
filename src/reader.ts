import { bundledLanguagesInfo, codeToTokens, type BundledLanguage } from "shiki";

const content = document.querySelector<HTMLDivElement>("#content")!;
const language = document.querySelector<HTMLSelectElement>("#language")!;
const renderStatus = document.querySelector<HTMLElement>("#renderStatus")!;
const searchCount = document.querySelector<HTMLOutputElement>("#searchCount")!;
const state = { text: "", revision: 0, query: "", active: 0, matches: 0 };

for (const info of bundledLanguagesInfo) {
  const option = new Option(info.name, info.id);
  language.add(option);
}

function appendMatches(parent: HTMLElement, text: string) {
  const query = state.query;
  if (!query) {
    parent.textContent = text;
    return;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "gi");
  const matches = text.matchAll(pattern);
  let offset = 0;
  for (const match of matches) {
    if (state.matches >= 1000) {
      break;
    }
    state.matches += 1;
    const position = match.index;
    const prefix = text.slice(offset, position);
    parent.append(prefix);
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    parent.append(mark);
    offset = position + match[0].length;
  }
  const remainder = text.slice(offset);
  parent.append(remainder);
}

function makeLine(text: string, index: number) {
  const line = document.createElement("div");
  const number = index + 1;
  line.className = "code-line";
  line.id = `L${number}`;
  const anchor = document.createElement("a");
  anchor.className = "line-number";
  anchor.href = `#L${number}`;
  anchor.tabIndex = -1;
  anchor.textContent = String(number);
  anchor.setAttribute("aria-label", `Link to line ${number}`);
  const value = document.createElement("span");
  value.className = "line-text";
  appendMatches(value, text);
  line.append(anchor, value);
  return line;
}

export function navigateMatch(delta: number) {
  const matches = Array.from(content.querySelectorAll("mark"));
  const count = matches.length;
  if (!count) {
    searchCount.textContent = state.query ? "No matches" : "";
    return;
  }
  const previous = content.querySelector("mark.active");
  previous?.classList.remove("active");
  state.active = (state.active + delta + count) % count;
  const match = matches[state.active]!;
  match.classList.add("active");
  match.scrollIntoView({ block: "nearest", inline: "nearest" });
  const number = state.active + 1;
  const total = count === 1000 ? "1,000+" : String(count);
  searchCount.textContent = `${number} / ${total}`;
}

export async function render() {
  const revision = ++state.revision;
  const lines = state.text.split(/\r\n|\n|\r/);
  const visible = lines.slice(0, 10_000);
  state.matches = 0;
  const elements = visible.map(makeLine);
  content.replaceChildren(...elements);
  const truncated = lines.length > visible.length;
  renderStatus.textContent = truncated
    ? "First 10,000 lines · download for the full paste"
    : "All changes affect your view only";
  if (state.query) {
    navigateMatch(0);
    return;
  }
  searchCount.textContent = "";
  if (state.text.length > 100_000) {
    renderStatus.textContent = "Large paste · plain text view · download for full content";
    return;
  }
  if (language.value === "text") {
    return;
  }
  await highlight(elements, revision);
}

async function highlight(elements: HTMLDivElement[], revision: number) {
  try {
    const selected = bundledLanguagesInfo.find((info) => info.id === language.value);
    const lang = (selected?.id ?? "text") as BundledLanguage | "text";
    const dark = document.documentElement.dataset.theme === "dark";
    const theme = dark ? "github-dark" : "github-light";
    const result = await codeToTokens(state.text, { lang, theme });
    if (revision !== state.revision) {
      return;
    }
    result.tokens.slice(0, 10_000).forEach((tokens, index) => {
      const target = elements[index]?.querySelector(".line-text");
      const spans = tokens.map((token) => {
        const span = document.createElement("span");
        span.textContent = token.content;
        span.style.color = token.color ?? "inherit";
        return span;
      });
      target?.replaceChildren(...spans);
    });
  } catch {
    if (revision === state.revision) {
      renderStatus.textContent = "Highlighting unavailable · showing plain text";
    }
  }
}

export function search(query: string) {
  state.query = query;
  state.active = 0;
  void render();
}

export async function setPaste(text: string, requestedLanguage: string) {
  state.text = text;
  const selected = bundledLanguagesInfo.find(
    (info) => info.id === requestedLanguage || info.aliases?.includes(requestedLanguage),
  );
  language.value = selected?.id ?? "text";
  await render();
  const hash = window.location.hash;
  if (/^#L\d+$/.test(hash)) {
    const line = document.getElementById(hash.slice(1));
    line?.scrollIntoView({ block: "center" });
  }
}
