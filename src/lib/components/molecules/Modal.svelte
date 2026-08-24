<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import IconButton from '$lib/components/atoms/IconButton.svelte';

	let {
		title,
		onclose,
		children,
		footer
	}: { title: string; onclose: () => void; children: Snippet; footer?: Snippet } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
	<button aria-label="Fermer" class="absolute inset-0 h-full w-full cursor-default" onclick={onclose}></button>

	<div
		class="relative flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
	>
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-lg">{title}</h2>
			<IconButton label="Fermer" onclick={onclose}>
				<X />
			</IconButton>
		</div>

		{@render children()}

		{#if footer}<div class="flex justify-end gap-2 border-t border-border pt-4">{@render footer()}</div>{/if}
	</div>
</div>
