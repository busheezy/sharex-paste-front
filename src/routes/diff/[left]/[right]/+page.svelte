<script lang="ts">
  import DiffViewer from "$lib/components/DiffViewer.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<DiffViewer {...data} />
