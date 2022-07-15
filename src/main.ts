import { PastesService } from "./api";
import Prism from "prismjs";
import "prismjs/plugins/line-numbers/prism-line-numbers.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import "./style.css";

Prism.hooks.add("before-sanity-check", function (env) {
  env.element.innerHTML = env.element.innerHTML.replace(/<br>/g, "\n");
  env.code = env.element.textContent!;
});

window.onload = async () => {
  const fullPath = window.location.pathname;
  const [, id, language] = fullPath.split("/");

  const paste = await PastesService.pastesControllerFindOne(id);
  setContentCodeBlock(paste, language);
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

function setContentCodeBlock(paste: string, language = "none") {
  const codeEl = document.createElement("code");
  codeEl.className = `line-numbers language-${language}`;
  codeEl.innerText = paste;

  const preEl = document.createElement("pre");
  preEl.appendChild(codeEl);

  const contentEl = document.querySelector<HTMLDivElement>("#content")!;

  contentEl.appendChild(preEl);
  Prism.highlightElement(codeEl);
}

export function copyText(paste: string) {
  navigator.clipboard.writeText(paste);
}
