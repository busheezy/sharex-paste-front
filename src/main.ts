import "./style.css";
import { renderDiff } from "./diff";
import { initializePreferences } from "./preferences";
import { navigateMatch, render, search, setPaste } from "./reader";

const content = document.querySelector<HTMLDivElement>("#content")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const copyButton = document.querySelector<HTMLButtonElement>("#copyBtn")!;
const shareButton = document.querySelector<HTMLButtonElement>("#shareBtn")!;
const compareButton = document.querySelector<HTMLButtonElement>("#compareBtn")!;
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadBtn")!;
const rawAnchor = document.querySelector<HTMLAnchorElement>("#rawAnchor")!;
const language = document.querySelector<HTMLSelectElement>("#language")!;
const languageControl = document.querySelector<HTMLElement>("#languageControl")!;
const searchButton = document.querySelector<HTMLButtonElement>("#searchBtn")!;
const searchBar = document.querySelector<HTMLFormElement>("#searchBar")!;
const searchInput = document.querySelector<HTMLInputElement>("#searchInput")!;
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreenBtn")!;
const editor = document.querySelector<HTMLElement>("#editor")!;
const dialog = document.querySelector<HTMLDialogElement>("#shortcutsDialog")!;
const loading = document.querySelector<HTMLElement>("#loading")!;
const errorPanel = document.querySelector<HTMLElement>("#errorPanel")!;
const home = document.querySelector<HTMLElement>("#home")!;
const viewer = document.querySelector<HTMLElement>("#viewer")!;
const compareDialog = document.querySelector<HTMLDialogElement>("#compareDialog")!;
const compareForm = document.querySelector<HTMLFormElement>("#compareForm")!;
const compareInput = document.querySelector<HTMLInputElement>("#compareInput")!;
const compareError = document.querySelector<HTMLParagraphElement>("#compareError")!;
const diffViewControl = document.querySelector<HTMLElement>("#diffViewControl")!;
const diffNames = document.querySelector<HTMLElement>("#diffNames")!;
const inlineDiffButton = document.querySelector<HTMLButtonElement>("#inlineDiffBtn")!;
const splitDiffButton = document.querySelector<HTMLButtonElement>("#splitDiffBtn")!;
const state = { paste: "", comparison: "", id: "", comparisonId: "", loaded: false };

function displayRoute() {
  const isHome = window.location.pathname === "/";
  home.hidden = !isHome;
  viewer.hidden = isHome;

  return isHome;
}

function getPasteUrl(id: string): URL {
  const configuredUrl = import.meta.env.VITE_APP_API_URL || "/api";
  const apiUrl = new URL(configuredUrl, window.location.origin);
  const basePath = apiUrl.pathname.replace(/\/$/, "");
  const encodedId = encodeURIComponent(id);
  apiUrl.pathname = `${basePath}/p/${encodedId}`;
  return apiUrl;
}

function getRoute() {
  const segments = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "diff" && segments.length >= 3) {
    return { kind: "diff" as const, id: segments[1]!, comparisonId: segments[2]! };
  }
  return { kind: "paste" as const, id: segments[0] ?? "", language: segments[1] ?? "" };
}

function getDiffView() {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "split" ? "split" : "inline";
}

async function fetchPaste(id: string) {
  const url = getPasteUrl(id);
  const signal = AbortSignal.timeout(30_000);
  const response = await fetch(url, { signal });
  if (response.status === 404) {
    throw new Error(`Paste “${id}” could not be found. It may have been deleted.`);
  }
  if (!response.ok) {
    throw new Error(`Could not load paste “${id}” (HTTP ${response.status}). Please try again.`);
  }
  const paste = await response.text();
  return { paste, url };
}

export async function copyText(paste: string) {
  try {
    await navigator.clipboard.writeText(paste);
    status.textContent = "Copied to clipboard.";
  } catch {
    status.textContent = "Could not copy. Select the text and copy it manually.";
  }
}

function download() {
  const blob = new Blob([state.paste], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${state.id}.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openSearch() {
  searchBar.hidden = false;
  searchInput.focus();
  searchInput.select();
}

function closeSearch() {
  searchBar.hidden = true;
  searchInput.value = "";
  search("");
  searchButton.focus();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await editor.requestFullscreen();
  } catch {
    status.textContent = "Fullscreen is unavailable in this browser.";
  }
}

function handleShortcut(event: KeyboardEvent) {
  const target = event.target;
  const editing =
    target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable]");
  if (editing || dialog.open) {
    return;
  }
  const key = event.key.toLowerCase();
  const selection = window.getSelection()?.toString();
  if (event.ctrlKey || event.metaKey || event.altKey || selection) {
    return;
  }
  const actions: Record<string, () => void> = {
    c: () => {
      void copyText(state.paste);
    },
    w: () => {
      document.querySelector<HTMLButtonElement>("#wrapBtn")!.click();
    },
    f: () => {
      void toggleFullscreen();
    },
    "?": () => {
      dialog.showModal();
    },
  };
  const action = actions[key];
  if (action) {
    event.preventDefault();
    action();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!state.loaded) {
    return;
  }
  const find = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
  if (find && !dialog.open) {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.key === "Escape" && !searchBar.hidden) {
    event.preventDefault();
    closeSearch();
    return;
  }
  handleShortcut(event);
}

