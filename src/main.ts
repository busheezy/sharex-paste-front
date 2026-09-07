import "./style.css";

const content = document.querySelector<HTMLDivElement>("#content")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const copyButton = document.querySelector<HTMLButtonElement>("#copyBtn")!;
const rawAnchor = document.querySelector<HTMLAnchorElement>("#rawAnchor")!;

function getPasteUrl(id: string): URL {
  const configuredUrl = import.meta.env.VITE_APP_API_URL || "/api";
  const apiUrl = new URL(configuredUrl, window.location.origin);
  const basePath = apiUrl.pathname.replace(/\/$/, "");
  const encodedId = encodeURIComponent(id);
  apiUrl.pathname = `${basePath}/p/${encodedId}`;
  return apiUrl;
}

function showPlainText(paste: string) {
  const code = document.createElement("code");
  code.textContent = paste;
  const pre = document.createElement("pre");
  pre.appendChild(code);
  content.replaceChildren(pre);
}

async function highlightPaste(language: string, paste: string) {
  if (paste.length > 100_000) {
    status.textContent = "Large paste. Showing plain text to keep the page responsive.";
    return;
  }

  try {
    const { bundledLanguages, codeToHtml } = await import("shiki");
    const isSupported = Object.hasOwn(bundledLanguages, language);

    if (!isSupported) {
      status.textContent = "Unknown language. Showing plain text.";
      return;
    }

    const { default: theme } = await import("../public/shiki/themes/dracula-pro.json");
    const html = await codeToHtml(paste, { lang: language, theme });
    content.innerHTML = html;
  } catch {
    status.textContent = "Syntax highlighting is unavailable. Showing plain text.";
  }
}

export async function copyText(paste: string) {
  try {
    await navigator.clipboard.writeText(paste);
    status.textContent = "Copied to clipboard.";
  } catch {
    status.textContent = "Could not copy. Select the text and copy it manually.";
  }
}

async function loadPaste() {
  const fullPath = window.location.pathname;
  const [, id, language] = fullPath.split("/");

  if (!id) {
    status.textContent = "Open a shared paste link to view its contents.";
    return;
  }

  try {
    const pasteId = decodeURIComponent(id);
    const url = getPasteUrl(pasteId);
    const signal = AbortSignal.timeout(30_000);
    const response = await fetch(url, { signal });

    if (response.status === 404) {
      throw new Error("This paste could not be found. It may have been deleted.");
    }

    if (!response.ok) {
      throw new Error(`Could not load this paste (HTTP ${response.status}). Please try again.`);
    }

    const paste = await response.text();
    showPlainText(paste);
    document.title = `${pasteId} · ShareX Paste`;
    status.textContent = "Paste loaded.";
    rawAnchor.href = url.toString();
    rawAnchor.hidden = false;
    copyButton.disabled = false;
    copyButton.onclick = () => copyText(paste);

    if (language) {
      await highlightPaste(language, paste);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this paste.";
    status.textContent = message;
  }
}

void loadPaste();
