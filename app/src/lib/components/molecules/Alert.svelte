<script lang="ts">
	import type { Snippet } from 'svelte';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import CircleCheck from '@lucide/svelte/icons/circle-check';

	type Variant = 'info' | 'warning' | 'danger' | 'success';

	let {
		variant = 'info',
		title,
		class: className = '',
		children
	}: { variant?: Variant; title?: string; class?: string; children: Snippet } = $props();

	const styles: Record<Variant, string> = {
		info: 'border-border bg-muted text-foreground',
		warning: 'border-warning/30 bg-warning-muted text-warning',
		danger: 'border-destructive/30 bg-destructive-muted text-destructive',
		success: 'border-success/30 bg-success-muted text-success'
	};

	const icons = { info: Info, warning: TriangleAlert, danger: TriangleAlert, success: CircleCheck };
	const Icon = $derived(icons[variant]);
</script>

<div class="flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm {styles[variant]} {className}">
	<Icon class="mt-0.5 size-4 shrink-0" />
	<div class="flex flex-col gap-0.5">
		{#if title}<p class="font-heading font-semibold">{title}</p>{/if}
		<div class={variant === 'info' ? 'text-muted-foreground' : ''}>{@render children()}</div>
	</div>
</div>
