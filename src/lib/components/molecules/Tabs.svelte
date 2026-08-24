<script lang="ts" generics="T extends string">
	type Item<T> = { value: T; label: string; href?: string };

	let {
		items,
		value,
		onchange,
		class: className = ''
	}: { items: Item<T>[]; value: T; onchange?: (value: T) => void; class?: string } = $props();
</script>

<div class="inline-flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-1 {className}">
	{#each items as item (item.value)}
		{@const active = item.value === value}
		{#if item.href}
			<a
				href={item.href}
				class="rounded-md px-3 py-1.5 font-heading text-sm font-semibold no-underline transition-colors {active
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{item.label}
			</a>
		{:else}
			<button
				type="button"
				onclick={() => onchange?.(item.value)}
				class="rounded-md px-3 py-1.5 font-heading text-sm font-semibold transition-colors {active
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{item.label}
			</button>
		{/if}
	{/each}
</div>
