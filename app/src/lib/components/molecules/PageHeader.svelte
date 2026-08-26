<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		action
	}: { title: string; subtitle?: string; action?: Snippet } = $props();
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-2xl md:text-3xl">{title}</h1>
		{#if subtitle}<p class="max-w-xl text-sm text-muted-foreground">{subtitle}</p>{/if}
	</div>
	{#if action}<div class="flex shrink-0 items-center gap-2">{@render action()}</div>{/if}
</div>
