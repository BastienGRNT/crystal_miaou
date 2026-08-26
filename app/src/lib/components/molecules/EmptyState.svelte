<script lang="ts">
	import type { Snippet, Component } from 'svelte';

	let {
		icon: Icon,
		title,
		description,
		class: className = '',
		action
	}: {
		icon: Component;
		title: string;
		description?: string;
		class?: string;
		action?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center {className}">
	<div class="mb-1 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
		<Icon />
	</div>
	<p class="font-heading text-base font-semibold text-foreground">{title}</p>
	{#if description}<p class="max-w-sm text-sm text-muted-foreground">{description}</p>{/if}
	{#if action}<div class="mt-2">{@render action()}</div>{/if}
</div>
