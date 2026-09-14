<script lang="ts">
  import "../app.css";
  import type { LayoutProps } from "./$types";

  const { children }: LayoutProps = $props();
</script>

<svelte:head>
  <meta name="description" content="A text and code viewer." />
</svelte:head>

<svg class="symbols" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-copy" viewBox="0 0 24 24">
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V4H4v12h4" />
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 5 5" />
  </symbol>
  <symbol id="icon-link" viewBox="0 0 24 24">
    <path
      d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0m0 2 2-2a4 4 0 0 1 6 5l-5 5a4 4 0 0 1-6 0"
      transform="translate(1 0)"
    />
  </symbol>
  <symbol id="icon-diff" viewBox="0 0 24 24">
    <path d="M8 5H4v4m0-4 5 5m7 9h4v-4m0 4-5-5M15 5h5M4 19h5" />
  </symbol>
  <symbol id="icon-download" viewBox="0 0 24 24">
    <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
  </symbol>
  <symbol id="icon-expand" viewBox="0 0 24 24">
    <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />
  </symbol>
  <symbol id="icon-theme" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4v16" />
  </symbol>
  <symbol id="icon-wrap" viewBox="0 0 24 24">
    <path d="M3 5h18M3 10h14a4 4 0 0 1 0 8h-6m3-3-3 3 3 3M3 16h4" />
  </symbol>
</svg>

{@render children()}