function initializeControls() {
  copyButton.onclick = () => copyText(state.paste);
  shareButton.onclick = () => copyText(window.location.href);
  compareButton.onclick = () => {
    compareError.textContent = "";
    compareInput.value = "";
    compareDialog.showModal();
    compareInput.focus();
  };
  compareDialog.querySelector<HTMLButtonElement>(".dialog-close")!.onclick = () =>
    compareDialog.close();
  compareForm.onsubmit = (event) => {
    event.preventDefault();
    openComparison();
  };
  inlineDiffButton.onclick = () => setDiffView("inline");
  splitDiffButton.onclick = () => setDiffView("split");
  downloadButton.onclick = download;
  searchButton.onclick = openSearch;
  document.querySelector<HTMLButtonElement>("#closeSearch")!.onclick = closeSearch;
  searchInput.oninput = () => search(searchInput.value);
  searchInput.onkeydown = (event) => {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      navigateMatch(-1);
    }
  };
  searchBar.onsubmit = (event) => {
    event.preventDefault();
    navigateMatch(1);
  };
  document.querySelector<HTMLButtonElement>("#previousMatch")!.onclick = () => navigateMatch(-1);
  fullscreenButton.hidden = !document.fullscreenEnabled;
  fullscreenButton.onclick = toggleFullscreen;
  document.onfullscreenchange = () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute("aria-pressed", String(active));
  };
  document.querySelector<HTMLButtonElement>("#helpBtn")!.onclick = () => dialog.showModal();
  language.onchange = () => {
    const id = encodeURIComponent(state.id);
    const suffix = language.value === "text" ? "" : `/${language.value}`;
    const path = `/${id}${suffix}${window.location.hash}`;
    history.replaceState(null, "", path);
    void render();
  };
  document.addEventListener("keydown", handleKeydown);
}

function getComparisonId(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[0] === "diff" ? "" : decodeURIComponent(segments[0] ?? "");
  } catch {
    return trimmed.includes("/") ? "" : trimmed;
  }
}

function openComparison() {
  const comparisonId = getComparisonId(compareInput.value);
  if (!comparisonId) {
    compareError.textContent = "Enter a valid paste link or ID.";
    return;
  }
  const leftId = encodeURIComponent(state.comparisonId || state.id);
  const rightId = encodeURIComponent(comparisonId);
  window.location.href = `/diff/${leftId}/${rightId}`;
}

function setDiffView(view: "inline" | "split") {
  inlineDiffButton.setAttribute("aria-pressed", String(view === "inline"));
  splitDiffButton.setAttribute("aria-pressed", String(view === "split"));
  const url = new URL(window.location.href);
  if (view === "split") {
    url.searchParams.set("view", "split");
  } else {
    url.searchParams.delete("view");
  }
  history.replaceState(null, "", url);
  renderDiff(state.paste, state.comparison, view);
}

function displayPaste(paste: string, url: URL) {
  state.paste = paste;
  state.loaded = true;
  document.title = `${state.id} · Paste`;
  rawAnchor.href = url.toString();
  rawAnchor.hidden = false;
  content.className = "";
  diffViewControl.hidden = true;
  diffNames.hidden = true;
  languageControl.hidden = false;
  for (const button of [
    copyButton,
    shareButton,
    compareButton,
    downloadButton,
    searchButton,
    language,
  ]) {
    button.disabled = false;
  }
  loading.hidden = true;
  content.hidden = false;
  content.setAttribute("aria-busy", "false");
  status.textContent = "";
}

function displayDiff(left: string, right: string) {
  state.paste = left;
  state.comparison = right;
  state.loaded = true;
  document.title = `${state.id} ↔ ${state.comparisonId} · Diff`;
  diffViewControl.hidden = false;
  diffNames.textContent = `${state.id} ↔ ${state.comparisonId}`;
  diffNames.hidden = false;
  languageControl.hidden = true;
  shareButton.disabled = false;
  compareButton.disabled = false;
  for (const control of [copyButton, downloadButton, searchButton, language]) {
    control.disabled = true;
  }
  rawAnchor.hidden = true;
  loading.hidden = true;
  content.hidden = false;
  content.setAttribute("aria-busy", "false");
  status.textContent = "";
  setDiffView(getDiffView());
}

async function loadPaste() {
  loading.hidden = false;
  errorPanel.hidden = true;
  content.hidden = true;
  try {
    const route = getRoute();
    state.id = route.id;
    if (route.kind === "diff") {
      state.comparisonId = route.comparisonId;
      const requests = [fetchPaste(route.id), fetchPaste(route.comparisonId)];
      const [left, right] = await Promise.all(requests);
      displayDiff(left.paste, right.paste);
      return;
    }
    state.comparisonId = "";
    const result = await fetchPaste(route.id);
    displayPaste(result.paste, result.url);
    await setPaste(result.paste, route.language);
  } catch (cause) {
    loading.hidden = true;
    errorPanel.hidden = false;
    const message = cause instanceof Error ? cause.message : "Check your connection and try again.";
    document.querySelector<HTMLElement>("#errorMessage")!.textContent = message;
    status.textContent = "";
  }
}

const isHome = displayRoute();
initializePreferences();
initializeControls();
document.querySelector<HTMLButtonElement>("#retryBtn")!.onclick = loadPaste;
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) {
    return;
  }

  const restoredHome = displayRoute();
  if (!restoredHome) {
    void loadPaste();
  }
});
if (!isHome) {
  void loadPaste();
}
