<script lang="ts">
	import type { Snippet } from 'svelte';
	import PawPrint from '@lucide/svelte/icons/paw-print';

	let {
		title,
		subtitle,
		maxWidth = 'sm',
		onsubmit,
		children,
		footer
	}: {
		title: string;
		subtitle?: string;
		maxWidth?: 'sm' | 'md';
		onsubmit: (event: SubmitEvent) => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const widths = { sm: 'max-w-sm', md: 'max-w-md' };
</script>

<div class="mx-auto flex min-h-screen {widths[maxWidth]} flex-col justify-center px-4 py-10">
	<div class="mb-6 flex flex-col items-center gap-3 text-center">
		<span class="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
			<PawPrint class="size-6" />
		</span>
		<div>
			<h1 class="text-2xl">{title}</h1>
			{#if subtitle}<p class="text-sm text-muted-foreground">{subtitle}</p>{/if}
		</div>
	</div>

	<form class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md" {onsubmit}>
		{@render children()}
	</form>

	{#if footer}<p class="mt-4 text-center text-sm text-muted-foreground">{@render footer()}</p>{/if}
</div>
