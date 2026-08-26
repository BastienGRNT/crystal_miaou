<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'success' | 'warning' | 'danger' | 'outline';

	let {
		variant = 'default',
		class: className = '',
		children
	}: { variant?: Variant; class?: string; children: Snippet } = $props();

	const variants: Record<Variant, string> = {
		default: 'bg-primary-muted text-primary',
		success: 'bg-success-muted text-success',
		warning: 'bg-warning-muted text-warning',
		danger: 'bg-destructive-muted text-destructive',
		outline: 'border border-border text-muted-foreground'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide {variants[variant]} {className}"
>
	{@render children()}
</span>
