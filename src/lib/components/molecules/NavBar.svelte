<script lang="ts">
	import type { Component } from 'svelte';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import LogOut from '@lucide/svelte/icons/log-out';

	export type NavItem = { href: string; label: string; icon: Component };

	let {
		brand,
		brandHref = '/',
		items,
		activePath
	}: { brand: string; brandHref?: string; items: NavItem[]; activePath: string } = $props();

	function isActive(href: string): boolean {
		return href === '/' ? activePath === '/' : activePath.startsWith(href);
	}
</script>

<!-- Desktop : sidebar fixe -->
<aside
	class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card px-3 py-5 md:flex"
>
	<a href={brandHref} class="mb-6 flex items-center gap-2 px-2 font-heading text-lg font-extrabold text-foreground no-underline">
		<span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
			<PawPrint class="size-4.5" />
		</span>
		{brand}
	</a>

	<nav class="flex flex-1 flex-col gap-1">
		{#each items as item (item.href)}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors {active
					? 'bg-primary-muted text-primary'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
			>
				<item.icon class="size-4.5 shrink-0" />
				{item.label}
			</a>
		{/each}
	</nav>

	<a
		href="/logout"
		class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
	>
		<LogOut class="size-4.5 shrink-0" />
		Se déconnecter
	</a>
</aside>

<!-- Mobile : top bar -->
<header class="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
	<a href={brandHref} class="mr-auto flex items-center gap-2 font-heading text-lg font-extrabold text-foreground no-underline">
		<span class="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
			<PawPrint class="size-4" />
		</span>
		{brand}
	</a>
	<a href="/logout" aria-label="Se déconnecter" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
		<LogOut class="size-4.5" />
	</a>
</header>

<!-- Mobile : barre d'onglets basse -->
<nav
	class="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur md:hidden"
	style="padding-bottom: env(safe-area-inset-bottom)"
>
	{#each items as item (item.href)}
		{@const active = isActive(item.href)}
		<a
			href={item.href}
			class="flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] font-medium whitespace-nowrap no-underline transition-colors {active
				? 'text-primary'
				: 'text-muted-foreground'}"
		>
			<item.icon class="size-5" />
			{item.label}
		</a>
	{/each}
</nav>
