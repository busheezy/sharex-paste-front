<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { writeReaderPreferences, type ReaderPreferences } from "$lib/preferences";
  import {
    buildSourceLines,
    maxHighlightedCharacters,
    maxSearchMatches,
    maxVisibleLines,
    type HighlightToken,
  } from "$lib/reader";
  import { onMount, tick } from "svelte";

  interface Props {
    highlightedLines: HighlightToken[][] | null;
    id: string;
    language: string;
    languageOptions: Array<{ label: string; value: string }>;
    markdownHtml: string | null;
    paste: string;
    preferences: ReaderPreferences;
    rawUrl: string;
  }

  const {
    highlightedLines,
    id,
    language,
    languageOptions,
    markdownHtml,
    paste,
    preferences,
    rawUrl,
  }: Props = $props();
  let activeMatch = $state(0);
  let compareDialog = $state<HTMLDialogElement>();
  let compareError = $state("");
  let compareInput = $state("");
  let editor = $state<HTMLElement>();
  let fontSize = $derived(preferences.fontSize);
  let fullscreenElement = $state<Element | null>(null);
  let numbered = $derived(preferences.numbered);
  let query = $state("");
  let searchInput = $state<HTMLInputElement>();
  let searchOpen = $state(false);
  let shortcutsDialog = $state<HTMLDialogElement>();
  let status = $state("");
  let theme = $derived(preferences.theme);
  let wrapped = $derived(preferences.wrapped);

  const lineCount = $derived(paste.split(/\r\n|\n|\r/).length);
  const isLargePaste = $derived(paste.length > maxHighlightedCharacters);
  const isTruncated = $derived(lineCount > maxVisibleLines);
  const isMarkdown = $derived(language === "markdown");
  const isPreview = $derived(isMarkdown && page.url.searchParams.get("view") === "preview");
  const sourceResult = $derived(buildSourceLines(paste, query));
  const matchCount = $derived(sourceResult.matchCount);
  const sourceLines = $derived(sourceResult.sourceLines);
  const searchCount = $derived(getSearchCount(query, matchCount, activeMatch));
  const renderStatus = $derived(getRenderStatus(isLargePaste, isTruncated));

  function getSearchCount(searchQuery: string, count: number, active: number) {
    if (!searchQuery) {
      return "";
    }
    if (!count) {
      return "No matches";
    }
    const number = active + 1;
    const total = count === maxSearchMatches ? "1,000+" : String(count);
    return `${number} / ${total}`;
  }

  function getRenderStatus(large: boolean, truncated: boolean) {
    if (large) {
      return "Large paste · plain text view · download for full content";
    }
    if (truncated) {
      return "First 10,000 lines · download for the full paste";
    }
    return "";
  }

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
      numbered,
      theme,
      wrapped,
    };
    writeReaderPreferences(nextPreferences);
  }

  function scrollToHash() {
    const hash = window.location.hash;
    if (!/^#L\d+$/.test(hash)) {
      return;
    }
    const line = document.getElementById(hash.slice(1));
    line?.scrollIntoView({ block: "center" });
  }

  onMount(() => {
    scrollToHash();
  });

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      status = "Copied to clipboard.";
    } catch {
      status = "Could not copy. Select the text and copy it manually.";
    }
  }

  function download() {
    const blob = new Blob([paste], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${id}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openSearch() {
    searchOpen = true;
    void tick().then(() => {
      searchInput?.focus();
      searchInput?.select();
    });
  }

  function closeSearch() {
    searchOpen = false;
    query = "";
    activeMatch = 0;
  }

  async function updateSearch(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    query = input.value;
    activeMatch = 0;
    await tick();
    scrollToActiveMatch();
  }

  function scrollToActiveMatch() {
    const selector = `mark[data-match-index="${activeMatch}"]`;
    const match = editor?.querySelector<HTMLElement>(selector);
    match?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  async function navigateMatch(delta: number) {
    if (!matchCount) {
      return;
    }
    activeMatch = (activeMatch + delta + matchCount) % matchCount;
    await tick();
    scrollToActiveMatch();
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

  function toggleWrap() {
    wrapped = !wrapped;
    document.documentElement.dataset.wrap = String(wrapped);
    persistPreferences();
  }

  function toggleLines() {
    numbered = !numbered;
    document.documentElement.dataset.lines = String(numbered);
    persistPreferences();
  }

  function updateFont(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    fontSize = Number(input.value);
    document.documentElement.style.setProperty("--code-size", `${fontSize}px`);
    persistPreferences();
  }

  async function setView(view: "source" | "preview") {
    const url = new URL(page.url);
    if (view === "preview") {
      url.searchParams.set("view", "preview");
      searchOpen = false;
      query = "";
    } else {
      url.searchParams.delete("view");
    }
    await goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function selectLanguage(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const selectedLanguage = select.value;
    const encodedId = encodeURIComponent(id);
    const suffix = selectedLanguage === "text" ? "" : `/${selectedLanguage}`;
    const url = new URL(page.url);
    url.pathname = `/${encodedId}${suffix}`;
    if (selectedLanguage !== "markdown") {
      url.searchParams.delete("view");
    }
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
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
    const leftId = encodeURIComponent(id);
    const rightId = encodeURIComponent(comparisonId);
    void goto(`/diff/${leftId}/${rightId}`);
  }

  function isEditingShortcutTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.matches("input, textarea, select, [contenteditable]");
  }

  function isDialogOpen() {
    return Boolean(shortcutsDialog?.open || compareDialog?.open);
  }

  function handleSearchShortcut(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const isFindShortcut = (event.ctrlKey || event.metaKey) && key === "f";
    if (isFindShortcut && !isPreview) {
      event.preventDefault();
      openSearch();
      return true;
    }

    if (event.key !== "Escape" || !searchOpen) {
      return false;
    }

    event.preventDefault();
    closeSearch();
    return true;
  }

  function runReaderShortcut(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === "c") {
      void copyText(paste);
      return true;
    }
    if (key === "w" && !isPreview) {
      toggleWrap();
      return true;
    }
    if (key === "f") {
      void toggleFullscreen();
      return true;
    }
    if (key !== "?") {
      return false;
    }

    shortcutsDialog?.showModal();
    return true;
  }

  function handleShortcut(event: KeyboardEvent) {
    const target = event.target;
    const editing = isEditingShortcutTarget(target);
    const dialogOpen = isDialogOpen();
    if (editing || dialogOpen) {
      return;
    }

    const handledSearch = handleSearchShortcut(event);
    if (handledSearch) {
      return;
    }

    const selection = window.getSelection()?.toString();
    if (event.ctrlKey || event.metaKey || event.altKey || selection) {
      return;
    }

    const handledReader = runReaderShortcut(event);
    if (handledReader) {
      event.preventDefault();
    }
  }
</script>

<svelte:window onkeydown={handleShortcut} />
<svelte:document bind:fullscreenElement />

<svelte:head>
  <title>{id} · Paste</title>
</svelte:head>

<main class="reading-layout">
  <section
    bind:this={editor}
    class:wrap={wrapped && !isPreview}
    class:no-lines={!numbered && !isPreview}
    class="editor"
    aria-label="Reading workspace"
  >
    <div class="editor-toolbar">
      <label class="language-control">
        <span class="sr-only">Syntax language</span>
        <select value={language} onchange={selectLanguage}>
          <option value="text">Plain text</option>
          {#each languageOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      {#if isMarkdown}
        <div class="view-control">
          <button aria-pressed={!isPreview} onclick={() => setView("source")}>Source</button>
          <button aria-pressed={isPreview} onclick={() => setView("preview")}>Preview</button>
        </div>
      {/if}
      <div class="editor-controls">
        <button
          class="icon-button source-only-control"
          disabled={isPreview}
          aria-label="Find in paste"
          title="Find in paste (Ctrl/⌘ F)"
          onclick={openSearch}
        >
          <svg><use href="#icon-search" /></svg>
        </button>
        <button
          class="icon-button source-only-control"
          disabled={isPreview}
          aria-label="Wrap long lines"
          aria-pressed={wrapped}
          title="Wrap long lines (W)"
          onclick={toggleWrap}
        >
          <svg><use href="#icon-wrap" /></svg>
        </button>
        <button
          class="icon-button source-only-control"
          disabled={isPreview}
          aria-label="Show line numbers"
          aria-pressed={numbered}
          title="Line numbers"
          onclick={toggleLines}>#</button
        >
        <button
          class="icon-button"
          aria-label="Enter fullscreen"
          aria-pressed={Boolean(editor && fullscreenElement === editor)}
          title="Fullscreen (F)"
          onclick={toggleFullscreen}
        >
          <svg><use href="#icon-expand" /></svg>
        </button>
        <button
          class="icon-button"
          aria-label="Copy text"
          title="Copy text (C)"
          onclick={() => copyText(paste)}
        >
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
        <button
          class="icon-button"
          aria-label="Copy link"
          title="Copy link"
          onclick={() => copyText(window.location.href)}
        >
          <svg><use href="#icon-link" /></svg>
        </button>
        <button class="icon-button" aria-label="Download text" title="Download text" onclick={download}>
          <svg><use href="#icon-download" /></svg>
        </button>
        <a
          class="icon-button"
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View raw"
          title="View raw">{"{ }"}</a
        >
        <label class="font-control" data-font-control title="Text size">
          <span class="sr-only">Text size</span>
          <input
            type="range"
            min="12"
            max="22"
            step="1"
            value={fontSize}
            oninput={updateFont}
          />
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
        <button
          class="icon-button"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onclick={() => shortcutsDialog?.showModal()}>?</button
        >
      </div>
    </div>

    {#if searchOpen && !isPreview}
      <form
        class="search-bar"
        role="search"
        onsubmit={(event) => {
          event.preventDefault();
          void navigateMatch(1);
        }}
      >
        <svg><use href="#icon-search" /></svg>
        <label class="sr-only" for="searchInput">Find text in paste</label>
        <input
          id="searchInput"
          bind:this={searchInput}
          type="search"
          placeholder="Find in paste…"
          autocomplete="off"
          spellcheck="false"
          value={query}
          oninput={updateSearch}
          onkeydown={(event) => {
            if (event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              void navigateMatch(-1);
            }
          }}
        />
        <output aria-live="polite">{searchCount}</output>
        <button
          class="icon-button"
          type="button"
          aria-label="Previous match"
          onclick={() => navigateMatch(-1)}>↑</button
        >
        <button class="icon-button" type="submit" aria-label="Next match">↓</button>
        <button class="icon-button" type="button" aria-label="Close search" onclick={closeSearch}
          >×</button
        >
      </form>
    {/if}

    {#if isPreview && markdownHtml}
      <article class="content markdown-content" aria-label="Rendered Markdown preview">
        {@html markdownHtml}
      </article>
    {:else}
      <div class="content source-content" role="region" aria-label="Paste content">
        {#each sourceLines as line (line.number)}
          <div class="code-line" id={`L${line.number}`}>
            <a
              class="line-number"
              href={`#L${line.number}`}
              tabindex="-1"
              aria-label={`Link to line ${line.number}`}>{line.number}</a
            >
            <span class="line-text">
              {#if query}
                {#each line.segments as segment (segment.key)}
                  {#if segment.matchIndex === null}
                    {segment.text}
                  {:else}
                    <mark
                      class:active={segment.matchIndex === activeMatch}
                      data-match-index={segment.matchIndex}>{segment.text}</mark
                    >
                  {/if}
                {/each}
              {:else if highlightedLines?.[line.number - 1]}
                {#each highlightedLines[line.number - 1] as token (token.offset)}
                  <span
                    class="syntax-token"
                    style:--shiki-dark={token.darkColor}
                    style:--shiki-light={token.lightColor}>{token.content}</span
                  >
                {/each}
              {:else}
                {line.text}
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}

    <p class="render-status" role="status">{isPreview ? "" : renderStatus}</p>
  </section>
</main>

{#if status}
  <p class="status" role="status" aria-live="polite">{status}</p>
{/if}

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
  <form method="dialog">
    <button class="icon-button dialog-close" aria-label="Close keyboard shortcuts">×</button>
  </form>
  <h2 id="shortcutsTitle">Keyboard shortcuts</h2>
  <dl class="shortcuts">
    <div><dt>Find in paste</dt><dd><kbd>Ctrl / ⌘</kbd> <kbd>F</kbd></dd></div>
    <div><dt>Copy text</dt><dd><kbd>C</kbd></dd></div>
    <div><dt>Toggle line wrapping</dt><dd><kbd>W</kbd></dd></div>
    <div><dt>Fullscreen</dt><dd><kbd>F</kbd></dd></div>
    <div><dt>Next / previous match</dt><dd><kbd>Enter</kbd> / <kbd>Shift Enter</kbd></dd></div>
    <div><dt>Close search or dialog</dt><dd><kbd>Esc</kbd></dd></div>
  </dl>
</dialog>
