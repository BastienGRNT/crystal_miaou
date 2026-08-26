<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		for: htmlFor,
		error,
		hint,
		children
	}: { label: string; for: string; error?: string; hint?: string; children: Snippet } = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={htmlFor} class="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
		{label}
	</label>
	{@render children()}
	{#if hint && !error}<span class="text-xs text-muted-foreground">{hint}</span>{/if}
	{#if error}<span class="text-sm text-destructive">{error}</span>{/if}
</div>
