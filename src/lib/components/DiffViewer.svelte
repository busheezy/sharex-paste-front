<script lang="ts">
  import { goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { createDiffLines, createSplitRows, getMarker, type DiffLine } from "$lib/diff";
  import { writeReaderPreferences, type ReaderPreferences } from "$lib/preferences";
  import { maxVisibleLines } from "$lib/reader";

  interface Props {
    leftId: string;
    leftPaste: string;
    preferences: ReaderPreferences;
    rightId: string;
    rightPaste: string;
  }

  const { leftId, leftPaste, preferences, rightId, rightPaste }: Props = $props();
  let compareDialog = $state<HTMLDialogElement>();
  let compareError = $state("");
  let compareInput = $state("");
  let editor = $state<HTMLElement>();
  let fontSize = $derived(preferences.fontSize);
  let fullscreenElement = $state<Element | null>(null);
  let shortcutsDialog = $state<HTMLDialogElement>();
  let status = $state("");
  let theme = $derived(preferences.theme);

  const allLines = $derived(createDiffLines(leftPaste, rightPaste));
  const lines = $derived(allLines.slice(0, maxVisibleLines));
  const splitRows = $derived(createSplitRows(lines));
  const truncated = $derived(allLines.length > lines.length);
  const view = $derived(page.url.searchParams.get("view") === "split" ? "split" : "inline");

  function setTheme(value: "dark" | "light") {
    theme = value;
    document.documentElement.dataset.theme = value;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content = value === "dark" ? "#111217" : "#ffffff";
    }
  }

  function persistPreferences() {
    const nextPreferences = {
      fontSize,
      numbered: preferences.numbered,
      theme,
      wrapped: preferences.wrapped,
    };
    writeReaderPreferences(nextPreferences);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      status = "Copied to clipboard.";
    } catch {
      status = "Could not copy the link.";
    }
  }

  function setDiffView(nextView: "inline" | "split") {
    const url = new URL(page.url);
    if (nextView === "split") {
      url.searchParams.set("view", "split");
    } else {
      url.searchParams.delete("view");
    }
    replaceState(url, page.state);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await editor?.requestFullscreen();
    } catch {
      status = "Fullscreen is unavailable in this browser.";
    }
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persistPreferences();
  }

  function updateFont(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    fontSize = Number(input.value);
    persistPreferences();
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

  function openComparison(event: SubmitEvent) {
    event.preventDefault();
    const comparisonId = getComparisonId(compareInput);
    if (!comparisonId) {
      compareError = "Enter a valid paste link or ID.";
      return;
    }
    const left = encodeURIComponent(rightId);
    const right = encodeURIComponent(comparisonId);
    void goto(`/diff/${left}/${right}`);
  }

  function getLineNumber(line: DiffLine | null, side: "left" | "right") {
    if (!line) {
      return "";
    }
    const number = side === "left" ? line.leftNumber : line.rightNumber;
    return number === null ? "" : String(number);
  }
</script>

<svelte:document bind:fullscreenElement />

<svelte:head>
  <title>{leftId} ↔ {rightId} · Diff</title>
</svelte:head>

<main class="reading-layout">
  <section bind:this={editor} class="editor" aria-label="Reading workspace" style:--code-size={`${fontSize}px`}>
    <div class="editor-toolbar">
      <div class="editor-controls">
        <span class="diff-names">{leftId} ↔ {rightId}</span>
        <div class="view-control">
          <button aria-pressed={view === "inline"} onclick={() => setDiffView("inline")}>Inline</button>
          <button aria-pressed={view === "split"} onclick={() => setDiffView("split")}>Split</button>
        </div>
        <button class="icon-button" disabled aria-label="Find in paste" title="Find in paste">
          <svg><use href="#icon-search" /></svg>
        </button>
        <button class="icon-button" aria-label="Wrap long lines" title="Wrap long lines">
          <svg><use href="#icon-wrap" /></svg>
        </button>
        <button class="icon-button" aria-label="Show line numbers" aria-pressed="true" title="Line numbers">#</button>
        <button
          class="icon-button"
          aria-label="Enter fullscreen"
          aria-pressed={Boolean(editor && fullscreenElement === editor)}
          title="Fullscreen"
          onclick={toggleFullscreen}
        >
          <svg><use href="#icon-expand" /></svg>
        </button>
        <button class="icon-button" disabled aria-label="Copy text" title="Copy text">
          <svg><use href="#icon-copy" /></svg>
        </button>
        <button
          class="icon-button"
          aria-label="Compare with another paste"
          title="Compare with another paste"
          onclick={() => {
            compareError = "";
            compareInput = "";
            compareDialog?.showModal();
          }}
        >
          <svg><use href="#icon-diff" /></svg>
        </button>
        <button class="icon-button" aria-label="Copy link" title="Copy link" onclick={copyLink}>
          <svg><use href="#icon-link" /></svg>
        </button>
        <button class="icon-button" disabled aria-label="Download text" title="Download text">
          <svg><use href="#icon-download" /></svg>
        </button>
        <label class="font-control" title="Text size">
          <span class="sr-only">Text size</span>
          <input type="range" min="12" max="22" step="1" value={fontSize} oninput={updateFont} />
          <output>{fontSize}px</output>
        </label>
        <button
          class="icon-button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onclick={toggleTheme}
        >
          <svg><use href="#icon-theme" /></svg>
        </button>
        <button class="icon-button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onclick={() => shortcutsDialog?.showModal()}>?</button>
      </div>
    </div>

    <div class={`content diff-content ${view}`} role="region" aria-label="Paste comparison">
      {#if view === "inline"}
        {#each lines as line (line)}
          <div class={`diff-line ${line.kind}`}>
            <span class="diff-number">{line.leftNumber ?? ""}</span>
            <span class="diff-number">{line.rightNumber ?? ""}</span>
            <span class="diff-marker">{getMarker(line.kind)}</span>
            <span class="diff-text">{line.text}</span>
          </div>
        {/each}
      {:else}
        {#each splitRows as row (row)}
          <div class="diff-row">
            <div class={`diff-cell left ${row.left?.kind ?? "empty"}`}>
              <span class="diff-number">{getLineNumber(row.left, "left")}</span>
              {#if row.left}<span class="diff-text">{row.left.text}</span>{/if}
            </div>
            <div class={`diff-cell right ${row.right?.kind ?? "empty"}`}>
              <span class="diff-number">{getLineNumber(row.right, "right")}</span>
              {#if row.right}<span class="diff-text">{row.right.text}</span>{/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <p class="render-status" role="status">{truncated ? "First 10,000 diff lines" : ""}</p>
  </section>
</main>

{#if status}<p class="status" role="status" aria-live="polite">{status}</p>{/if}

<dialog id="compareDialog" bind:this={compareDialog} aria-labelledby="compareTitle">
  <form onsubmit={openComparison}>
    <button class="icon-button dialog-close" type="button" aria-label="Close comparison" onclick={() => compareDialog?.close()}>×</button>
    <h2 id="compareTitle">Compare pastes</h2>
    <p>Paste a link or enter the ID of the paste to compare with this one.</p>
    <label for="compareInput">Paste link or ID</label>
    <input id="compareInput" bind:value={compareInput} autocomplete="off" spellcheck="false" required />
    <p class="field-error" role="alert">{compareError}</p>
    <button class="button" type="submit">Compare</button>
  </form>
</dialog>

<dialog bind:this={shortcutsDialog} aria-labelledby="shortcutsTitle">
  <form method="dialog"><button class="icon-button dialog-close" aria-label="Close keyboard shortcuts">×</button></form>
  <h2 id="shortcutsTitle">Keyboard shortcuts</h2>
  <dl class="shortcuts">
    <div><dt>Fullscreen</dt><dd><kbd>F</kbd></dd></div>
    <div><dt>Close dialog</dt><dd><kbd>Esc</kbd></dd></div>
  </dl>
</dialog>
