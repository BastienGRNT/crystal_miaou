<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		value = $bindable(),
		class: className = '',
		children,
		...rest
	}: HTMLSelectAttributes & { class?: string; children: Snippet } = $props();
</script>

<div class="relative">
	<select
		bind:value
		class="min-h-10 w-full appearance-none rounded-lg border border-input bg-popover px-3 py-2 pr-9 text-sm text-foreground transition-colors hover:border-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none {className}"
		{...rest}
	>
		{@render children()}
	</select>
	<ChevronDown class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
</div>
