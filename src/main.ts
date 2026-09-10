import "./style.css";
import { initializePreferences } from "./preferences";
import { navigateMatch, render, search, setPaste } from "./reader";

const content = document.querySelector<HTMLDivElement>("#content")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const copyButton = document.querySelector<HTMLButtonElement>("#copyBtn")!;
const shareButton = document.querySelector<HTMLButtonElement>("#shareBtn")!;
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadBtn")!;
const rawAnchor = document.querySelector<HTMLAnchorElement>("#rawAnchor")!;
const language = document.querySelector<HTMLSelectElement>("#language")!;
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
const state = { paste: "", id: "", loaded: false };

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

function displayPaste(paste: string, url: URL) {
  state.paste = paste;
  state.loaded = true;
  document.title = `${state.id} · Paste`;
  rawAnchor.href = url.toString();
  rawAnchor.hidden = false;
  for (const button of [copyButton, shareButton, downloadButton, searchButton, language]) {
    button.disabled = false;
  }
  loading.hidden = true;
  content.hidden = false;
  content.setAttribute("aria-busy", "false");
  status.textContent = "";
}

async function loadPaste() {
  loading.hidden = false;
  errorPanel.hidden = true;
  content.hidden = true;
  try {
    const [, encodedId = "", encodedLanguage = ""] = window.location.pathname.split("/");
    state.id = decodeURIComponent(encodedId);
    const requestedLanguage = decodeURIComponent(encodedLanguage);
    const url = getPasteUrl(state.id);
    const signal = AbortSignal.timeout(30_000);
    const response = await fetch(url, { signal });
    if (response.status === 404) {
      throw new Error("This paste could not be found. It may have been deleted.");
    }
    if (!response.ok) {
      throw new Error(`Could not load this paste (HTTP ${response.status}). Please try again.`);
    }
    const paste = await response.text();
    displayPaste(paste, url);
    await setPaste(paste, requestedLanguage);
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
