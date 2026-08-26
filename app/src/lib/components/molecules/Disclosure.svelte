<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		title,
		subtitle,
		open = false,
		class: className = '',
		children
	}: {
		title: string;
		subtitle?: string;
		open?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<details
	{open}
	class="group rounded-xl border border-border bg-card text-card-foreground shadow-md {className}"
>
	<summary
		class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden"
	>
		<span class="flex flex-col gap-0.5 text-left">
			<span class="font-heading text-[15px] font-semibold text-foreground">{title}</span>
			{#if subtitle}<span class="text-xs text-muted-foreground">{subtitle}</span>{/if}
		</span>
		<ChevronDown
			class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
		/>
	</summary>
	<div class="flex flex-col gap-3 border-t border-border px-5 py-4">
		{@render children()}
	</div>
</details>
