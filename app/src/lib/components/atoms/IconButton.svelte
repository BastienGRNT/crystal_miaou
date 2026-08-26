<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'ghost' | 'danger';

	let {
		label,
		variant = 'ghost',
		class: className = '',
		onclick,
		children
	}: {
		label: string;
		variant?: Variant;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const variants: Record<Variant, string> = {
		ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
		danger: 'text-muted-foreground hover:bg-destructive-muted hover:text-destructive'
	};
</script>

<button
	type="button"
	aria-label={label}
	title={label}
	{onclick}
	class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-4.5 {variants[variant]} {className}"
>
	{@render children()}
</button>
