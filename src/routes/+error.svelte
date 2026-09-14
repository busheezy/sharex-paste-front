<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>Unable to load paste · Paste</title>
</svelte:head>

<main class="editor error-page">
  <section class="error-panel">
    <h1>Unable to load paste</h1>
    <p>{page.error?.message ?? "The requested page could not be loaded."}</p>
    <a class="button" href={page.url.pathname}>Try again</a>
    <a class="text-link" href="/">Back to home</a>
  </section>
</main>
