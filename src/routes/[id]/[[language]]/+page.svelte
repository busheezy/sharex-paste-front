<script lang="ts">
  import PasteViewer from "$lib/components/PasteViewer.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<PasteViewer {...data} />
