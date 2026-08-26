<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		id,
		class: className = '',
		padding = true,
		header,
		footer,
		children
	}: {
		/** Ancre optionnelle (ex. lien "#score" depuis l'accueil). */
		id?: string;
		class?: string;
		padding?: boolean;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<div
	{id}
	class="flex flex-col gap-3 rounded-xl border border-border bg-card text-card-foreground shadow-md {padding
		? 'p-5'
		: ''} {className}"
>
	{#if header}
		<div class="flex items-start justify-between gap-3">
			{@render header()}
		</div>
	{/if}
	{#if children}{@render children()}{/if}
	{#if footer}
		<div class="flex items-center gap-2 border-t border-border pt-3">
			{@render footer()}
		</div>
	{/if}
</div>
