import { PastesService } from "./api";
import { getHighlighter, Lang } from "shiki";
import "./style.css";

import { setCDN } from "shiki";
setCDN("/shiki/");

window.onload = async () => {
  const fullPath = window.location.pathname;
  const [, id, language] = fullPath.split("/");

  const paste = await PastesService.pastesControllerFindOne(id);

  if (language) {
    setContentCodeBlock(language, paste);
  } else {
    setContentCodeBlockRaw(paste);
  }

  setRawUrl(id);

  const copyBtnEl = document.querySelector<HTMLButtonElement>("#copyBtn")!;
  copyBtnEl.onclick = () => {
    copyText(paste);
  };
};

function setRawUrl(id: string) {
  const apiUrl = import.meta.env.VITE_APP_API_URL;

  const anchorEl = document.querySelector<HTMLAnchorElement>("#rawAnchor")!;
  anchorEl.href = `${apiUrl}/p/${id}`;
}

function setContentCodeBlockRaw(paste: string) {
  const codeEl = document.createElement("code");
  codeEl.innerText = paste;

  const preEl = document.createElement("pre");
  preEl.appendChild(codeEl);

  const contentEl = document.querySelector<HTMLDivElement>("#content")!;

  contentEl.appendChild(preEl);
}

async function setContentCodeBlock(language: string, paste: string) {
  const lang = language as Lang;

  const highlighter = await getHighlighter({
    theme: "nord",
    langs: [lang],
  });

  const html = highlighter.codeToHtml(paste, {
    lang: lang,
  });

  const codeEl = document.createElement("code");
  codeEl.innerHTML = html;

  const preEl = document.createElement("pre");
  preEl.appendChild(codeEl);

  const contentEl = document.querySelector<HTMLDivElement>("#content")!;

  contentEl.appendChild(preEl);
}

export function copyText(paste: string) {
  navigator.clipboard.writeText(paste);
}
