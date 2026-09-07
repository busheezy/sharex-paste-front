import { render } from "./reader";

const editor = document.querySelector<HTMLElement>("#editor")!;
const wrap = document.querySelector<HTMLButtonElement>("#wrapBtn")!;
const lines = document.querySelector<HTMLButtonElement>("#linesBtn")!;
const theme = document.querySelector<HTMLButtonElement>("#themeBtn")!;
const font = document.querySelector<HTMLInputElement>("#fontSize")!;
const fontValue = document.querySelector<HTMLOutputElement>("#fontValue")!;

function read(key: string) {
  try {
    return localStorage.getItem(`paste:${key}`);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(`paste:${key}`, value);
  } catch {
    return;
  }
}

function setTheme(value: string) {
  document.documentElement.dataset.theme = value;
  const next = value === "dark" ? "light" : "dark";
  theme.setAttribute("aria-label", `Switch to ${next} theme`);
  theme.title = `Switch to ${next} theme`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
  meta.content = value === "dark" ? "#111217" : "#f7f7fa";
}

function setFont(value: number) {
  const size = `${value}px`;
  font.value = String(value);
  fontValue.textContent = size;
  editor.style.setProperty("--code-size", size);
}

export function initializePreferences() {
  const storedTheme = read("theme");
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const validTheme = storedTheme === "light" || storedTheme === "dark";
  const initialTheme = validTheme ? storedTheme : preferred;
  setTheme(initialTheme);
  const wrapped = read("wrap") === "true";
  editor.classList.toggle("wrap", wrapped);
  wrap.setAttribute("aria-pressed", String(wrapped));
  const numbered = read("lines") !== "false";
  editor.classList.toggle("no-lines", !numbered);
  lines.setAttribute("aria-pressed", String(numbered));
  const savedFont = Number(read("font"));
  const validFont = Number.isInteger(savedFont) && savedFont >= 12 && savedFont <= 22;
  const initialFont = validFont ? savedFont : 14;
  setFont(initialFont);
  theme.onclick = () => {
    const value = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(value);
    save("theme", value);
    void render();
  };
  wrap.onclick = () => {
    const enabled = editor.classList.toggle("wrap");
    const value = String(enabled);
    wrap.setAttribute("aria-pressed", value);
    save("wrap", value);
  };
  lines.onclick = () => {
    const hidden = editor.classList.toggle("no-lines");
    const value = String(!hidden);
    lines.setAttribute("aria-pressed", value);
    save("lines", value);
  };
  font.oninput = () => {
    const value = Number(font.value);
    setFont(value);
    save("font", font.value);
  };
}
