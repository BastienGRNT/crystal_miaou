<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
	type Size = 'sm' | 'md' | 'lg' | 'icon';

	type Props = {
		variant?: Variant;
		size?: Size;
		block?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		block = false,
		href,
		type = 'button',
		disabled = false,
		class: className = '',
		onclick,
		children
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary:
			'bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95',
		secondary: 'bg-muted text-foreground border border-border hover:bg-border/60',
		outline: 'border border-border text-foreground hover:bg-muted',
		ghost: 'text-foreground hover:bg-muted',
		destructive: 'bg-destructive text-destructive-foreground hover:brightness-110'
	};

	const sizes: Record<Size, string> = {
		sm: 'h-8 gap-1.5 px-3 text-xs',
		md: 'h-10 gap-2 px-4 text-sm',
		lg: 'h-12 gap-2 px-6 text-base',
		icon: 'h-10 w-10 shrink-0'
	};

	const base =
		'inline-flex items-center justify-center rounded-lg font-heading font-semibold leading-tight transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4';
</script>

{#if href}
	<a
		{href}
		{onclick}
		class="{base} {variants[variant]} {sizes[size]} {block ? 'w-full' : ''} {className}"
	>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{disabled}
		{onclick}
		class="{base} {variants[variant]} {sizes[size]} {block ? 'w-full' : ''} {className}"
	>
		{@render children()}
	</button>
{/if}
